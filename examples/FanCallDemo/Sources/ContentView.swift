import SwiftUI

struct ContentView: View {
    @StateObject private var controller = CallController(
        baseURL: DemoConfig.baseURL,
        tokens: DemoConfig.tokenProvider
    )
    @State private var creator = "+919800000001"
    @State private var fan = "+919800000002"
    private let userRef = "fan_demo_1"

    private var isLive: Bool { controller.status == "ringing" || controller.status == "in_progress" }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Creator number", text: $creator)
                        .keyboardType(.phonePad)
                    TextField("Your number", text: $fan)
                        .keyboardType(.phonePad)
                } header: {
                    Text("Numbers to bridge")
                } footer: {
                    Text("We ring the creator on a normal cellular call — no app needed on their side.")
                }

                Section {
                    Button(action: place) {
                        HStack {
                            Spacer()
                            if controller.inFlight {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "phone.fill")
                                Text("Place masked call").bold()
                            }
                            Spacer()
                        }
                        .padding(.vertical, 6)
                    }
                    .listRowBackground(Color.accentColor)
                    .foregroundStyle(.white)
                    .disabled(controller.inFlight)
                }

                Section("Status") {
                    HStack {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 10, height: 10)
                            .opacity(isLive ? 1 : 0.5)
                        Text(statusLabel).font(.headline)
                    }
                    if let line = controller.maskedLine {
                        LabeledContent("Masked line") { Text(line).monospaced() }
                    }
                    if let id = controller.sessionId {
                        LabeledContent("Session") { Text(id).font(.caption).monospaced().foregroundStyle(.secondary) }
                    }
                    if let err = controller.error {
                        Label(err, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("FanCall")
        }
    }

    private func place() {
        controller.placeCall(creator: creator, fan: fan, userRef: userRef)
    }

    private var statusLabel: String {
        switch controller.status {
        case "ringing": return "Ringing…"
        case "in_progress": return "Connected"
        case "completed": return "Call ended"
        case "failed": return "Failed"
        case "connecting": return "Connecting…"
        default: return "Ready"
        }
    }

    private var statusColor: Color {
        switch controller.status {
        case "in_progress": return .green
        case "ringing", "connecting": return .orange
        case "failed": return .red
        case "completed": return .blue
        default: return .gray
        }
    }
}

#Preview {
    ContentView()
}
