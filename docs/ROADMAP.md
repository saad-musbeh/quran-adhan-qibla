# Roadmap

## Foundation

- [x] React Native / Expo TypeScript starter for iOS and Android.
- [x] Arabic default and searchable 35-language menu/settings shell with Quran, Adhan, and Qibla tabs.
- [ ] Native-speaker review of the 33 new UI translations.
- [x] Rust Qibla calculation, validation, reference tests, and C ABI.
- [x] Swift/Kotlin bridge source and native build scripts.
- [x] Open-source license and automated host/bundle checks.
- [x] Compile an Android APK containing ARM64/x86_64 Rust libraries and bundled JavaScript.
- [x] Verify the Android Rust bridge on an API 36 emulator.
- [x] Compile and package a bundled Release iOS simulator app on macOS with the Rust XCFramework.
- [x] Verify iOS Rust prayer calculations through simulator notification scheduling, and check saved audio inventory and tab changes.
- [ ] Complete the iOS reader/audio runtime checks after correcting the tafsir locale startup crash.
- [ ] Check RTL, accessibility, and large text on real devices.
- [ ] Resolve inherited Expo/Metro/Xcode dependency audit advisories as compatible upstream fixes become available.

## Quran reader

- [x] Choose a verified Arabic text dataset and record license/version/checksum.
- [x] Import all 114 surahs with verse identifiers and offline storage.
- [x] Build the reader, font-size controls, bookmarks, and six independently saved reading copies.
- [x] Add verse search and selectable source-hosted recitations with private offline downloads.
- [x] Add an optional four-book QuranEnc tafsir library with release checks and private, atomic offline downloads; keep tafsir text out of the runtime bundle.
- [x] Keep Quran source path and verse data unchanged while centering all 604 pages at equal 12.75% artwork margins and cropping only the empty opening-page viewBoxes.
- [x] Add the original geometric opening frame and theme-aware reader frame/metadata/controls; persist the five app-wide color themes through the top gear sheet.
- [x] Add immediate same-surah looping from a long-pressed ayah, an optional ending-ayah review editor, direct start/end selection on the page, and native playlist loop-all playback.
- [x] Verify the 0.3.3 reader themes, opening pages, ayah loop selection, offline native queue transitions, and foreground playback on the Android emulator. See [reader QA](READER-COMPASS-QA.md); physical-device and native iOS checks remain pending.
- [x] Expand to twenty reciters with Saad Al-Ghamdi as the default and separate per-voice offline storage.
- [x] Add a saved audio/tafsir download manager and playback failure/reconnection recovery.
- [x] Add full-Quran downloads with cancellation, cached-ayah continuation and job-specific retry.
- [x] Keep library navigation visible, merge global settings and add original floral opening-page frames.
- [ ] Select licensed translations.
- [ ] Verify Quran audio interruptions and lock-screen behavior on physical Android/iOS devices.

## Prayer times and Adhan

- [x] Select and validate the `adhaan` Rust prayer-time engine.
- [x] Make foreground device location primary, with optional manual coordinates and six-hour refresh.
- [x] Add offline city search (70/30 country targets), online map selection, and manual coordinate alternatives.
- [x] Persist validated location and preferences across app sessions.
- [x] Use the phone’s calendar/timezone/DST, six calculation methods, Asr school, and optional Ramadan Isha.
- [ ] Add configurable high-latitude and polar rules (currently middle-of-night below 65°, polar locations unsupported).
- [x] Check Makkah and London reference schedules, winter/summer DST, and explicit polar rejection.
- [ ] Expand prayer reference fixtures across more regions and boundary conditions.
- [x] Add optional Android prayer notifications with a CC0 Adhan channel sound, permission recovery and a test alert.
- [x] Add local iOS prayer notifications, a 29-second Adhan excerpt, permission recovery and a five-second test.
- [ ] Validate prayer alert sound, Focus/Silent Mode and interruptions on physical phones.
- [x] Reconcile Android/iOS reminders at launch/resume, midnight, and location/settings/language changes.
- [ ] Validate background clock/timezone changes and reboot restoration on physical phones.

## Qibla and release

- [x] Add an illustrated camera-style direction view without camera permission.
- [x] Keep main screens compact, with swipe navigation and tabs that hide after inactivity.
- [x] Add device heading, true/magnetic north handling, and calibration guidance.
- [ ] Verify live compass accuracy and sensor lifecycle on physical Android/iOS devices.
- [x] Allow optional manual location entry without requiring GPS permission.
- [x] Create and configure the Android Quran/direction launcher and notification icons.
- [x] Use the Quran/direction launcher icon on iOS.
- [ ] Add offline persistence, data attribution, and a privacy description matching actual behavior.
- [ ] Test battery/background behavior, device builds, and store distribution.
