#!/usr/bin/env python3
"""Generate an XcodeGen spec for building the Swift Playground sources as an iOS app."""

from __future__ import annotations

import argparse
import json
import plistlib
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    root = args.repo_root.resolve()
    output = args.output.resolve()
    package = root / "native-ios" / "QuranAdhanQibla.swiftpm"
    sources = package / "Sources"
    tests = root / "native-ios" / "UITests" / "SwiftPortSmokeTests.swift"
    app_info_path = output.parent / "AppInfo.plist"
    with (package / "AppInfo.plist").open("rb") as source:
        app_info = plistlib.load(source)
    app_info.update(
        {
            "CFBundleDevelopmentRegion": "ar",
            "CFBundleDisplayName": "قرآن · أذان · قبلة",
            "CFBundleExecutable": "QuranAdhanQibla",
            "CFBundleIdentifier": "org.saadmusbeh.quranadhanqibla.swift",
            "CFBundleInfoDictionaryVersion": "6.0",
            "CFBundleName": "QuranAdhanQibla",
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": "1.0.2",
            "CFBundleVersion": "3",
            "LSRequiresIPhoneOS": True,
            "NSLocationWhenInUseUsageDescription": (
                "نستخدم موقعك أثناء فتح التطبيق لحساب مواقيت الصلاة واتجاه القبلة "
                "على جهازك. Your location calculates prayer times and Qibla on your device."
            ),
            "UILaunchScreen": {},
            "UISupportedInterfaceOrientations": [
                "UIInterfaceOrientationPortrait",
                "UIInterfaceOrientationLandscapeLeft",
                "UIInterfaceOrientationLandscapeRight",
            ],
            "UISupportedInterfaceOrientations~ipad": [
                "UIInterfaceOrientationPortrait",
                "UIInterfaceOrientationPortraitUpsideDown",
                "UIInterfaceOrientationLandscapeLeft",
                "UIInterfaceOrientationLandscapeRight",
            ],
        }
    )
    app_info_path.parent.mkdir(parents=True, exist_ok=True)
    with app_info_path.open("wb") as destination:
        plistlib.dump(app_info, destination, sort_keys=True)

    spec = {
        "name": "SwiftPort",
        "options": {
            "deploymentTarget": {"iOS": "17.0"},
            "createIntermediateGroups": True,
            "groupSortPosition": "top",
        },
        "settings": {
            "base": {
                "SWIFT_VERSION": "5.0",
                "IPHONEOS_DEPLOYMENT_TARGET": "17.0",
                "CODE_SIGNING_ALLOWED": "NO",
                "CODE_SIGNING_REQUIRED": "NO",
                "CODE_SIGN_IDENTITY": "",
            }
        },
        "targets": {
            "Adhan": {
                "type": "framework",
                "platform": "iOS",
                "sources": [{"path": str(sources / "Adhan")}],
                "settings": {
                    "base": {
                        "DEFINES_MODULE": "YES",
                        "GENERATE_INFOPLIST_FILE": "YES",
                        "PRODUCT_BUNDLE_IDENTIFIER": "org.saadmusbeh.quranadhanqibla.adhan",
                        "PRODUCT_NAME": "Adhan",
                    }
                },
            },
            "IslamicCore": {
                "type": "framework",
                "platform": "iOS",
                "sources": [{"path": str(sources / "Core")}],
                "dependencies": [{"target": "Adhan", "embed": False}],
                "settings": {
                    "base": {
                        "DEFINES_MODULE": "YES",
                        "GENERATE_INFOPLIST_FILE": "YES",
                        "PRODUCT_BUNDLE_IDENTIFIER": "org.saadmusbeh.quranadhanqibla.core",
                        "PRODUCT_NAME": "IslamicCore",
                    }
                },
            },
            "QuranAdhanQibla": {
                "type": "application",
                "platform": "iOS",
                "info": {"path": str(app_info_path), "properties": app_info},
                "sources": [
                    {"path": str(sources / "App"), "excludes": ["OfflineContent/**", "Assets.xcassets/**", "PrivacyInfo.xcprivacy"]},
                    {"path": str(sources / "App" / "Assets.xcassets"), "buildPhase": "resources"},
                    {"path": str(sources / "App" / "OfflineContent"), "buildPhase": "resources", "type": "folder"},
                    {"path": str(sources / "App" / "PrivacyInfo.xcprivacy"), "buildPhase": "resources"},
                ],
                "dependencies": [
                    {"target": "IslamicCore", "embed": True},
                    {"target": "Adhan", "embed": True},
                ],
                "settings": {
                    "base": {
                        "PRODUCT_BUNDLE_IDENTIFIER": "org.saadmusbeh.quranadhanqibla.swift",
                        "PRODUCT_NAME": "QuranAdhanQibla",
                        "MARKETING_VERSION": "1.0.2",
                        "CURRENT_PROJECT_VERSION": "3",
                        "INFOPLIST_KEY_CFBundleDisplayName": "قرآن · أذان · قبلة",
                        "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
                    }
                },
            },
            "SwiftPortUITests": {
                "type": "bundle.ui-testing",
                "platform": "iOS",
                "sources": [{"path": str(tests)}],
                "dependencies": [{"target": "QuranAdhanQibla"}],
                "settings": {
                    "base": {
                        "PRODUCT_BUNDLE_IDENTIFIER": "org.saadmusbeh.quranadhanqibla.swift.uitests",
                        "GENERATE_INFOPLIST_FILE": "YES",
                        "TEST_TARGET_NAME": "QuranAdhanQibla",
                    }
                },
            },
        },
        "schemes": {
            "SwiftPort": {
                "build": {
                    "targets": {
                        "QuranAdhanQibla": ["run", "test", "profile", "analyze", "archive"],
                        "SwiftPortUITests": ["test"],
                    }
                },
                "run": {"config": "Debug"},
                "test": {
                    "config": "Debug",
                    "targets": [{"name": "SwiftPortUITests", "parallelizable": False}],
                },
                "profile": {"config": "Release"},
                "analyze": {"config": "Debug"},
                "archive": {"config": "Release"},
            }
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
