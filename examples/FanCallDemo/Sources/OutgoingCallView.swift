import SwiftUI

/// Full-screen outgoing-call UI, like a native phone call. Places the masked
/// call on appear and shows the live status + the Dialbridge masked line.
struct OutgoingCallView: View {
    let creator: Creator
    let userRef: String
    let baseURL: String
    let onEnd: () -> Void

    @StateObject private var controller: CallController

    init(creator: Creator, userRef: String, tokens: TokenProvider, baseURL: String, onEnd: @escaping () -> Void) {
        self.creator = creator
        self.userRef = userRef
        self.baseURL = baseURL
        self.onEnd = onEnd
        _controller = StateObject(wrappedValue: CallController(baseURL: baseURL, tokens: tokens))
    }

    /// In a real app this is the signed-in user's own number.
    private let myNumber = "+919800000002"

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.10, blue: 0.18), .black],
                startPoint: .top, endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 16) {
                Spacer().frame(height: 56)

                Text(statusText)
                    .font(.subheadline.weight(.semibold))
                    .tracking(2)
                    .foregroundStyle(.white.opacity(0.7))

                Avatar(name: creator.name, size: 132)
                    .shadow(color: .black.opacity(0.4), radius: 20, y: 8)

                Text(creator.name)
                    .font(.system(size: 33, weight: .semibold))
                    .foregroundStyle(.white)
                Text(creator.handle)
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.6))

                Spacer()

                maskedCard

                Spacer().frame(height: 28)

                Button(action: onEnd) {
                    Image(systemName: "phone.down.fill")
                        .font(.system(size: 30, weight: .medium))
                        .foregroundStyle(.white)
                        .frame(width: 74, height: 74)
                        .background(Color.red, in: Circle())
                }
                Text("End")
                    .font(.footnote)
                    .foregroundStyle(.white.opacity(0.55))

                Spacer().frame(height: 44)
            }
            .padding(.horizontal, 28)
        }
        .task {
            controller.placeCall(creator: creator.number, fan: myNumber, userRef: userRef)
        }
    }

    private var maskedCard: some View {
        VStack(spacing: 7) {
            Label("Masked via Dialbridge", systemImage: "lock.fill")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.6))
            Text(controller.maskedLine ?? "connecting…")
                .font(.system(.title2, design: .monospaced).weight(.medium))
                .foregroundStyle(.white)
            Text(controller.error ?? "The creator sees this number, never yours.")
                .font(.caption2)
                .foregroundStyle(controller.error == nil ? .white.opacity(0.5) : .red)
                .multilineTextAlignment(.center)
        }
        .padding(18)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 18))
    }

    private var statusText: String {
        switch controller.status {
        case "idle", "connecting": return "CALLING…"
        case "ringing": return "RINGING…"
        case "in_progress": return "CONNECTED"
        case "completed": return "CALL ENDED"
        case "failed": return "CALL FAILED"
        default: return controller.status.uppercased()
        }
    }
}
