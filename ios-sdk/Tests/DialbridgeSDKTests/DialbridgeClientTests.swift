import XCTest
@testable import DialbridgeSDK

final class FakeTransport: HTTPTransport {
    var lastMethod: String?
    var lastURL: URL?
    var lastToken: String?
    var lastBody: Data?
    let response: (status: Int, data: Data)

    init(status: Int, json: String) {
        self.response = (status, json.data(using: .utf8)!)
    }

    func send(method: String, url: URL, token: String, body: Data?) async throws -> (status: Int, data: Data) {
        lastMethod = method
        lastURL = url
        lastToken = token
        lastBody = body
        return response
    }
}

final class DialbridgeClientTests: XCTestCase {
    func testCreateCallParsesSessionAndSendsAuth() async throws {
        let fake = FakeTransport(status: 201, json: #"{"sessionId":"s1","status":"ringing","virtualNumber":"+910000000000"}"#)
        let client = DialbridgeClient(baseURL: "https://api.example.com/", clientToken: "tok", transport: fake)

        let session = try await client.createCall(creatorNumber: "+919800000001", fanNumber: "+919800000002")

        XCTAssertEqual(session.sessionId, "s1")
        XCTAssertEqual(session.status, "ringing")
        XCTAssertEqual(session.virtualNumber, "+910000000000")
        XCTAssertEqual(fake.lastMethod, "POST")
        XCTAssertEqual(fake.lastURL?.absoluteString, "https://api.example.com/calls")
        XCTAssertEqual(fake.lastToken, "tok")
    }

    func testNon2xxThrowsDialbridgeError() async {
        let fake = FakeTransport(status: 403, json: #"{"error":"integrator suspended"}"#)
        let client = DialbridgeClient(baseURL: "https://api.example.com", clientToken: "tok", transport: fake)

        do {
            _ = try await client.createCall(creatorNumber: "+919800000001", fanNumber: "+919800000002")
            XCTFail("expected createCall to throw")
        } catch let error as DialbridgeError {
            XCTAssertEqual(error.status, 403)
            XCTAssertEqual(error.message, "integrator suspended")
        } catch {
            XCTFail("unexpected error type: \(error)")
        }
    }

    func testRejectsNonHttpsBaseURL() async {
        let client = DialbridgeClient(baseURL: "http://evil.example.com", clientToken: "tok", transport: FakeTransport(status: 200, json: "{}"))
        do {
            _ = try await client.createCall(creatorNumber: "+919800000001", fanNumber: "+919800000002")
            XCTFail("expected an https error")
        } catch let error as DialbridgeError {
            XCTAssertEqual(error.status, 0)
        } catch {
            XCTFail("unexpected error type: \(error)")
        }
    }

    func testRejectsInvalidSessionId() async {
        let client = DialbridgeClient(baseURL: "https://api.example.com", clientToken: "tok", transport: FakeTransport(status: 200, json: "{}"))
        do {
            _ = try await client.getCall(sessionId: "../admin")
            XCTFail("expected an invalid sessionId error")
        } catch let error as DialbridgeError {
            XCTAssertEqual(error.message, "invalid sessionId")
        } catch {
            XCTFail("unexpected error type: \(error)")
        }
    }
}
