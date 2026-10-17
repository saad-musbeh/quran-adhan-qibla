# Roadmap

## Foundation

- [x] React Native / Expo TypeScript starter for iOS and Android.
- [x] Arabic/English default menu and 38 opt-in testing languages with Quran, Adhan, and Qibla tabs.
- [ ] Native-speaker review of the 38 UI translation drafts.
- [x] Rust Qibla calculation, validation, reference tests, and C ABI.
- [x] Swift/Kotlin bridge source and native build scripts.
- [x] Open-source license and automated host/bundle checks.
- [x] Compile an Android APK containing ARM64/x86_64 Rust libraries and bundled JavaScript.
- [x] Verify the Android Rust bridge on an API 36 emulator.
- [x] Compile and package a bundled Release iOS simulator app on macOS with the Rust XCFramework.
- [x] Verify iOS Rust prayer calculations through simulator notification scheduling, and check saved audio inventory and tab changes.
- [ ] Complete iOS book-name/relaunch and full-download runtime checks; native playback and tab transitions passed in 0.4.1.
- [ ] Check RTL, accessibility, and large text on real devices.
- [ ] Resolve inherited Expo/Metro/Xcode dependency audit advisories as compatible upstream fixes become available.

## Quran reader

- [x] Choose a verified Arabic text dataset and record license/version/checksum.
- [x] Import all 114 surahs with verse identifiers and offline storage.
- [x] Build the reader, font-size controls, bookmarks, and one initial reading copy with additions up to six independently saved copies.
- [x] Add verse search and selectable source-hosted recitations with private offline downloads.
- [x] Add an optional four-book QuranEnc tafsir library with release checks and private, atomic offline downloads; keep tafsir text out of the runtime bundle.
- [x] Keep Quran source path and verse data unchanged while centering all 604 pages at equal 6% artwork margins and cropping only the empty opening-page viewBoxes.
- [x] Add the original geometric opening frame and theme-aware reader frame/metadata/controls; persist the five app-wide color themes and their light/dark variants through the top gear sheet.
- [x] Add immediate same-surah looping from a long-pressed ayah, an optional ending-ayah review editor, direct start/end selection on the page, and native playlist loop-all playback.
- [x] Verify the 0.3.3 reader themes, opening pages, ayah loop selection, offline native queue transitions, and foreground playback on the Android emulator. See [reader QA](READER-COMPASS-QA.md); physical-device and native iOS checks remain pending.
- [x] Expand to twenty reciters with Al-Husary as the fresh default, preserving saved choices and separate per-voice offline storage.
- [x] Add a saved audio/tafsir download manager and playback failure/reconnection recovery.
- [x] Add full-Quran downloads with cancellation, cached-ayah continuation and job-specific retry.
- [x] Keep library navigation visible, merge global settings and add original floral opening-page frames.
- [x] Put shared light/dark appearance in the banner, simplify reader tools, enlarge search, and enter page/juz numbers inline.
- [x] Keep landscape pages, turns, zoom and panning together in one book spread.
Quran verse translations are permanently out of scope and will not be added.
- [x] Add complete-surah recordings for continuous main-button playback and optional offline downloads; reset surah-end behavior to Stop each app session.
- [ ] Confirm continuous full-surah playback, natural pauses and stopping on the reporting physical phone.
- [ ] Verify Quran audio interruptions and lock-screen behavior on physical Android/iOS devices.

## Prayer times and Adhan

- [x] Select and validate the `adhaan` Rust prayer-time engine.
- [x] Make foreground device location primary, with optional manual coordinates and six-hour refresh.
- [x] Add worldwide offline city search (all eligible GeoNames cities500 places), online map selection, and manual coordinate alternatives.
- [x] Persist validated location and preferences across app sessions.
- [x] Use the phone’s calendar/timezone/DST, six calculation methods, Asr school, and optional Ramadan Isha.
- [x] Add configurable middle/seventh/angle twilight rules and an explicit nearest-usable-latitude polar approximation, shared by schedules and alerts.
- [x] Check Makkah and London reference schedules, winter/summer DST, and explicit polar rejection.
- [ ] Expand prayer reference fixtures across more regions and boundary conditions.
- [x] Add optional Android prayer notifications with a CC0 Adhan channel sound, permission recovery and a test alert.
- [x] Add local iOS prayer notifications, a 29-second Adhan excerpt, permission recovery and a five-second test.
- [x] Bundle four cleaned licensed Adhan recordings (Makkah, Al-Madinah, Andrewler and Original) and saved voice/sound choices for each salah.
- [x] Show tomorrow’s separately calculated Fajr as the next Adhan after Isha, on the right in landscape.
- [x] Show a minute-updated countdown for each salah’s next actual occurrence, including tomorrow, only while visible and foregrounded.
- [x] Display offline city/approximate-nearby labels and an accessible location picker action on Adhan.
- [x] User reports completing the 0.5.1 real-phone notification follow-up checks.
- [ ] Expand physical-phone Focus/Silent Mode and interruption testing on both platforms.
- [x] Reconcile Android/iOS reminders at launch/resume, midnight, and location/settings/language changes.
- [ ] Validate background clock/timezone changes and reboot restoration on physical phones.

## Qibla and release

- [x] Add a circular compass direction guide, live/fixed mode controls and a shared Adhan/Qibla location strip without camera permission.
- [x] Interpolate compass rotation on the native animation driver, using the shortest turn across north and respecting Reduce Motion.
- [x] Keep main screens compact, with swipe navigation and tabs that hide after inactivity.
- [x] Add device heading, true/magnetic north handling, and calibration guidance.
- [x] User reports completing 0.5.1 real-phone compass/GPS follow-up checks; device details/logs were not recorded.
- [ ] Verify the new animated compass on physical devices and complete native iOS checks.
- [x] Allow optional manual location entry without requiring GPS permission.
- [x] Create and configure the Android Quran/direction launcher and notification icons.
- [x] Use the Quran/direction launcher icon on iOS.
- [x] Persist selected location/preferences, show data attribution in Credits, and document actual local storage, permissions and optional network services in Settings → Privacy.
- [ ] Test battery/background behavior, device builds, and store distribution.

## Adhkar and reminders — 0.6.0

- [x] Add a fourth main tab with three fixed, offline Arabic حصن المسلم collections and references on demand.
- [x] Add optional الصلاة على النبي reminders at user-chosen times, and separate morning/evening reminders.
- [x] Put counters, single-entry reading, alternate notification styles, intervals and prayer-linked schedules in testing settings.
- [x] Add a licensed temporary Short Adhan default with a Fajr-specific excerpt, preserving existing full voices and saved choices.
- [x] Add Stop / Next surah / Repeat surah choices in the Quran reader and Android next-file preloading.
- [ ] Obtain verified redistribution permission for the selected Nayef/Farooq recordings.
- [ ] Verify 0.6.0 Android playback improvements and reminder audio on physical phones, including OnePlus.
- [ ] Review new labels in the 38 opt-in testing interface languages.
