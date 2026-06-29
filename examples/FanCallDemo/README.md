# FanCallDemo — a real iOS client app

A full iOS app (the kind a client like **FanCall** ships) that **installs the Dialbridge
SDK as a third-party Swift Package** and places a masked call. Runs in the iOS Simulator.

The Xcode project is generated from `project.yml` with [XcodeGen](https://github.com/yonaskolb/XcodeGen),
so the spec stays readable and the `.xcodeproj` isn't committed.

## Run it

```bash
# 1) one-time: install the project generator + your API key
brew install xcodegen
cp Config/Secrets.xcconfig.example Config/Secrets.xcconfig
#   → edit Config/Secrets.xcconfig and paste your db_live_ key

# 2) generate the Xcode project (this is where the SDK gets added as a package)
cd examples/FanCallDemo
xcodegen generate

# 3) open and run on a simulator
open FanCallDemo.xcodeproj
#   pick an iPhone simulator → Run (⌘R)
```

Make sure the backend is running (`cd backend && npm run dev`). The app talks to
`http://localhost:3000` (set in `Sources/Info.plist` → `DialbridgeBaseURL`).

In the app: enter the two numbers → **Place masked call** → the status goes
`Ready → Connecting → Ringing` and the masked line appears. The call also shows up in
the admin console under **Calls & recordings**.

## How the SDK is wired

- `project.yml` declares the package: `packages: DialbridgeSDK: { path: ../../ios-sdk }`
  (a Git URL in a real project) and the app target depends on it.
- The app obtains a short-lived **client token**, then calls the SDK:
  `DialbridgeClient(baseURL:clientToken:).createCall(creatorNumber:fanNumber:)`.
- `Sources/TokenProvider.swift` has the demo token source (`DemoTokenProvider`, mints
  in-app from the API key) and the production one (`BackendTokenProvider`, your server
  mints it so the key never ships). Switch to `BackendTokenProvider` for release.

No VoIP/audio in the app — the operator places the real cellular call; neither party
sees the other's real number.

## What the receiver (creator) sees

A **normal native iOS incoming-call screen** (green Accept / red Reject), shown by the
OS because it's a real cellular call — **no app or internet needed on their side**. They
accept like any phone call. The caller ID is the Dialbridge **masked number**, never the
fan's real number. (The fan also joins via a cellular call, since the app carries no
audio.)

You can't replace that native screen — but you can **label** the masked number on it.

## Caller-ID labels — the Call Directory extension

`CallDirectory/` is a **CallKit Call Directory extension**. It does *not* draw the
incoming screen; it only makes the native screen say e.g. **"FanCall — Aanya Sharma"**
instead of a bare number.

- The app records `maskedNumber → label` in a shared **App Group**
  (`Sources/CallerIDDirectory.swift`, called from `OutgoingCallView` when the masked line
  arrives) and reloads the extension.
- The extension (`CallDirectory/CallDirectoryHandler.swift`) feeds those entries to iOS.

**Testing:** caller-ID labels only show on a **real device** — enable it under
*Settings ▸ Apps ▸ Phone ▸ Call Blocking & Identification ▸ FanCall*, and the label
appears when that number actually rings (i.e. once the Tata DIGO driver places real
calls). The simulator builds it but can't display it (no real calls).
