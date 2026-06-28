import SwiftUI

/// Demo config read from Info.plist (host + DEMO-only API key from Secrets.xcconfig).
enum DemoConfig {
    static var baseURL: String {
        Bundle.main.object(forInfoDictionaryKey: "DialbridgeBaseURL") as? String ?? "http://localhost:3000"
    }
    static var apiKey: String {
        Bundle.main.object(forInfoDictionaryKey: "DialbridgeAPIKey") as? String ?? "db_live_REPLACE_ME"
    }

    /// DEMO ONLY — mints the token in-app from the API key.
    /// Production: `BackendTokenProvider(yourBackendTokenURL: "https://api.yourapp.com/dialbridge/token")`.
    static var tokenProvider: TokenProvider {
        DemoTokenProvider(baseURL: baseURL, apiKey: apiKey)
    }
}

@main
struct FanCallDemoApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
