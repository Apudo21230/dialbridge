import SwiftUI

struct ContentView: View {
    @StateObject private var controller = CallController(
        baseURL: DemoConfig.baseURL,
        tokens: DemoConfig.tokenProvider
    )
    @State private var creator = "+919800000001"
    @State private var fan = "+919800000002"
    private let userRef = "fan_demo_1"

    var body: some View {
        NavigationStack {
            Form {
                Section("Numbers to bridge") {
                    TextField("Creator number (+91…)", text: $creator)
                    TextField("Fan number (+91…)", text: $fan)
                }

                Section {
                    Button {
                        controller.placeCall(creator: creator, fan: fan, userRef: userRef)
                    } label: {
                        HStack {
                            Spacer()
                            Text(controller.inFlight ? "Placing…" : "Place masked call")
                            Spacer()
                        }
                    }
                    .disabled(controller.inFlight)
                }

                Section("Status") {
                    LabeledContent("State", value: controller.status)
                    if let line = controller.maskedLine {
                        LabeledContent("Masked line", value: line)
                    }
                    if let id = controller.sessionId {
                        LabeledContent("Session") { Text(id).font(.caption).foregroundStyle(.secondary) }
                    }
                    if let err = controller.error {
                        Text(err).foregroundStyle(.red)
                    }
                }

                Section {
                    Text("The creator's phone rings as a normal cellular call — no app, no internet. "
                         + "Neither party sees the other's real number.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Dialbridge demo")
        }
    }
}

#Preview {
    ContentView()
}
