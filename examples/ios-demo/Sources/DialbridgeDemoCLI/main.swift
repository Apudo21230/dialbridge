import Foundation
import DialbridgeSDK

// ───────────────────────────────────────────────────────────────────────────
// Dialbridge iOS SDK — runnable integration demo.
//
// This walks the exact path a client app + its backend take:
//   1) the integrator's BACKEND mints a short-lived client token (API key stays
//      server-side, never in the app),
//   2) the APP uses the SDK with that token to place a masked call,
//   3) the APP polls the call's status.
//
// Run it:
//   DIALBRIDGE_API_KEY=db_live_... swift run
// Optional env: DIALBRIDGE_BASE_URL (default http://localhost:3000),
//               DEMO_CREATOR, DEMO_FAN, DEMO_USER
// ───────────────────────────────────────────────────────────────────────────

func env(_ k: String) -> String? {
    guard let v = ProcessInfo.processInfo.environment[k], !v.isEmpty else { return nil }
    return v
}

struct DemoError: Error { let message: String }

/// Stands in for the integrator's BACKEND: exchanges the secret API key for a
/// short-lived client token. In production this runs on your server, not the app.
func mintClientToken(baseURL: String, apiKey: String, userRef: String) async throws -> String {
    var req = URLRequest(url: URL(string: baseURL + "/client-tokens")!)
    req.httpMethod = "POST"
    req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.httpBody = try JSONSerialization.data(withJSONObject: ["userRef": userRef])
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    guard (200..<300).contains(code) else {
        let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "HTTP \(code)"
        throw DemoError(message: "mint token failed: \(msg)")
    }
    let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    guard let token = obj?["token"] as? String else { throw DemoError(message: "no token in response") }
    return token
}

func run() async throws {
    let baseURL = env("DIALBRIDGE_BASE_URL") ?? "http://localhost:3000"
    guard let apiKey = env("DIALBRIDGE_API_KEY") else {
        throw DemoError(message: "set DIALBRIDGE_API_KEY (your db_live_… key from the admin console)")
    }
    let creator = env("DEMO_CREATOR") ?? "+919800000001"
    let fan = env("DEMO_FAN") ?? "+919800000002"
    let userRef = env("DEMO_USER") ?? "fan_demo_1"

    print("Dialbridge iOS SDK — integration demo")
    print("base: \(baseURL)\n")

    print("① Your backend mints a client token for user \(userRef) (API key stays on the server)…")
    let token = try await mintClientToken(baseURL: baseURL, apiKey: apiKey, userRef: userRef)
    print("   ✓ client token: \(token.prefix(28))…  (short-lived, ~15 min)\n")

    print("② The app creates the masked call with the SDK…")
    let client = DialbridgeClient(baseURL: baseURL, clientToken: token)
    let call = try await client.createCall(creatorNumber: creator, fanNumber: fan)
    print("   ✓ sessionId:   \(call.sessionId)")
    print("   ✓ status:      \(call.status)")
    print("   ✓ masked line: \(call.virtualNumber ?? "—")  ← both parties see only this\n")

    print("③ The app polls for status…")
    let latest = try await client.getCall(sessionId: call.sessionId)
    print("   ✓ status: \(latest.status)\n")

    print("✅ Done. With the real operator driver, the creator's phone now rings as a")
    print("   normal cellular call — no app open, no internet. The fan is bridged in;")
    print("   neither sees the other's real number.")
}

let done = DispatchSemaphore(value: 0)
Task {
    do { try await run() }
    catch let e as DialbridgeError { print("✗ Dialbridge error \(e.status): \(e.message)") }
    catch let e as DemoError { print("✗ \(e.message)") }
    catch { print("✗ \(error)") }
    done.signal()
}
done.wait()
