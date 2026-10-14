# Android APK size

Release builds retain the complete offline Quran and worldwide city catalogue.
The original 0.4.8 test APK was 182,493,745 bytes (174.04 MiB).

The published 0.4.5 and 0.4.6 APKs were 152,052,133 and 152,057,493 bytes (about 145.01 MiB). Against those commonly installed versions, the 0.5.0 ARM64 APK is 34.1% smaller and the universal APK is 30.1% smaller.

## Changes

- Package each of the 604 pinned original SVG pages in an independent Zstandard frame instead of gzip. The assets shrink from 95,248,101 to 70,340,492 bytes. Decoding is pure JavaScript and preserves the exact original bytes, paths and verse polygons; every page is checked against its original SHA-256.
- Enable R8 code and resource shrinking with the optimizing Android rules. Keep the Rust JNI class/method names and all six dynamically resolved Adhan sound resources explicitly.
- Compress the packaged Hermes bundle and native libraries. Android extracts native libraries at installation; the download savings do not imply the same reduction in installed native-library size.
- Package full OGG Adhan recordings on Android and the six 29-second WAV excerpts on iOS. Sound filenames, saved notification channel IDs and source recordings are unchanged.
- Import Ionicons directly, avoiding the other icon families/fonts.
- Build separate ARM64 and x86_64 APKs, plus a universal APK containing both supported Rust ABIs. The universal APK is built with splits disabled so React Native applies its ABI filters; unsupported 32-bit ABIs are excluded.

## Reproduce

Use the JDK/Android SDK/NDK environment documented in the README:

```sh
npm run check
npm run export:mobile
npm run apk:android
python3 scripts/apk-size.py dist/android/app-arm64-v8a-release.apk
```

`apk:android` checks each generated APK for all 604 original packed pages, all six exact OGG recordings, and a Rust library for every included ABI. Outputs stay in ignored `dist/android/`; generated projects, native binaries and signing credentials stay out of Git. Release APKs use version 0.5.0 / code 19 and the existing local test signing identity; no store release is published.

## Measured artifacts (14 October 2026)

- ARM64 phone APK: **100,187,037 bytes / 95.55 MiB**, **45.1% smaller**.
- x86_64 APK: **100,293,846 bytes / 95.65 MiB**, **45.0% smaller**.
- Universal ARM64 + x86_64 APK: **106,218,854 bytes / 101.30 MiB**, **41.8% smaller**.

## Validation and limits

`npm run check` passes TypeScript, localization, 129 JavaScript tests, Rust formatting/Clippy and 14 Rust tests. The application decoder restores every original SVG checksum and the original verse-index checksum. Android and iOS JavaScript/asset exports pass. Native Android release builds pass for both architectures. Packaging audits verify all 604 packed pages and six source-identical OGG recordings, with no iOS WAVs or unsupported ABIs. Every packaged native library matches the original build and retains 16 KB ELF LOAD alignment; APK ZIP alignment and the unchanged signing certificate are verified.

On an isolated API 36 x86_64 emulator, the smaller APK installs over the existing 0.4.8 app without clearing storage. All five saved books/location/app/audio records survive unchanged. Three cold starts pass with an empty crash log. The saved phone Home opt-out opens Adhan with native Rust prayer calculations and countdowns. With Wi-Fi and mobile data disabled, the saved Quran book opens at page 10; decoded verse polygons and labels appear in the native hierarchy, and swipes advance to page 11 and return to page 10. The ATD emulator screenshots are black, so these checks establish behavior and accessibility structure, not a visual review.

Linux iOS prebuild verifies six exact WAV excerpts, no Android OGGs and no APNs entitlement. Native iOS compilation/runtime, physical ARM64-device behavior, compass/GPS accuracy and physical notification delivery/sound remain unverified. No Quran artwork or recording was rasterized, rounded, truncated, transcoded or removed.

For version 0.5.0, direct upgrades from the commonly installed 0.4.5 and 0.4.6 releases also pass with all six books, existing preferences/location and seven source-hosted cached Sudais recordings retained. Offline reader and native cached playback checks pass. See [0.5.0 release notes](RELEASE-0.5.0.md).
