import Foundation

/// Pluggable HTTP layer so the client can be unit-tested without a network.
public protocol HTTPTransport {
    func send(method: String, url: URL, token: String, body: Data?) async throws -> (status: Int, data: Data)
}

public struct URLSessionTransport: HTTPTransport {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func send(method: String, url: URL, token: String, body: Data?) async throws -> (status: Int, data: Data) {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        let (data, resp) = try await session.data(for: req)
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        return (status, data)
    }
}
