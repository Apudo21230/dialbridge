import Foundation

/// Talks to the backend on the app's behalf: caches a client token, loads the
/// creator directory. (The masked call itself goes through the DialbridgeSDK.)
actor DialbridgeService {
    let baseURL: String
    private let tokens: TokenProvider
    private let userRef: String
    private var cachedToken: String?

    init(baseURL: String, tokens: TokenProvider, userRef: String) {
        self.baseURL = baseURL
        self.tokens = tokens
        self.userRef = userRef
    }

    func token() async throws -> String {
        if let cachedToken { return cachedToken }
        let t = try await tokens.clientToken(userRef: userRef)
        cachedToken = t
        return t
    }

    func loadCreators() async throws -> [Creator] {
        let t = try await token()
        var req = URLRequest(url: URL(string: baseURL + "/demo/creators")!)
        req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            throw NSError(domain: "Dialbridge", code: code,
                          userInfo: [NSLocalizedDescriptionKey: "couldn't load creators (HTTP \(code))"])
        }
        return try JSONDecoder().decode(CreatorsResponse.self, from: data).creators
    }
}
