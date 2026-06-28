import Foundation

/// A creator the fan can call. In a real app this comes from your own backend.
struct Creator: Identifiable, Decodable, Hashable {
    let id: String
    let name: String
    let handle: String
    let number: String
}

struct CreatorsResponse: Decodable {
    let creators: [Creator]
}
