# Roadmap

## Foundation

- [x] React Native / Expo TypeScript starter for iOS and Android.
- [x] Arabic/English shell with Quran, Adhan, and Qibla tabs.
- [x] Rust Qibla calculation, validation, reference tests, and C ABI.
- [x] Swift/Kotlin bridge source and native build scripts.
- [x] Open-source license and automated host/bundle checks.
- [x] Compile an Android APK containing ARM64/x86_64 Rust libraries and bundled JavaScript.
- [x] Verify the Android Rust bridge on an API 36 emulator.
- [ ] Compile the iOS native app and verify its Rust bridge on a device or simulator.
- [ ] Check RTL, accessibility, and large text on real devices.
- [ ] Resolve inherited Expo/Metro/Xcode dependency audit advisories as compatible upstream fixes become available.

## Quran reader

- [x] Choose a verified Arabic text dataset and record license/version/checksum.
- [x] Import all 114 surahs with verse identifiers and offline storage.
- [x] Build the reader, font-size controls, bookmarks, and last-read page.
- [x] Add verse search and selectable source-hosted recitations with private offline downloads.
- [ ] Select licensed translations and tafsir.
- [ ] Verify Quran audio interruptions and lock-screen behavior on physical Android/iOS devices.

## Prayer times and Adhan

- [x] Select and validate the `adhaan` Rust prayer-time engine.
- [x] Make foreground device location primary, with optional manual coordinates and six-hour refresh.
- [x] Add offline city search (70/30 country targets), online map selection, and manual coordinate alternatives.
- [ ] Persist location and preferences across app sessions.
- [x] Use the phone’s calendar/timezone/DST, six calculation methods, Asr school, and optional Ramadan Isha.
- [ ] Add configurable high-latitude and polar rules (currently middle-of-night below 65°, polar locations unsupported).
- [x] Check Makkah and London reference schedules, winter/summer DST, and explicit polar rejection.
- [ ] Expand prayer reference fixtures across more regions and boundary conditions.
- [ ] Add local reminders and licensed Adhan audio within iOS/Android OS limits.
- [ ] Reschedule reminders after time, timezone, location, and preference changes.

## Qibla and release

- [x] Add an illustrated camera-style direction view without camera permission.
- [x] Keep main screens compact, with swipe navigation and tabs that hide after inactivity.
- [x] Add device heading, true/magnetic north handling, and calibration guidance.
- [ ] Verify live compass accuracy and sensor lifecycle on physical Android/iOS devices.
- [x] Allow optional manual location entry without requiring GPS permission.
- [ ] Replace template app icons and complete platform branding.
- [ ] Add offline persistence, data attribution, and a privacy description matching actual behavior.
- [ ] Test battery/background behavior, device builds, and store distribution.
