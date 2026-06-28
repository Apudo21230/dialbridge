import SwiftUI

/// Initials avatar with a stable color per name.
struct Avatar: View {
    let name: String
    var size: CGFloat = 44

    private var initials: String {
        let parts = name.split(separator: " ")
        let a = parts.first?.first.map(String.init) ?? ""
        let b = parts.dropFirst().first?.first.map(String.init) ?? ""
        return (a + b).uppercased()
    }

    private var color: Color {
        let palette: [Color] = [.blue, .purple, .pink, .orange, .teal, .indigo]
        var hash = 5381
        for s in name.unicodeScalars { hash = ((hash << 5) &+ hash) &+ Int(s.value) }
        return palette[abs(hash) % palette.count]
    }

    var body: some View {
        Circle()
            .fill(color.gradient)
            .frame(width: size, height: size)
            .overlay(
                Text(initials)
                    .font(.system(size: size * 0.4, weight: .semibold))
                    .foregroundStyle(.white)
            )
    }
}

struct CreatorRow: View {
    let creator: Creator

    var body: some View {
        HStack(spacing: 13) {
            Avatar(name: creator.name)
            VStack(alignment: .leading, spacing: 2) {
                Text(creator.name).font(.headline)
                Text(creator.handle).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "phone.circle.fill")
                .font(.title)
                .foregroundStyle(.green)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}
