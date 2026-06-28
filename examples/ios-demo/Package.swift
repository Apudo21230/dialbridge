// swift-tools-version: 5.9
import PackageDescription

// A runnable demo of integrating the Dialbridge iOS SDK.
// `swift run` executes the full flow against a running backend:
//   mint client token (integrator backend) → createCall → poll status.
// The SwiftUI app you'd actually ship lives in ./App (copy into your Xcode project).
let package = Package(
    name: "DialbridgeDemo",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(path: "../../ios-sdk")
    ],
    targets: [
        // Headless flow you can `swift run` to verify end-to-end.
        .executableTarget(
            name: "DialbridgeDemoCLI",
            dependencies: [.product(name: "DialbridgeSDK", package: "ios-sdk")]
        ),
        // The SwiftUI app — `swift run DialbridgeDemoApp` (or open Package.swift in Xcode).
        .executableTarget(
            name: "DialbridgeDemoApp",
            dependencies: [.product(name: "DialbridgeSDK", package: "ios-sdk")],
            path: "App"
        )
    ]
)
