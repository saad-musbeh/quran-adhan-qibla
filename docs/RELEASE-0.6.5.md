# 0.6.5 — saved data, playback and location fixes

Version **0.6.5**, Android code **28**, iOS source build **28**.

- Preserve saved Quran books and settings when a storage read fails. Retry the read before enabling changes or writing defaults.
- Prevent an older audio request from replacing a newer queue, remove abandoned partial downloads safely, and stop Android playback when the app task is removed.
- Retry failed automatic location acquisition without treating the failure as a successful six-hour fix.
- Cancel pending Adhan test alerts when alerts are disabled, including a disable that happens while scheduling is in progress.
- Keep map retry controls after terminal tile errors. Date-line selections save canonical coordinates while keeping the marker where the user tapped.
- Remove unused reader code and unreachable localization entries, include previously omitted behavior tests, and update compatible Expo SDK 57 patch packages.

Original release validation included **221 JavaScript tests**, **20 Rust tests**, **18 Android native unit tests**, TypeScript, localization, Rust formatting/Clippy, Android/iOS JavaScript exports and the Android debug build. These counts describe the release checks, not the current test suite. Android release APKs receive content, version, signing and alignment audits before publication.

**iOS native verification was deferred for the original release at the user's request.** The subsequent 0.6.5 follow-up passed all seven simulator UI tests on 20 October 2026, including book-name/relaunch, iPad page turns, native playback and whole-Quran download start/cancel. The fixes and test harness are merged into `main`; see [iOS testing status and limits](IOS-TESTING.md#current-status). This verifies start/cancel and saved inventory, not a completed 114-surah download. Physical-device signing, listening, interruptions, compass accuracy and notification sound behavior remain unverified by that run. No signed iOS device binary is supplied.

Later follow-ups on `main` also add [dependency-security mitigations](DEPENDENCY-SECURITY.md) and replace the custom hook-test runner with React's test renderer, strengthening behavior assertions. Remaining upstream audit warnings and native compiler warnings stay visible.

Install the matching APK over the existing app to preserve books, bookmarks, downloads, location and settings. ARM64 is for ARM64 Android phones; x86_64 is for compatible devices and emulators; the universal APK includes both. The Android package and existing local-testing signing identity are unchanged. This is a GitHub release, not an app-store submission. Physical-device GPS, compass, notification delivery and playback follow-up remain necessary.
