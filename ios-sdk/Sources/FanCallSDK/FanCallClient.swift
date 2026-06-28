import Foundation

/// Thin client to the FanCall backend. No VoIP/media — the actual call is a
/// normal PSTN call placed by the telecom operator. Fleshed out in the iOS SDK plan.
public struct FanCallClient {
    private let baseURL: String

    public init(baseURL: String) {
        self.baseURL = baseURL
    }

    public func version() -> String { "0.1.0" }
}
