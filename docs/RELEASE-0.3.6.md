# 0.3.6 — Quran library and reader improvements

- Six Quran books, each starting at Al-Fatiha with a separate saved page, name and bookmarks. Return to the library to use Adhan or Qibla.
- Consistent gold borders across the main screens and navigation.
- Visible ayah numbers in night reading.
- Pages follow vertical or horizontal dragging and advance only when released beyond halfway; shorter drags return to the same page.
- Faster first opening through asset warming, deferred tafsir loading and reuse of the reader.
- Ten reciter choices, selectable directly in the audio player.
- Labelled previous ayah, replay, play/pause, next ayah and stop controls.
- Four downloadable tafsir books, with original Hijri publication information and separate digital edition dates. Undocumented original first-print dates are identified explicitly.
- Reduced compass smoothing delay during large turns and less work per sensor sample.

74 JavaScript tests, 14 Rust tests, TypeScript, formatting, Clippy, Android/iOS asset exports and the Android APK build passed. Browser checks cover live drag, cancellation, night numeral colors and preservation of printed pages. All 114 surahs from each added tafsir source were checked; Al-Saadi passages retain their original paragraphs and overlap at Al-Kahf 99.

This is an Android test APK signed with the project's existing generated test key. Fresh native runtime checks were blocked by the emulator crashing at boot on this host. Physical-device compass response, audio behavior and native iOS remain unverified. The inspected sources do not establish original first-print dates for Al-Moyassar or Al-Nafahat; their verified digital source dates are shown separately.

## iOS / Mac testing — 12 October 2026

For the current Mac project, download the attached **quran-adhan-qibla-0.3.6-ios-source.zip** (commit `82bb4b0204fba765a98c0684e7b4086fd2a74308`) or use the **codex/reader-polish** branch. The automatic source archives for this release tag precede these iOS fixes.

[Mac and iPhone setup instructions](https://github.com/saad-musbeh/quran-adhan-qibla/blob/codex/reader-polish/docs/IOS-TESTING.md) are also included in the ZIP. Use Xcode 26.4+ (26.6 recommended), Node.js 22.13+ within version 22, Rust/rustup and CocoaPods; the app targets iOS 16.4+.

The iOS source has the same 0.3.6 / build 9 Quran features, the Quran/direction icon, source-built Expo modules so the audio patch is included, scene lifecycle support, no unused APNs entitlement, and a fix for Swift lock-screen skip interval restoration. [The macOS native build passed](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/38219756885): Rust device/simulator libraries, CocoaPods, Swift compilation and packaging of an unsigned bundled Release simulator app.

Physical iPhone signing and runtime, compass/audio behavior and Xcode 27 remain for the tester to verify. Scheduled Adhan alerts are still Android-only. The Android APK is unchanged.

Source ZIP SHA-256: `7ea733b20b22749cf21777e970a02b0234ea8438f88718c6b5ae7cdd49b51cf8`.
