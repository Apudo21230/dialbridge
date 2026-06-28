import Foundation

/// Thin client to the Dialbridge backend. Authenticates with a short-lived
/// **client token** minted by the integrator's backend — no API secret in the app.
/// No VoIP/media: the actual call is a normal PSTN call the operator places.
public struct DialbridgeClient {
    private let baseURL: String
    private let clientToken: String
    private let transport: HTTPTransport

    public init(baseURL: String, clientToken: String, transport: HTTPTransport = URLSessionTransport()) {
        self.baseURL = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        self.clientToken = clientToken
        self.transport = transport
    }

    private func requireSecureBaseURL() throws {
        let ok = baseURL.hasPrefix("https://") || baseURL.hasPrefix("http://localhost") || baseURL.hasPrefix("http://127.0.0.1")
        if !ok {
            throw DialbridgeError(status: 0, message: "baseURL must use https:// (http allowed only for localhost)")
        }
    }

    /// Start a masked call between two numbers. Neither party sees the other's real number.
    public func createCall(creatorNumber: String, fanNumber: String, bookingId: String? = nil) async throws -> CallSession {
        var payload: [String: String] = ["creatorNumber": creatorNumber, "fanNumber": fanNumber]
        if let bookingId { payload["bookingId"] = bookingId }
        let body = try JSONSerialization.data(withJSONObject: payload)
        return try await request(method: "POST", path: "/calls", body: body)
    }

    /// Fetch the latest status of a call.
    public func getCall(sessionId: String) async throws -> CallSession {
        guard sessionId.range(of: "^[A-Za-z0-9_-]{1,64}$", options: .regularExpression) != nil else {
            throw DialbridgeError(status: 0, message: "invalid sessionId")
        }
        return try await request(method: "GET", path: "/calls/\(sessionId)", body: nil)
    }

    private func request(method: String, path: String, body: Data?) async throws -> CallSession {
        try requireSecureBaseURL()
        guard let url = URL(string: baseURL + path) else {
            throw DialbridgeError(status: 0, message: "invalid URL")
        }
        let (status, data) = try await transport.send(method: method, url: url, token: clientToken, body: body)
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "HTTP \(status)"
            throw DialbridgeError(status: status, message: message)
        }
        return try JSONDecoder().decode(CallSession.self, from: data)
    }
}
