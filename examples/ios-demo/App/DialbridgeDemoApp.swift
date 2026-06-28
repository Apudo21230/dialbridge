import SwiftUI

/// Demo configuration. In a real app these come from your build config / backend.
enum DemoConfig {
    /// Your Dialbridge host. Use https:// in production (http allowed only for localhost).
    static let baseURL = "http://localhost:3000"

    /// How the app gets a client token.
    ///
    /// PRODUCTION — your server mints the token, the API key never ships:
    ///   static let tokenProvider: TokenProvider =
    ///       BackendTokenProvider(yourBackendTokenURL: "https://api.yourapp.com/dialbridge/token")
    ///
    /// DEMO ONLY — mints in-app from the API key (do not ship):
    static let tokenProvider: TokenProvider = DemoTokenProvider(
        baseURL: baseURL,
        apiKey: ProcessInfo.processInfo.environment["DIALBRIDGE_API_KEY"] ?? "db_live_REPLACE_ME"
    )
}

@main
struct DialbridgeDemoApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
