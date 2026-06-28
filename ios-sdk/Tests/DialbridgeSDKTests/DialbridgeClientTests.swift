import XCTest
@testable import DialbridgeSDK

final class DialbridgeClientTests: XCTestCase {
    func testVersion() {
        let client = DialbridgeClient(baseURL: "https://api.example.com")
        XCTAssertEqual(client.version(), "0.1.0")
    }
}
