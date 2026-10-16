# 0.5.3 — Performance, Adhan voices and Quran controls

Version **0.5.3**, iOS build **22**, Android version code **22**, on `codex/release-0.5.3` and tag `v0.5.3`. The release includes Android APKs and iOS testing source; a physical iPhone build requires the tester’s Apple signing/provisioning. See [Mac/iPhone setup](IOS-TESTING.md).

## Changes

- Keep native Quran playback alive in a provider, with separate subscriptions for playback time labels. A seek reads the latest native position without recreating its callback every tick. Mount screen content on its first visit, then retain the native layout and state on subsequent tab changes.
- Fix the invisible Start repeating label in the Quran range sheet by pairing its dark button with explicit paper-coloured text, independent of the global light/dark text mapping. Secondary text follows the selected paper palette.
- Add small 75 ms press / 130 ms release animations to app buttons using the native animation driver. Preserve existing hit targets and handlers, skip modal backdrops and reader gestures, and disable scaling when Reduce Motion is enabled. Share one Reduce Motion subscription across buttons.
- Show Arabic and English in the normal language picker. Settings → Extra testing settings → Show testing languages reveals the other 38 draft interface translations. The flag is saved; switching it off returns a selected testing language to Arabic. Upgrades with a draft language and no explicit opt-in return to Arabic.
- Offer exactly Makkah (default), Al-Madinah, Andrewler and Original Adhan recordings. Apply mild noise reduction and matched loudness, including separately normalized 29-second iOS excerpts. Retain source attribution/licences in Credits and [provenance](../assets/adhan/PROVENANCE.md). Removed Aaqib/Shalqar/Malmö choices migrate to Makkah, preserving mute settings. New filenames create new Android sound channels; previously selected retained voices keep their IDs.
- Upload the simulator package immediately after compilation, so a later UI test failure does not prevent testers from downloading a successfully compiled app.

## Installation

Install the ARM64 APK on ARM64 Android phones, the x86_64 APK on compatible devices/emulators, or the universal APK when unsure. Version code 22 upgrades version 0.5.2/code 21. The existing package ID and signing certificate are retained; install over the previous app to keep saved books, downloads, location and preferences. Do not uninstall or clear storage during an upgrade.

The GitHub release includes all three APKs, tracked source and SHA-256 checksums. These APKs are for direct Android installation. iOS source, simulator compilation and physical iPhone signing/testing are separate; an Android APK cannot run on iOS.

## Verification

Host checks cover TypeScript, locale completeness/placeholders, **135 JavaScript behavior tests**, Rust formatting/Clippy and 17 Rust tests. Mobile JavaScript exports are required for both platforms; they do not compile an installable iOS app. Audio integrity tests check that native configuration and the voice picker list exactly the same eight files, match output hashes, and keep iOS excerpts at 29 seconds in supported PCM format.

The actual React Native components were exercised through React Native Web with mocked native services. Forty repeat-sheet combinations (five themes × light/dark × Arabic/English × default/1.45× text) keep the start label visible and its button within the phone viewport; minimum measured text contrast was 10.33:1. Twenty simulated native playback-clock updates caused zero additional shell or control renders; the time label updated on every tick and a playback-state change still updated controls. An unvisited screen did not mount, mounted once on first activation, and did not remount when revisited. These are component behavior checks, not physical iPhone performance measurements.

Native simulator compilation/UI results belong to the macOS GitHub workflow for this branch. This Linux host has no Xcode, and device access is disabled. Native-driver motion, iPhone notification sound quality/delivery, hardware performance, GPS/compass and background/lock-screen behavior require native/physical-device checks. Existing historical iOS book-name and full-download test failures are not claimed fixed here. The updated suite adds testing-language gating and repeat-control checks.

## Android build and artifact verification

All three release APKs compile successfully on Linux with JDK 17, Android SDK 36 and NDK 27.1.12297006. The initial parallel build was interrupted during shrinking; the successful retry used one worker, a 2 GiB Gradle heap and parallel execution disabled. No application code changed during the release packaging follow-up.

Each APK passes signature verification against the published 0.5.2 certificate, package/version checks (0.5.3 / code 22), ZIP integrity and 16 KB ZIP/ELF LOAD alignment checks. The packaged Hermes bundle matches the generated release bundle, both Rust libraries match their freshly built/stripped inputs, and every APK retains all 604 exact offline Quran pages and the four configured full Adhan recordings. No iOS WAV excerpts or unsupported 32-bit ABIs are included. ARM64 is about 2.84 MiB smaller than 0.5.2.

No Android device is attached, so native runtime, physical-phone notification playback, sensors and upgrade behavior for this revision remain unverified. The [macOS simulator build and UI run](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/38797897881) tracks iOS separately; iPhone signing/testing remains pending.

## Downloads

- **arm64-v8a: 92.84 MiB** (97,350,765 bytes), `quran-adhan-qibla-v0.5.3-arm64-v8a.apk`.
- **x86_64: 92.94 MiB** (97,457,454 bytes), `quran-adhan-qibla-v0.5.3-x86_64.apk`.
- **arm64-v8a, x86_64: 98.59 MiB** (103,382,786 bytes), `quran-adhan-qibla-v0.5.3.apk`.
- Tracked source: `quran-adhan-qibla-v0.5.3-source.zip`.
- SHA-256 checksums: `quran-adhan-qibla-v0.5.3-SHA256SUMS.txt`.
