# 0.6.2 — Android Quran playback

Version **0.6.2**, Android code **25**, iOS source build **25**.

## Changes

- Align all Android Media3 artifacts used by the app and Expo Audio on **1.9.3**. This includes upstream fixes for MP3 timeline updates discarding queued periods, audio-output initialization retries, and compressed-offload playlist stalls. See [upstream changes](https://github.com/androidx/media/blob/1.9.3/RELEASENOTES.md).
- Route native playback command exceptions into the existing ayah retry/error flow. Commands posted to Android's main handler previously escaped JavaScript's `try/catch` and could terminate the app. Cover immediate failures, posted failures and successful commands with native unit tests.
- Add native regression coverage for Al-Ikhlas → Al-Falaq → An-Nas at **1.25×**, using the production metadata wrapper and a MediaSession, from private downloaded files and source streams. Source-audio timing in the submitted video matches 1.25× Ghamdi playback. Check audio underruns, playback errors, every automatic ayah transition and the final stop. Other native queue tests retain normal speed. Test recordings remain in private cache and are removed afterward.
- Preserve the current queue/preloading, surah-end choices, saved preferences and source recitations.

The user supplied a recording showing playback cuts and an app exit as An-Nas starts, and confirmed the issue occurs with both streams and downloads. The recording contains no Android crash stack trace, so the exact physical-device exception is not established by the video alone.

## Verification

- TypeScript, localization, JavaScript behavior tests, Rust formatting/Clippy and Rust tests pass.
- All **13 Android native unit tests** pass, including three playback command/recovery tests. Host checks include **160 JavaScript tests** and **20 Rust tests**.
- Android and iOS JavaScript exports pass. iOS native/device testing is deferred at the user's request; this release contains no iOS native audio change or new simulator binary.
- Gradle's release runtime dependency report confirms Media3 **1.9.3** throughout, including Expo Audio's dependencies.
- ARM64, x86_64 and universal release APKs build with R8 shrinking and a fresh JavaScript bundle. All three content audits verify 604 Quran pages, both dua sheets, 12 notification sounds and the expected Rust libraries. Packaged metadata is 0.6.2 / code 25; signing matches 0.6.1. Sizes are 93.54 MiB, 93.64 MiB and 99.29 MiB respectively.

Native emulator results are recorded with the release after completion. Local emulators crash during host startup, before application playback; physical-phone confirmation of the reported cuts and app exit remains necessary.

## Installation

Install the architecture-matching APK over 0.6.1 to retain saved books, bookmarks, audio downloads, location and settings. The package ID and existing local-testing signing key are unchanged. The source tag is `v0.6.2`.
