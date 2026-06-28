// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DialbridgeSDK",
    platforms: [.iOS(.v15), .macOS(.v13)],
    products: [
        .library(name: "DialbridgeSDK", targets: ["DialbridgeSDK"])
    ],
    targets: [
        .target(name: "DialbridgeSDK"),
        .testTarget(name: "DialbridgeSDKTests", dependencies: ["DialbridgeSDK"])
    ]
)
