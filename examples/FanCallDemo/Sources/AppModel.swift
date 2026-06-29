import SwiftUI

@MainActor
final class AppModel: ObservableObject {
    @Published var creators: [Creator] = []
    @Published var loadError: String?
    @Published var loading = false
    @Published var active: Creator?   // drives the outgoing-call screen

    let service: DialbridgeService
    let userRef = "fan_demo_1"

    init() {
        service = DialbridgeService(
            baseURL: DemoConfig.baseURL,
            tokens: DemoConfig.tokenProvider,
            userRef: "fan_demo_1"
        )
    }

    func load() async {
        loading = true
        loadError = nil
        do { creators = try await service.loadCreators() }
        catch { loadError = error.localizedDescription }
        loading = false
    }
}
