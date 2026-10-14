# 0.5.0 — Smaller offline Android APKs

Version **0.5.0**, Android version code **19**, iOS build **19**. Existing package identity, local test signing certificate, notification channel IDs and saved-storage keys are retained.

## Changes

- Reduce the ARM64 phone APK by about **34%** compared with the commonly installed 0.4.5/0.4.6 APKs, and **45%** compared with 0.4.8. The universal APK is about **30%** smaller than 0.4.5/0.4.6 and **42%** smaller than 0.4.8.
- Keep all **604 original Quran vector pages**, **6,236 verses**, **224,763 offline places**, and **six full Android Adhan recordings**. No Quran path/text or recording is edited or removed.
- Store individual offline Quran pages with lossless Zstandard compression, verified against all original SVG hashes; preserve page turns, verse hit areas and offline reading.
- Enable R8 code/resource optimization while protecting Rust JNI entry points and all dynamically resolved prayer sounds.
- Compress the packaged JavaScript bundle and native libraries. Download size savings do not imply the same savings in installed native-library size.
- Include only the appropriate Adhan recordings on each platform: full OGGs for Android, existing 29-second WAV excerpts for iOS.
- Import only the icon family used by the app and provide separate ARM64/x86_64 APKs plus a universal APK containing both supported Rust architectures.
- Add `npm run apk:android` and an APK packaging audit that verifies every offline Quran page, recording and architecture before completing a build.

## Installation

Download the **ARM64 APK** for ARM64 Android phones, or the **universal APK** when unsure. The x86_64 APK is for compatible devices and emulators. The signing certificate matches the published 0.4.5, 0.4.6 and 0.4.8 APKs. Install over the existing app to preserve books, bookmarks, downloaded recitations, location and settings. Do not uninstall or clear app storage as part of the upgrade. APKs use the existing development signing identity; this GitHub release is not a Google Play or Apple App Store submission.

The release includes a source ZIP and SHA-256 checksum file. Mac/iPhone setup is in [IOS-TESTING.md](IOS-TESTING.md). Android build and size details are in [ANDROID-SIZE.md](ANDROID-SIZE.md).

## Validation and limits

The versioned artifacts pass `npm run check` (TypeScript, localization, 129 JavaScript tests, Rust formatting/Clippy and 14 Rust tests) and `npm run export:mobile`. Android native release builds and packaging audits pass for ARM64, x86_64 and universal APKs. Every APK identifies itself as 0.5.0 / code 19, retains all 604 original packed Quran pages and six exact OGG recordings, and passes signature and 16 KB alignment checks. Native library bytes match 0.4.8. Linux iOS project generation verifies version 0.5.0 / build 19, six exact WAV excerpts and no Android OGGs or APNs entitlement.

Direct upgrades from the published **0.4.5** and **0.4.6** APKs pass on a separate API 36 emulator. Each older version has six named books with saved pages/page bookmarks/verse bookmarks, a non-default prayer method/Asr choice, night reading/text size, saved location, Sudais reciter/speed/loop preferences and a downloaded Al-Fatiha inventory. Installing 0.5.0 with `adb install -r` retains the old records (allowing new preference defaults), all six books and all seven source-hosted cached audio files byte-for-byte. Offline Quran loading and native playback of those retained recordings pass with an empty crash log. No uninstall or storage clearing occurs during either upgrade. Test recitation MP3s stay in private emulator storage and are not release assets.

The released 0.4.8 APK upgrades to 0.5.0 on an isolated API 36 emulator without clearing storage; all five saved records remain unchanged. Native prayer countdowns, three cold starts with an empty crash log, offline Quran loading, verse hit areas and forward/back page turns pass. ATD screenshots are black, so these are behavioral/accessibility checks rather than a visual review. Physical-device GPS/compass accuracy, notification delivery/sound and native iOS compilation/runtime of 0.5.0 remain unverified. Earlier iOS book-name/full-download issues remain unresolved. Android emulator behavior and JavaScript exports do not establish physical-device or native iOS behavior.

## Downloads

- **ARM64 phone: 95.55 MiB** (100,187,037 bytes), `quran-adhan-qibla-v0.5.0-arm64-v8a.apk`.
- **x86_64: 95.65 MiB** (100,293,846 bytes), `quran-adhan-qibla-v0.5.0-x86_64.apk`.
- **Universal (ARM64 + x86_64): 101.30 MiB** (106,218,854 bytes), `quran-adhan-qibla-v0.5.0.apk`.
