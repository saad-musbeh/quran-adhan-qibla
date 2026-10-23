# Quran · Adhan · Qibla

**قرآن · أذان · قبلة** — an open-source app for iOS and Android, built with React Native, TypeScript, Expo, and a shared Rust core.

This app includes an offline Arabic Quran reader with verse audio, Arabic/English menus and 38 optional testing languages, saved foreground location, shared Rust calculations for Qibla and today’s prayer times, and optional local prayer notifications on Android and iOS with bundled Adhan sounds.

## What is ready

- **0.6.5:** protects saved books/settings after failed reads, fixes stale audio queues and partial-download cleanup, stops Android audio on task removal, retries failed location fixes, and cancels pending test alerts when Adhan is disabled. The iOS follow-up fixes and seven passing simulator UI tests are merged into `main`; physical-device checks remain open. See [release notes and verification limits](docs/RELEASE-0.6.5.md).
- **0.6.4:** main Play starts one complete surah recording, removing per-ayah file transitions; offline downloads include that full recording alongside ayah files. Surah-end behavior starts at Stop each app session. All twenty Al-Fatiha sources received a machine-assisted review; source-specific ends address closing responses in five full recordings and Shuraym’s final-ayah file, including offline and repeated playback. Physical-phone confirmation remains pending. See [verification and limitations](docs/RELEASE-0.6.4.md).
- **0.6.2:** updates Android's native audio libraries to Media3 1.9.3 for MP3 queue and audio-output fixes, with regression coverage across Al-Ikhlas, Al-Falaq and An-Nas. See [release notes](docs/RELEASE-0.6.2.md) for verification limits. iOS device testing is deferred.
- **0.6.1:** adds the complete **دعاء ختم القرآن** after page 604, with stable Arabic lettering and clear row spacing, and fixes Android text clipping across the app. Salawat reminders gain recorded phrase choices and daytime repeat controls; reminder reconciliation and native audio cleanup are hardened. See [release notes](docs/RELEASE-0.6.1.md).
- **0.6.0:** a fourth **أذكار وأدعية / Adhkar & dua** tab with 54 offline Arabic entries from حصن المسلم, in three fixed collections. Scrolling is the default; source references open on demand. Optional الصلاة على النبي reminders offer a daytime repeat window, selectable recorded speech and retained chosen times, and morning/evening reminders open their collections. Counters, single-entry reading, other notification styles and scheduling experiments are under Extra testing settings. See [sources and behavior](docs/ADHKAR.md).
- Quran playback stops at the current surah's end by default. The reader's player also offers Next surah and Repeat surah for the current session. Full-surah playback uses one recording; ayah loops keep native next-file preloading. Recorded pauses remain. Physical-phone listening still needs follow-up.

- Arabic by default, with Arabic and English in the language menu. Settings → Extra testing settings → Show testing languages reveals the other 38 native-name choices; layouts follow the selected language. The 38 menu/settings translations include the newer home, downloads, Credits and tafsir controls; they are machine-assisted drafts awaiting native-speaker review (see [localization](docs/LOCALIZATION.md)); Quran text and surah names remain Arabic.
- Quran library tabs stay visible; Adhan/Qibla tabs hide after inactivity. In Quran reading, the top language/appearance/settings banner and bottom audio controls stay visible. Tap the page to reveal reading tools; swipe the page to turn Mushaf pages, then return to the library to switch app sections.
- New installs open the Home page on phones and tablets. Phones with the Home option disabled open Adhan; startup never opens the Quran reader. Landscape layouts use responsive book grids, a two-page tablet Mushaf with shared page turns and zoom, and scrolling prayer/Qibla views when needed. Location choices and settings open separately.
- A persistent compact top row with Home, language, appearance, and settings icons, including during Quran reading. Home closes the reader without losing its saved position. Reading, audio, prayer, and compass preferences share one settings page. Reciter and calculation-method choices expand on demand; playback speed and loop editing stay in the player/reader.
- A circular Qibla compass with a prominent bearing, compact live/fixed controls, and a shared location strip. Light and dark palettes keep the dial, guidance and selected navigation visible. It requires no camera access. Poor sensor readings show calibration guidance and a clearly labelled fixed fallback.
- All 114 surahs / 6,236 verses bundled offline from Tanzil, alongside 604 offline Mushaf vector pages and two closing khatm dua sheets after the last page, transcribed from the supplied reference photos. Pages fit on screen at the default text size; enlarged pages support panning and page turns from their edges. See [Quran text provenance](docs/QURAN-DATA.md).
- Surah/Juz/page navigation, text search, page and verse bookmarks, last page, app-wide text size, and night reading. Settings → App text size scales Quran pages, tafsir, prayer times, Qibla labels, menus and text inputs immediately; the saved choice survives restarts, and Default restores the original size. Long-press a verse to open its actions, then choose a published tafsir edition for private offline download. Arabic books remain visible in all languages; matching translated tafsirs appear first. See [tafsir sources](docs/TAFSIR.md). App colors can be changed from **App color / لون التطبيق** in the top gear sheet on any tab. Green, maroon, blue, black and brown each have saved Light and Dark appearance choices for the library, prayer times, Qibla scene and settings. The banner’s sun/moon button changes appearance for the entire app, including Quran pages.
- The Quran tab starts with one reading copy; **Add Quran / إضافة مصحف** adds copies up to six. Existing saved copies are retained. Each starts at Al-Fatiha and saves its own page and bookmarks. Open a book to read; return to the library to switch to Adhan or Qibla. Tap the page to reveal reading tools. Original printed calligraphy and line breaks are preserved, with the artwork centered at equal 6% margins, Arabic verse numbers, bookmarks and audio highlighting. The opening pages use tight crops based on their existing vector paths and an original green-and-rose floral frame with gilt borders and an oval paper field. The frame, page metadata and controls follow the selected theme; night mode retains its dark page and light text. Enter page and juz numbers directly in the reading tools, without opening another screen; invalid entries do not change the page. Enlarged reading still supports panning.
- Verse highlighting, twenty reciters (Mahmoud Khalil Al-Husary by default; saved reciter choices are retained), pitch-preserving playback speeds, labelled previous/replay/play-pause/next/stop controls and a microphone-labelled reciter selector that opens voice choices, same-surah ayah loops, and optional surah or whole-Quran downloads. Whole-Quran downloads cover all 114 surahs for the selected voice, can be cancelled and resume by skipping saved ayahs; keep the app open. Long-press an ayah and choose **Start loop here** to begin immediately through the end of that surah; choose an ending ayah on the page to open the range editor with that endpoint selected. Main Play uses one full-surah recording; individual ayah playback and loops use native queues. Natural recorded pauses remain and network buffering is still possible. See [audio behavior and sources](docs/QURAN-AUDIO.md).
- Offline Rust Qibla bearing calculation with coordinate validation and tests.
- Device location is the primary action on both Qibla and Adhan, with a shared location and permission recovery.
- Secondary location choices are ordered: offline city search, online map selection, then optional manual coordinates (including Arabic/Persian digits).
- The offline catalogue contains 224,763 places across 245 countries and territories, including countries with minority Muslim populations. There are no country quotas; all eligible independent places from GeoNames cities500 are searchable. Coverage, source thresholds, and provenance are in [CITY-DATA.md](docs/CITY-DATA.md).
- Optional OpenStreetMap selection previews a point and requires confirmation; it needs internet access, displays attribution, and has an offline failure path.
- Today’s Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha, with method and Asr settings, calculated by Rust using `adhaan` 0.3.0. The next Adhan panel appears on the right in landscape and uses a separately calculated tomorrow Fajr after Isha. Each salah shows the remaining hours/minutes until its next actual occurrence, including Asr during the morning; elapsed prayers show tomorrow’s date/time explicitly. Countdowns refresh by the minute only while Adhan is visible and foregrounded.
- iOS C ABI/XCFramework and Android JNI bridge source and build scripts.
- MIT license, contribution guide, roadmap, and CI checks.

Quran playback is separate from Adhan. In the **Adhan alerts** section of the unified settings page, enable **Play Adhan at prayer times**, allow notifications, and on Android grant **Alarms and reminders** access for exact scheduling. Each salah has its own voice and Adhan switch; switching sound off keeps a silent reminder. Short Adhan is the fresh default, with its Fajr phrase selected automatically. Makkah, Al-Madinah, Andrewler and Original full recordings remain available, and saved choices are retained. The licensed temporary short voice is credited in Settings → Credits; the preferred new voices remain pending permission. The master switch turns all alerts off. The test button schedules the chosen prayer’s alert in five seconds. Remaining prayers today and the following seven dates are scheduled locally; open the app at least weekly to refresh them. Frequent Salawat reminders shorten the iOS Adhan horizon to fit the system notification limit; open the app daily when using them. Android controls notification volume, Do Not Disturb and sound duration. iOS uses a 29-second excerpt and follows notification sound, Silent Mode and Focus settings. See [prayer notification behavior](docs/PRAYER-NOTIFICATIONS.md) and [recording provenance](assets/adhan/PROVENANCE.md). The Qibla bearing is clockwise from **true north**. Live mode rotates the scene relative to a reliable phone heading; fixed mode keeps north at the top.

## Location and prayer times

Open Qibla or Adhan, tap **Use my location**, and allow foreground access in the system prompt. Approximate access is accepted. Android uses system GPS/network providers without requiring Google Play Services; iOS uses its native Expo provider. A single foreground fix supplies both screens; there is no continuous location watch, background permission, or background location service. Device location is reused for six hours and refreshed only while the app is active and location screens, the location picker or enabled prayer alerts need it. Refresh sooner after travelling. The Adhan screen displays a prominent location label that opens the picker when tapped. Chosen cities keep their exact sourced name. Device/map/manual coordinates use an explicitly approximate **Near / بالقرب من** label for a catalogue settlement within 50 km; locations farther away show coordinates. This lookup is offline and does not identify administrative boundaries or add network geocoding. The **location strip on Adhan or Qibla** opens device refresh and all three secondary choices together; city, map point, and manual coordinates each require confirmation and stop automatic device-location refresh.

The Qibla dial is a direction guide. Live mode follows the phone’s heading while the Qibla page is visible; keep the phone flat and away from magnetic objects. Select the fixed true-north view on the Qibla page or in the top gear sheet to keep north at the top. See [compass behavior](docs/COMPASS.md). Swipe between tabs, or reveal the compact bottom navigation using its handle. In Quran reading, tap the page to reveal tools. Drag up or right for the next page, down or left for the previous page. The artwork follows your finger; releasing beyond the deliberate-swipe threshold advances, while a shorter drag returns to the current page. Use the top Home button or return to the library to switch app sections. Page buttons and the Android Back button also remain available. Long-press a verse to open its play, tafsir, verse-bookmark, and loop actions. **Start loop here** immediately starts the selected ayah through the end of its surah. To choose a shorter range, select an ending ayah on the page or use the range sheet’s **Choose ayahs on the page** action to tap its start and end. The range sheet can also set a same-surah range directly. Selected ranges advance and loop through the native ayah queue; main Play starts one full-surah recording. Natural pauses remain in the source recordings and network buffering can occur. The tafsir catalogue contains 36 sourced editions: 11 Arabic books and 25 published non-Arabic editions. Arabic books remain visible in every UI language, with matching published tafsirs shown first. Its catalogue distinguishes composition, print-edition and digital source dates without inventing undocumented first-print dates. Each book is optional: download it over the network for private offline use, select an installed edition, or remove its saved copy. Downloads validate source identity and edition-specific integrity and coverage before saving; source gaps and grouped passages retain their documented handling without invented commentary. See [tafsir sources and validation](docs/TAFSIR.md). No tafsir text is included in the runtime bundle.

Permission denial, a blocked permission, disabled location services, and a 30-second position timeout have recovery messages. Automatic refresh never prompts for permission. Chosen coordinates, source, label, accuracy and update time are saved in app-private local storage; reading, audio, and app preferences are saved locally. Qibla and prayer calculations do not upload coordinates, and the app adds no analytics. City search and manual entry are offline. The optional map sends tile requests (IP address and viewed area) to OpenStreetMap; see [MAP-PICKER.md](docs/MAP-PICKER.md). OS location services may use network assistance.

The default method is **Umm al-Qura (Makkah)** with standard Asr. Settings also offer Muslim World League, ISNA, Egyptian, Karachi, and Moonsighting Committee methods, plus Hanafi Asr. Umm al-Qura uses Isha 90 minutes after Maghrib; the optional Ramadan setting changes it to 120 minutes. Ramadan is selected by the user, not inferred from an unverified calendar.

The Rust engine receives the phone’s current Gregorian calendar date and returns UTC timestamps. The UI displays those timestamps in the phone’s timezone, including its DST rules. Check that timezone after travel. The schedule updates at local midnight, when returning to the app, and on location or setting changes. Next-prayer highlighting changes at prayer boundaries; sunrise is never labelled a prayer. Clock housekeeping runs hourly and does not read GPS.

Settings offers middle-of-the-night, one-seventh-of-the-night and twilight-angle rules, alongside method-specific adjustments (including Moonsighting’s seasonal twilight rules and fixed Isha intervals). Existing preferences keep middle-of-the-night. At or beyond 65°, calculation requires explicitly enabling **Nearest usable latitude** under **Polar day and night**. If sunrise/sunset are missing, the engine keeps the longitude and date and searches towards the equator. The Adhan screen labels the selected rule and polar approximation. See [high-latitude calculation behavior](docs/HIGH-LATITUDE.md). Local mosque timetables may use different methods or adjustments.

## Quick preview

Use Node.js 22 LTS and npm. From the repository root:

```sh
npm ci
npm run preview
```

Open the app in the compatible Expo Go version. Expo Go previews the UI but does not contain this project's Rust native module: Qibla and prayer calculations are unavailable there. Use a native development build below for both Rust features.

## Android development build

Install Rust through [rustup](https://rustup.rs/), Android Studio or the [Android command-line tools](https://developer.android.com/studio), and JDK 17. Set `JAVA_HOME` to your JDK 17 installation; Java 25 causes the Android native configuration step to fail with the current toolchain. The current project uses Android SDK 36, Build Tools 36.0.0, NDK 27.1.12297006, and CMake 3.22.1. Make sure `cargo` is on your PATH.

For a Linux SDK installed at the usual location, configure your terminal before building:

```sh
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/27.1.12297006"
export PATH="$HOME/.cargo/bin:$ANDROID_HOME/platform-tools:$PATH"
```

```sh
rustup target add aarch64-linux-android x86_64-linux-android
cargo install cargo-ndk --locked
npm ci
npm run android
```

The command builds Rust for ARM64 devices and x86_64 emulators, then generates and builds the Android app. Expo's build-properties plugin limits the app to these same two ABIs so it always includes the Rust library. Set `ANDROID_NDK_HOME` if cargo-ndk cannot find your NDK.

To create standalone release APKs without a connected device or running development server:

```sh
npm run apk:android
```

This refreshes Rust, regenerates the Android project, forces a fresh JavaScript/asset bundle, and builds APKs with R8 code/resource shrinking and compressed JavaScript/native libraries. It writes three APKs to `dist/android/`: `app-arm64-v8a-release.apk` for ARM64 phones, `app-x86_64-release.apk` for x86_64 devices/emulators, and `app-universal-release.apk` containing both. Use the matching architecture APK for the smallest download. All 604 Quran pages, the worldwide city catalogue, five Android Adhan voice choices (including Short Adhan’s Fajr variant) and devotional reminder sounds remain offline. iOS WAV excerpts are packaged only on iOS.

The APKs use Expo's generated debug signing key for local testing. Configure your own release signing before store distribution. An Android App Bundle for store distribution can be built with `NODE_ENV=production ./gradlew :app:bundleRelease --max-workers=2` from `android/`; Google Play delivers the matching architecture.

Audit an APK's actual packaged bytes and verify all offline pages and sounds survived resource shrinking:

```sh
python3 scripts/apk-size.py dist/android/app-arm64-v8a-release.apk
```

See [Android APK size and validation](docs/ANDROID-SIZE.md) for measured before/after sizes and verification limits.

## iOS development build

Use macOS with Xcode 26.4+ and CocoaPods, plus Rust and Node.js 22 on your PATH.
Use `main` for the current 0.6.5 / build 28 source, including the merged iOS test-harness and foreground-download fixes. This includes continuous-surah playback and native, source-specific ending limits; iOS device listening remains unverified. The friend’s original 0.3.6 baseline remains on `codex/reader-polish`. See [the Mac/iPhone testing guide](docs/IOS-TESTING.md) for setup, signing, standalone builds and checks for a tester.

```sh
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
npm ci
npm run ios
```

The command builds Rust for iOS devices and both simulator architectures, creates the XCFramework, then generates and builds the iOS app. The initial bundle identifiers are `org.saadmusbeh.quranadhanqibla`; adjust them before distribution.

## Checks

```sh
npm run check
npm run export:mobile
```

`check` runs dependency-security regressions, TypeScript, the localization audit, JavaScript domain and hook behavior tests, iOS test-harness regressions, Rust formatting/Clippy, and Rust tests. Hook tests use React’s test renderer with stubbed native modules; they do not establish native runtime behavior. Reference schedules cover Makkah, London, Sydney and Santiago, including northern/southern hemisphere DST cases; bridge validation rejects invalid dates, invalid flag combinations, polar locations without an opted-in approximation, and incomplete schedules. The export builds the JavaScript bundles for both mobile platforms; it does **not** compile Swift, Kotlin, or an installable app. Host checks cover the Rust core and C ABI.

Android test APKs were compiled on Linux with JDK 17. The 0.3.3 reader/audio checks and 0.3.4 icon, language menu, persistence and Android Adhan notification checks are recorded in [READER-COMPASS-QA.md](docs/READER-COMPASS-QA.md), alongside earlier compass and reader results. The [macOS Release simulator build passed on 12 October 2026](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/38219756885), including the Rust XCFramework and bundled Quran assets. The [0.6.5 follow-up iOS simulator run](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/39385030692) passes all seven UI tests, including book-name/relaunch, iPad landscape page turns, repeated tab transitions, language/reminder checks, native playback and whole-Quran download start/cancel. See [iOS testing status](docs/IOS-TESTING.md). The 0.4.2 Android reader crash fix was reproduced and checked on an API 36 emulator. The 0.4.8 city-catalogue startup fix reproduces the released 0.4.7 crash and passes Android cold-start, upgrade, city-search, saved-preference and prayer-countdown checks; details are in [the release notes](docs/RELEASE-0.4.8.md). The 0.5.0 size reduction keeps all offline pages and sounds and passes direct Android upgrades from 0.4.5, 0.4.6 and 0.4.8; see [the 0.5.0 release notes](docs/RELEASE-0.5.0.md). Current physical-device audio, notification and compass follow-up remains open; the user-reported 0.5.1 checks below apply to that earlier version.

The 0.5.1 five-language addition and circular Qibla redesign pass host checks, mobile exports and Android release builds; [redesign QA](docs/QIBLA-REDESIGN-QA.md) records layout checks and the emulator startup failure that prevents native runtime verification on this machine. The translation drafts need native-speaker review. The user reports completing the 0.5.1 real-phone follow-up checks (upgrades, saved data, compass/GPS and notifications); device details and logs were not recorded here.

The 0.6.0 Adhkar & dua tab, salawat and morning/evening reminders, Short Adhan and end-of-surah playback stop have their `npm run check`, export and verification results recorded in [the 0.6.0 release notes](docs/RELEASE-0.6.0.md), including the Android code 23 / iOS build 23 artifacts and the checks still owed on physical devices. The Android text-clipping correction behind those layouts is documented with its Robolectric text-manager tests and browser layout harness in [TEXT-LAYOUT-QA.md](docs/TEXT-LAYOUT-QA.md); the reporting-device recheck and local emulator native runtime remain open there.

The dependency security follow-up (21 October 2026) updates Xcode tooling's `uuid` dependency to patched 11.1.1 and applies source-verified install-time patches for the unpublished `braces` nesting and `node-forge` RSA validation fixes. `npm run check` includes security regressions. The remaining upstream audit warnings stay visible until patched releases are published; see [dependency security](docs/DEPENDENCY-SECURITY.md) for scope, verification and removal conditions. Run `npm ci` with install scripts enabled so both these patches and the existing Expo Audio patch are applied.

## Layout

```text
App.tsx                         Mobile shell and shared calculation state
src/components/                 Screens, swipe tabs, location sheet, map picker
src/i18n.ts, src/locales/        Menu/settings translations and language metadata
src/domain/                     Coordinates, permissions, schedules, and tests
src/use-location.ts             Foreground device access and six-hour refresh
crates/islamic-core/             Rust calculation and C header
modules/islamic-core/            Expo module: TypeScript, Swift, Kotlin
scripts/build-native.mjs         Android libraries / iOS XCFramework
docs/ROADMAP.md                  Next development milestones
.github/workflows/ci.yml         TypeScript, Rust, and bundle checks
```

Expo generates root `android/` and `ios/` projects when needed. They, Rust build outputs, and compiled bridge binaries are ignored by Git. Maintain native bridge source under `modules/`.

## Next work

See [the roadmap](docs/ROADMAP.md). Next steps include native-speaker review of interface localization and physical Android/iOS notification, background, compass and audio validation. The seven-test iOS simulator follow-up is complete; it does not establish physical-device behavior.

Privacy is available offline in **Settings → Privacy** and documented in [PRIVACY.md](docs/PRIVACY.md). The app adds no analytics and calculates Qibla and prayer times locally. Only foreground location permission is requested, after the user chooses device location. Notification permission on either platform is requested when the user enables prayer alerts or devotional reminders. Locations and preferences are saved locally. Both platforms use the original Quran/direction launcher icon.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Code is licensed under [MIT](LICENSE). Rust prayer, GeoNames, and Leaflet notices are in [third-party-notices.txt](modules/islamic-core/assets/third-party-notices.txt) and included in the native app assets. Quran text and font notices are separate from the code license. Quran recitations are streamed or downloaded for listening; Quran recordings are not bundled in the repository/APK. Licensed Adhan and devotional reminder sounds are bundled separately. Quran verse translations are permanently out of scope and will not be added. Interface localization remains supported. Tafsir books are downloaded on demand from the published sources and mirrors listed in [TAFSIR.md](docs/TAFSIR.md), including QuranEnc and Quranpedia editions, and saved in app-private storage. The Moyassar source fixture is retained for development provenance and integrity tests; the app runtime does not load or bundle that tafsir text.

## References

- [Expo local native modules](https://docs.expo.dev/more/create-expo-module/)
- [Expo development builds and custom code](https://docs.expo.dev/workflow/customizing/)
- [cargo-ndk](https://github.com/bbqsrc/cargo-ndk)
- [Apple XCFramework packaging](https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle)
- [Adhan's Qibla reference coordinates and spherical formula](https://github.com/batoulapps/adhan-js/blob/master/src/Qibla.ts)

- [adhaan Rust engine and reference schedules](https://github.com/RagibHasin/adhaan)
- [Expo foreground location](https://docs.expo.dev/versions/v57.0.0/sdk/location/)

The compact-controls/high-latitude follow-up is documented in [validation notes](docs/NAVIGATION-HIGH-LATITUDE-QA.md). Native device checks for that revision are separate from the user-reported v0.5.1 phone checks.

Version 0.5.2 includes the compact controls, shared appearance/location controls, animated compass, inline page/juz navigation, high-latitude settings and offline Privacy page. See [release notes](docs/RELEASE-0.5.2.md) for downloads and verification limits.

Version 0.5.3 / Android code 22 / iOS build 22 includes Android release APKs and iOS testing source: isolated audio clock rendering, deferred screen mounting, four cleaned Adhan options, testing-only draft languages, corrected Quran repeat-button contrast and accessible press feedback. See [release/testing notes](docs/RELEASE-0.5.3.md) for checks and native verification limits.
