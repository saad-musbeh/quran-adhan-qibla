# Roadmap

## Foundation

- [x] React Native / Expo TypeScript starter for iOS and Android.
- [x] Arabic/English shell with Quran, Adhan, and Qibla tabs.
- [x] Rust Qibla calculation, validation, reference tests, and C ABI.
- [x] Swift/Kotlin bridge source and native build scripts.
- [x] Open-source license and automated host/bundle checks.
- [x] Compile an Android APK containing ARM64/x86_64 Rust libraries and bundled JavaScript.
- [ ] Verify the Android Rust bridge on a device or emulator.
- [ ] Compile the iOS native app and verify its Rust bridge on a device or simulator.
- [ ] Check RTL, accessibility, and large text on real devices.
- [ ] Resolve inherited Expo/Metro/Xcode dependency audit advisories as compatible upstream fixes become available.

## Quran reader

- [ ] Choose a verified Arabic text dataset and record license/version/checksum.
- [ ] Import all 114 surahs with verse identifiers and offline storage.
- [ ] Build the reader, font-size controls, bookmarks, and last-read position.
- [ ] Add search; choose licensed translations and recitations separately.

## Prayer times and Adhan

- [ ] Select and validate a Rust prayer-time engine.
- [ ] Add manual city selection and optional foreground device location.
- [ ] Add timezone/DST handling, calculation method, Asr school, and high-latitude settings.
- [ ] Verify reference schedules across locations, seasons, and polar conditions.
- [ ] Add local reminders and licensed Adhan audio within iOS/Android OS limits.
- [ ] Reschedule reminders after time, timezone, location, and preference changes.

## Qibla and release

- [ ] Add device heading, true/magnetic north handling, and calibration guidance.
- [ ] Allow location entry without requiring GPS permission.
- [ ] Replace template app icons and complete platform branding.
- [ ] Add offline persistence, data attribution, and a privacy description matching actual behavior.
- [ ] Test battery/background behavior, device builds, and store distribution.
