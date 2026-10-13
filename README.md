# Quran · Adhan · Qibla

**قرآن · أذان · قبلة** — an open-source app for iOS and Android, built with React Native, TypeScript, Expo, and a shared Rust core.

This app includes an offline Arabic Quran reader with verse audio, menus/settings in 35 languages, saved foreground location, shared Rust calculations for Qibla and today’s prayer times, and optional local prayer notifications on Android and iOS with bundled Adhan sounds.

## What is ready

- Arabic by default, a searchable language menu with 35 native-name choices, and layouts that follow the selected language. The 33 menu/settings translations include the newer home, downloads, Credits and tafsir controls; they are machine-assisted drafts awaiting native-speaker review (see [localization](docs/LOCALIZATION.md)); Quran text and surah names remain Arabic.
- Quran library tabs stay visible; Adhan/Qibla tabs hide after inactivity. In Quran reading, the top language/location/settings banner and bottom audio controls stay visible. Tap the page to reveal reading tools; swipe the page to turn Mushaf pages, then return to the library to switch app sections.
- Large screens have a home page with large section buttons; small phones can enable it in Settings. Landscape layouts use responsive book grids, a two-page tablet Mushaf, and scrolling prayer/Qibla views when needed. Location choices and settings open separately.
- A persistent compact top row with language, location-pin, and settings icons, including during Quran reading. Reading, audio, prayer, and compass preferences share one settings page. Reciter and calculation-method choices expand on demand; playback speed and loop editing stay in the player/reader.
- An illustrated Qibla scene with a live phone compass and an optional fixed true-north view, without camera access. Poor sensor readings show calibration guidance and a clearly labelled fixed fallback.
- All 114 surahs / 6,236 verses bundled offline from Tanzil, alongside 604 offline Mushaf vector pages. Pages fit on screen at the default text size; enlarged pages support panning and page turns from their edges. See [Quran text provenance](docs/QURAN-DATA.md).
- Surah/Juz/page navigation, text search, page and verse bookmarks, last page, app-wide text size, and night reading. Settings → App text size scales Quran pages, tafsir, prayer times, Qibla labels, menus and text inputs immediately; the saved choice survives restarts, and Default restores the original size. Long-press a verse to open its actions, then choose a published tafsir edition for private offline download. Arabic books remain visible in all languages; matching translated tafsirs appear first. See [tafsir sources](docs/TAFSIR.md). App colors can be changed from **App color / لون التطبيق** in the top gear sheet on any tab. Green, maroon, blue, black and brown apply to the Quran reader, prayer times, Qibla scene and settings, and are saved locally.
- The Quran tab opens a library of six named reading copies. Each starts at Al-Fatiha and saves its own page and bookmarks. Open a book to read; return to the library to switch to Adhan or Qibla. Tap the page to reveal reading tools. Original printed calligraphy and line breaks are preserved, with the artwork centered at equal 6% margins, Arabic verse numbers, bookmarks and audio highlighting. The opening pages use tight crops based on their existing vector paths and an original green-and-rose floral frame with gilt borders and an oval paper field. The frame, page metadata and controls follow the selected theme; night mode retains its dark page and light text. The book icon opens the same vector pages with zoom and pan; enlarged reading scrolls.
- Verse highlighting, twenty reciters (Saad Al-Ghamdi by default), pitch-preserving playback speeds, labelled previous/replay/play-pause/next/stop controls and a reader selector in the player, same-surah ayah loops, and optional surah or whole-Quran downloads. Whole-Quran downloads cover all 114 surahs for the selected voice, can be cancelled and resume by skipping saved ayahs; keep the app open. Long-press an ayah and choose **Start loop here** to begin immediately through the end of that surah; choose an ending ayah on the page to open the range editor with that endpoint selected. Audio uses a native queued playlist for advancing between ayahs and looping a chosen range. Natural recorded pauses remain and network buffering is still possible. See [audio behavior and sources](docs/QURAN-AUDIO.md).
- Offline Rust Qibla bearing calculation with coordinate validation and tests.
- Device location is the primary action on both Qibla and Adhan, with a shared location and permission recovery.
- Secondary location choices are ordered: offline city search, online map selection, then optional manual coordinates (including Arabic/Persian digits).
- The offline catalogue contains 7,358 places across 199 countries and territories, targeting 70 in Muslim-majority countries and 30 elsewhere; small-country shortfalls are recorded in [CITY-DATA.md](docs/CITY-DATA.md).
- Optional OpenStreetMap selection previews a point and requires confirmation; it needs internet access, displays attribution, and has an offline failure path.
- Today’s Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha, with method and Asr settings, calculated by Rust using `adhaan` 0.3.0.
- iOS C ABI/XCFramework and Android JNI bridge source and build scripts.
- MIT license, contribution guide, roadmap, and CI checks.

Quran playback is separate from Adhan. In the **Adhan alerts** section of the unified settings page, enable **Play Adhan at prayer times**, allow notifications, and on Android grant **Alarms and reminders** access for exact scheduling. The test button schedules an alert in five seconds. Remaining prayers today and the following seven dates are scheduled locally; open the app at least weekly to refresh them. Android controls notification volume, Do Not Disturb and sound duration. iOS uses a 29-second excerpt and follows notification sound, Silent Mode and Focus settings. See [prayer notification behavior](docs/PRAYER-NOTIFICATIONS.md) and [recording provenance](assets/adhan/PROVENANCE.md). The Qibla bearing is clockwise from **true north**. Live mode rotates the scene relative to a reliable phone heading; fixed mode keeps north at the top.

## Location and prayer times

Open Qibla or Adhan, tap **Use my location**, and allow foreground access in the system prompt. Approximate access is accepted. Android uses system GPS/network providers without requiring Google Play Services; iOS uses its native Expo provider. A single foreground fix supplies both screens; there is no continuous location watch, background permission, or background location service. Device location is reused for six hours and refreshed only while a location screen is open and the app is active. Refresh sooner after travelling. The **top location pin** opens the three secondary choices together; city, map point, and manual coordinates each require confirmation and stop automatic device-location refresh.

The Qibla scene is illustrated. Live mode follows the phone’s heading while the Qibla page is visible; keep the phone flat and away from magnetic objects. Select the fixed true-north view in the top gear sheet to keep north at the top. See [compass behavior](docs/COMPASS.md). Swipe between tabs, or reveal the compact bottom navigation using its handle. In Quran reading, tap the page to reveal tools. Drag up or right for the next page, down or left for the previous page. The artwork follows your finger; releasing beyond halfway advances, while a shorter drag returns to the current page. Return to the six-book library before switching app sections. Page buttons and the Android Back button also remain available. Long-press a verse to open its play, tafsir, verse-bookmark, and loop actions. **Start loop here** immediately starts the selected ayah through the end of its surah. To choose a shorter range, select an ending ayah on the page or use the range sheet’s **Choose ayahs on the page** action to tap its start and end. The range sheet can also set a same-surah range directly. Playback advances through the native audio queue and loops the chosen range; natural pauses remain in the source recordings and network buffering can occur. The tafsir library offers التفسير الميسر, المختصر, تفسير السعدي, and النفحات المكية from QuranEnc. Its catalogue distinguishes original Hijri publication dates from digital source dates; undocumented first-print dates are explicitly marked. Each book is optional: download it over the network for private offline use, select an installed edition, or remove its saved copy. A source-edition check runs before download; the app validates coverage of all 6,236 canonical ayah keys, retaining original tafsir passages where the source groups ayahs and saves a book only after the complete download succeeds. No tafsir text is included in the runtime bundle.

Permission denial, a blocked permission, disabled location services, and a 30-second position timeout have recovery messages. Automatic refresh never prompts for permission. Location coordinates are held in memory for the current app session; reading, audio, and app preferences are saved locally. Qibla and prayer calculations do not upload coordinates, and the app adds no analytics. City search and manual entry are offline. The optional map sends tile requests (IP address and viewed area) to OpenStreetMap; see [MAP-PICKER.md](docs/MAP-PICKER.md). OS location services may use network assistance.

The default method is **Umm al-Qura (Makkah)** with standard Asr. Settings also offer Muslim World League, ISNA, Egyptian, Karachi, and Moonsighting Committee methods, plus Hanafi Asr. Umm al-Qura uses Isha 90 minutes after Maghrib; the optional Ramadan setting changes it to 120 minutes. Ramadan is selected by the user, not inferred from an unverified calendar.

The Rust engine receives the phone’s current Gregorian calendar date and returns UTC timestamps. The UI displays those timestamps in the phone’s timezone, including its DST rules. Check that timezone after travel. The schedule updates at local midnight, when returning to the app, and on location or setting changes. Next-prayer highlighting changes at prayer boundaries; sunrise is never labelled a prayer. Clock housekeeping runs hourly and does not read GPS.

Below 65° north/south, the engine uses the middle-of-the-night high-latitude rule alongside method-specific adjustments (including Moonsighting’s seasonal twilight rules). At or beyond 65°, the app explicitly reports unsupported polar calculation rather than silently selecting a different city. Local mosque timetables may use different methods or adjustments.

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

To create an APK without a connected device or running development server:

```sh
npm run rust:android
npx expo prebuild --platform android --no-install
cd android
NODE_ENV=production ./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks --max-workers=2
NODE_ENV=production ./gradlew :app:assembleRelease --max-workers=2
```

The explicit bundle step refreshes JSON catalogs too; Gradle can otherwise reuse the old bundle after JSON-only edits. The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. It includes the JavaScript bundle and uses Expo's generated debug signing key for local testing. Configure your own release signing before store distribution.

## iOS development build

Use macOS with Xcode 26.4+ and CocoaPods, plus Rust and Node.js 22 on your PATH.
Use `codex/tablet-location` for the current 0.4.4-test source. `main` retains the merged 0.4.2 source until this branch is merged. The friend’s original 0.3.6 baseline remains on `codex/reader-polish`. See [the Mac/iPhone testing guide](docs/IOS-TESTING.md) for setup, signing, standalone builds and checks for a tester.

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

`check` runs TypeScript, coordinate/location/schedule behavior tests, Rust formatting/lint checks, and Rust tests. Reference schedules cover Makkah and London in winter and summer (DST); bridge validation rejects invalid dates, unsupported polar locations, and incomplete schedules. The export builds the JavaScript bundles for both mobile platforms; it does **not** compile Swift, Kotlin, or an installable app. Host checks cover the Rust core and C ABI.

Android test APKs were compiled on Linux with JDK 17. The 0.3.3 reader/audio checks and 0.3.4 icon, language menu, persistence and Android Adhan notification checks are recorded in [READER-COMPASS-QA.md](docs/READER-COMPASS-QA.md), alongside earlier compass and reader results. The [macOS Release simulator build passed on 12 October 2026](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/38219756885), including the Rust XCFramework and bundled Quran assets. The 0.4.1 iOS native playback and repeated tab checks passed; book-name entry and whole-Quran download checks remain unresolved. The 0.4.2 Android reader crash fix was reproduced and checked on an API 36 emulator. The updated iOS run and physical-device checks remain pending. Physical-device compass/GPS behavior also remains unverified.

The initial npm audit (10 October 2026) also reports inherited dependency advisories through Expo/Metro/Xcode tooling (`braces`, `node-forge`, and `uuid`). Compatible automatic updates did not resolve them. Updating upstream packages is follow-up work; functional checks do not imply a clean dependency audit.

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

See [the roadmap](docs/ROADMAP.md). Next steps include native-speaker translation review, advanced high-latitude handling, and physical-device compass, notifications and audio validation.

The app adds no analytics and calculates Qibla and prayer times locally. Only foreground location permission is requested, after the user chooses device location. Notification permission on either platform is requested only when prayer alerts are enabled. Locations and preferences are saved locally. Both platforms use the original Quran/direction launcher icon.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Code is licensed under [MIT](LICENSE). Rust prayer, GeoNames, and Leaflet notices are in [third-party-notices.txt](modules/islamic-core/assets/third-party-notices.txt) and included in the native app assets. Quran text and font notices are separate from the code license. Recitation files are streamed or downloaded for listening; no MP3 files are distributed in the repository/APK. Quran translations remain future work; menu/settings translations are separate. Tafsir books are downloaded on demand from QuranEnc and saved in app-private storage. The Moyassar source fixture is retained for development provenance and integrity tests; the app runtime does not load or bundle that tafsir text.

## References

- [Expo local native modules](https://docs.expo.dev/more/create-expo-module/)
- [Expo development builds and custom code](https://docs.expo.dev/workflow/customizing/)
- [cargo-ndk](https://github.com/bbqsrc/cargo-ndk)
- [Apple XCFramework packaging](https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle)
- [Adhan's Qibla reference coordinates and spherical formula](https://github.com/batoulapps/adhan-js/blob/master/src/Qibla.ts)

- [adhaan Rust engine and reference schedules](https://github.com/RagibHasin/adhaan)
- [Expo foreground location](https://docs.expo.dev/versions/v57.0.0/sdk/location/)
