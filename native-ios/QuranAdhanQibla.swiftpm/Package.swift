// swift-tools-version: 5.9
import PackageDescription

#if canImport(AppleProductTypes)
  import AppleProductTypes

  // Keep host-only XCTest targets outside the app-playground build graph.
  let package = Package(
    name: "QuranAdhanQibla",
    defaultLocalization: "ar",
    platforms: [.iOS("17.0")],
    products: [
      .iOSApplication(
        name: "قرآن · أذان · قبلة",
        targets: ["AppModule"],
        bundleIdentifier: "org.saadmusbeh.quranadhanqibla.swift",
        displayVersion: "1.0.2",
        bundleVersion: "3",
        appIcon: .asset("AppIcon"),
        accentColor: .presetColor(.green),
        supportedDeviceFamilies: [.pad, .phone],
        supportedInterfaceOrientations: [
          .portrait, .landscapeLeft, .landscapeRight,
          .portraitUpsideDown(.when(deviceFamilies: [.pad])),
        ],
        capabilities: [
          .locationWhenInUse(
            purposeString:
              "نستخدم موقعك أثناء فتح التطبيق لحساب مواقيت الصلاة واتجاه القبلة على جهازك. Your location calculates prayer times and Qibla on your device."
          )
        ],
        appCategory: .reference,
        additionalInfoPlistContentFilePath: "AppInfo.plist"
      )
    ],
    targets: [
      .target(name: "Adhan", path: "Sources/Adhan"),
      .target(name: "IslamicCore", dependencies: ["Adhan"], path: "Sources/Core"),
      .executableTarget(
        name: "AppModule", dependencies: ["IslamicCore"], path: "Sources/App",
        resources: [
          .copy("OfflineContent"), .process("Assets.xcassets"), .process("PrivacyInfo.xcprivacy"),
        ]
      ),
    ],
    swiftLanguageVersions: [.v5]
  )
#else
  // Repository Linux/CLI checks use the same calculation sources. This branch is
  // not part of the Swift Playground app build.
  let package = Package(
    name: "QuranAdhanQibla",
    products: [.library(name: "IslamicCore", targets: ["IslamicCore"])],
    targets: [
      .target(name: "Adhan", path: "Sources/Adhan"),
      .target(name: "IslamicCore", dependencies: ["Adhan"], path: "Sources/Core"),
      .testTarget(name: "CoreTests", dependencies: ["IslamicCore"], path: "Tests/CoreTests"),
    ],
    swiftLanguageVersions: [.v5]
  )
#endif
