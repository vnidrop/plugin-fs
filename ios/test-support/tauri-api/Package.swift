// swift-tools-version:5.3
import PackageDescription

let package = Package(
  name: "Tauri",
  platforms: [
    .macOS(.v10_13),
    .iOS(.v13),
  ],
  products: [
    .library(name: "Tauri", targets: ["Tauri"]),
  ],
  targets: [
    .target(name: "Tauri", path: "Sources/Tauri")
  ]
)
