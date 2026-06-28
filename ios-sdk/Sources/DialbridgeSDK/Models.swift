import Foundation

/// A masked-call session as returned by the Dialbridge API.
public struct CallSession: Codable, Equatable {
    public let sessionId: String
    public let status: String
    public let virtualNumber: String?
}

public struct DialbridgeError: Error, Equatable {
    public let status: Int
    public let message: String
}
