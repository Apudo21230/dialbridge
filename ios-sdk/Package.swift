// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FanCallSDK",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "FanCallSDK", targets: ["FanCallSDK"])
    ],
    targets: [
        .target(name: "FanCallSDK"),
        .testTarget(name: "FanCallSDKTests", dependencies: ["FanCallSDK"])
    ]
)
