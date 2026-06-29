import Foundation
import DialbridgeSDK

/// Drives one masked call: get a token → create the call → poll its status.
@MainActor
final class CallController: ObservableObject {
    @Published var status = "idle"
    @Published var maskedLine: String?
    @Published var sessionId: String?
    @Published var error: String?
    @Published var inFlight = false

    private let baseURL: String
    private let tokens: TokenProvider
    private var pollTask: Task<Void, Never>?

    init(baseURL: String, tokens: TokenProvider) {
        self.baseURL = baseURL
        self.tokens = tokens
    }

    func placeCall(creator: String, fan: String, userRef: String) {
        error = nil
        inFlight = true
        status = "connecting"
        Task {
            do {
                // 1) token from your backend (the API key never ships in the app)
                let token = try await tokens.clientToken(userRef: userRef)
                // 2) create the masked call with the SDK
                let client = DialbridgeClient(baseURL: baseURL, clientToken: token)
                let call = try await client.createCall(creatorNumber: creator, fanNumber: fan)
                sessionId = call.sessionId
                maskedLine = call.virtualNumber
                status = call.status
                // 3) keep the UI live by polling
                startPolling(client: client, id: call.sessionId)
            } catch let e as DialbridgeError {
                error = "Error \(e.status): \(e.message)"
                status = "failed"
            } catch {
                self.error = error.localizedDescription
                status = "failed"
            }
            inFlight = false
        }
    }

    private func startPolling(client: DialbridgeClient, id: String) {
        pollTask?.cancel()
        pollTask = Task {
            for _ in 0..<150 {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                if Task.isCancelled { return }
                guard let latest = try? await client.getCall(sessionId: id) else { continue }
                status = latest.status
                if latest.status == "completed" || latest.status == "failed" { return }
            }
        }
    }
}
