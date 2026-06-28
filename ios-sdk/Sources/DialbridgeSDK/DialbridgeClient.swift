import Foundation

/// Thin client to the Dialbridge backend. No VoIP/media — the actual call is a
/// normal PSTN call placed by the telecom operator. Fleshed out in the iOS SDK plan.
public struct DialbridgeClient {
    private let baseURL: String

    public init(baseURL: String) {
        self.baseURL = baseURL
    }

    public func version() -> String { "0.1.0" }
}
