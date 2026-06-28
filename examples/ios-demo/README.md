# Dialbridge iOS SDK — integration demo

How a client app (e.g. **FanCall**) adds private **masked calling** with the Dialbridge iOS SDK.

A masked call bridges two real phone numbers through a virtual number: the creator's
phone rings as a **normal cellular call** (no app, no internet), and neither party sees
the other's real number. The SDK carries **no audio** — it's a thin REST client; the
operator places the actual call.

---

## How auth works (read this first)

Your **secret API key** (`db_live_…`) lives only on **your backend**. The app uses a
**short-lived client token** that your backend mints for a specific user. So:

```
 ┌─────────┐   API key (secret)   ┌──────────────┐   client token   ┌──────────┐
 │ your    │ ───────────────────▶ │  Dialbridge  │ ───────────────▶ │ your iOS │
 │ backend │  POST /client-tokens │   backend    │   (~15 min)      │   app    │
 └─────────┘ ◀─────────────────── └──────────────┘ ◀─────────────── └──────────┘
                                            ▲  app: POST /calls (Bearer client token)
```

The app **never** holds the API key.

---

## Step 1 — Add the SDK (Swift Package Manager)

In Xcode: **File ▸ Add Package Dependencies…** and add the `DialbridgeSDK` package
(your Git URL, or a local path while developing), then add `DialbridgeSDK` to your app target.

```swift
// or in your own Package.swift
dependencies: [ .package(url: "https://github.com/Apudo21230/dialbridge.git", from: "1.0.0") ]
```

## Step 2 — Mint a client token on YOUR backend

Your server exchanges the API key for a token (never do this in the app):

```http
POST https://<dialbridge-host>/client-tokens
Authorization: Bearer db_live_your_api_key
Content-Type: application/json

{ "userRef": "fan_4821" }
```
```json
→ { "token": "eyJhbGciOi…", "expiresIn": 900 }
```

Expose a tiny endpoint on your own backend (e.g. `POST /dialbridge/token`) that returns
this `token` to your authenticated user.

## Step 3 — Place the masked call from the app

```swift
import DialbridgeSDK

// token came from YOUR backend (Step 2)
let client = DialbridgeClient(baseURL: "https://<dialbridge-host>", clientToken: token)

let call = try await client.createCall(
    creatorNumber: "+9198XXXXXXXX",   // who to ring
    fanNumber:     "+9199XXXXXXXX"    // who to bridge in
)
// call.status == "ringing"  → the creator's phone rings (normal PSTN call)
// call.virtualNumber        → the masked line both parties see

// poll for live status
let latest = try await client.getCall(sessionId: call.sessionId)
// "ringing" → "in_progress" → "completed"
```

That's the whole integration. See `App/` for a complete SwiftUI screen wiring this up
(`TokenProvider`, `CallController`, `ContentView`) — copy those files into your Xcode app.

---

## Run the demo

### A) Command-line (verifies the full flow end-to-end)

With the backend running locally (`cd backend && npm run dev`) and an API key from the
admin console:

```bash
cd examples/ios-demo
DIALBRIDGE_API_KEY=db_live_xxx swift run
```

Output:
```
① Your backend mints a client token …  ✓ client token: eyJhbGciOi…
② The app creates the masked call …    ✓ status: ringing   masked line: +91…
③ The app polls for status …           ✓ status: ringing
```

Optional env: `DIALBRIDGE_BASE_URL` (default `http://localhost:3000`), `DEMO_CREATOR`,
`DEMO_FAN`, `DEMO_USER`.

### B) SwiftUI app (a real window you can click)

The `App/` files are also a runnable SwiftUI app target. Two ways to launch it:

```bash
# straight from the terminal — opens a window
cd examples/ios-demo
DIALBRIDGE_API_KEY=db_live_xxx swift run DialbridgeDemoApp
```

or open it in Xcode and press Run:

```bash
open examples/ios-demo/Package.swift   # Xcode opens the package
# pick the "DialbridgeDemoApp" scheme → Run
# (set DIALBRIDGE_API_KEY in the scheme's Run ▸ Arguments ▸ Environment)
```

Enter the two numbers → **Place masked call** → watch the status and masked line. The
call also shows up in the admin console (Calls & recordings).

**For your real iOS app:** create an iOS app target in Xcode, add the `DialbridgeSDK`
package, drop in the four `App/` files, and switch `DemoConfig.tokenProvider` to
`BackendTokenProvider` so the API key stays on your server.

---

## Notes

- **No VoIP / no audio in the app.** The call is a normal cellular call placed by the
  operator. The SDK is just REST.
- **`baseURL` must be `https://`** in production (`http://localhost` is allowed for dev).
- **Real numbers are never returned** to the app or stored by Dialbridge — only the
  masked virtual number.
- Status values: `ringing` → `in_progress` → `completed` (or `failed`). With the mock
  driver a call stays `ringing`; real transitions arrive once the Tata DIGO driver is live.
