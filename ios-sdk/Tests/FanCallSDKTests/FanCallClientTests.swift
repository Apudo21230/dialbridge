import XCTest
@testable import FanCallSDK

final class FanCallClientTests: XCTestCase {
    func testVersion() {
        let client = FanCallClient(baseURL: "https://api.example.com")
        XCTAssertEqual(client.version(), "0.1.0")
    }
}
