import SwiftUI

/// Home: the fan's creators (loaded from the backend). Tap one to call.
struct CreatorsListView: View {
    @StateObject private var model = AppModel()

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(model.creators) { creator in
                        Button { model.active = creator } label: { CreatorRow(creator: creator) }
                            .buttonStyle(.plain)
                    }
                } header: {
                    Text("Your creators")
                } footer: {
                    Text("Tap to call. We ring them on a normal cellular line through a Dialbridge "
                         + "number — your real number stays private, and so does theirs.")
                }

                if let err = model.loadError {
                    Label(err, systemImage: "wifi.exclamationmark").foregroundStyle(.red)
                }
            }
            .navigationTitle("FanCall")
            .overlay {
                if model.loading && model.creators.isEmpty { ProgressView() }
            }
            .refreshable { await model.load() }
            .task {
                await model.load()
                // demo affordance: auto-open a call so the call screen can be previewed
                if ProcessInfo.processInfo.environment["DEMO_AUTOCALL"] == "1" {
                    model.active = model.creators.first
                }
            }
        }
        .fullScreenCover(item: $model.active) { creator in
            OutgoingCallView(
                creator: creator,
                userRef: model.userRef,
                tokens: DemoConfig.tokenProvider,
                baseURL: DemoConfig.baseURL
            ) { model.active = nil }
        }
    }
}
