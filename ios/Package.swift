// swift-tools-version:5.3
import Foundation
import PackageDescription

let useTauriStub = ProcessInfo.processInfo.environment["VNIDROP_FS_USE_TAURI_STUB"] == "1"
let tauriApiPath = !useTauriStub && FileManager.default.fileExists(atPath: "../.tauri/tauri-api/Package.swift")
  ? "../.tauri/tauri-api"
  : "test-support/tauri-api"

let package = Package(
  name: "tauri-plugin-vnidrop-fs",
  platforms: [
    .macOS(.v10_13),
    .iOS(.v13),
  ],
  products: [
    .library(
      name: "tauri-plugin-vnidrop-fs",
      type: .static,
      targets: ["tauri-plugin-vnidrop-fs"]
    ),
  ],
  dependencies: [
    .package(name: "Tauri", path: tauriApiPath)
  ],
  targets: [
    .target(
      name: "tauri-plugin-vnidrop-fs",
      dependencies: [
        .byName(name: "Tauri"),
        .byName(name: "VnidropFsCore")
      ],
      path: "Sources/VnidropFsPlugin"
    ),
    .target(
      name: "VnidropFsCore",
      path: "Sources/VnidropFsCore"
    ),
    .testTarget(
      name: "VnidropFsCoreTests",
      dependencies: [
        .byName(name: "VnidropFsCore")
      ],
      path: "Tests/VnidropFsCoreTests"
    )
  ]
)
