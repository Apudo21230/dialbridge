import Foundation

/// How the app obtains a short-lived Dialbridge **client token**.
/// The app never holds the secret API key — it asks for a token instead.
public protocol TokenProvider {
    func clientToken(userRef: String) async throws -> String
}

/// PRODUCTION — ask YOUR OWN backend for a token. Your server holds the
/// Dialbridge API key and calls `POST /client-tokens`; the app never sees the key.
public struct BackendTokenProvider: TokenProvider {
    let yourBackendTokenURL: String // e.g. https://api.fancall.app/dialbridge/token

    public init(yourBackendTokenURL: String) { self.yourBackendTokenURL = yourBackendTokenURL }

    public func clientToken(userRef: String) async throws -> String {
        var req = URLRequest(url: URL(string: yourBackendTokenURL)!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // (Your backend authenticates the user here — session cookie, your own JWT, etc.)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["userRef": userRef])
        let (data, _) = try await URLSession.shared.data(for: req)
        guard let token = (try JSONSerialization.jsonObject(with: data) as? [String: Any])?["token"] as? String else {
            throw NSError(domain: "Dialbridge", code: 0, userInfo: [NSLocalizedDescriptionKey: "no token from backend"])
        }
        return token
    }
}

/// DEMO ONLY — mints the token directly from the app using the API key.
/// ⚠️ NEVER ship this: it embeds your secret API key in the app binary.
/// Swap in `BackendTokenProvider` before release.
public struct DemoTokenProvider: TokenProvider {
    let baseURL: String
    let apiKey: String

    public init(baseURL: String, apiKey: String) { self.baseURL = baseURL; self.apiKey = apiKey }

    public func clientToken(userRef: String) async throws -> String {
        var req = URLRequest(url: URL(string: baseURL + "/client-tokens")!)
        req.httpMethod = "POST"
        req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["userRef": userRef])
        let (data, _) = try await URLSession.shared.data(for: req)
        guard let token = (try JSONSerialization.jsonObject(with: data) as? [String: Any])?["token"] as? String else {
            throw NSError(domain: "Dialbridge", code: 0, userInfo: [NSLocalizedDescriptionKey: "no token (check API key)"])
        }
        return token
    }
}
