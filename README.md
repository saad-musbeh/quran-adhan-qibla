# Quran · Adhan · Qibla

**قرآن · أذان · قبلة** — an open-source app for iOS and Android, built with React Native, TypeScript, Expo, and a shared Rust core.

This early app includes Arabic/English screens, foreground device location, and offline Rust calculations for Qibla and today’s prayer times. Quran text, Adhan playback, notifications, and a live sensor compass are upcoming work.

## What is ready

- Arabic by default, English toggle, and layouts that follow the selected language.
- Compact tabs that hide after inactivity, with horizontal swipe navigation following Arabic/English tab order.
- Main screens fit without vertical scrolling; location choices and calculation settings open separately.
- An illustrated camera-style Qibla view with a Kaaba marker and direction path. It needs no camera permission and clearly labels the fixed true-north reference.
- Offline Rust Qibla bearing calculation with coordinate validation and tests.
- Device location is the primary action on both Qibla and Adhan, with a shared location and permission recovery.
- Secondary location choices are ordered: offline city search, online map selection, then optional manual coordinates (including Arabic/Persian digits).
- The offline catalogue contains 7,358 places across 199 countries and territories, targeting 70 in Muslim-majority countries and 30 elsewhere; small-country shortfalls are recorded in [CITY-DATA.md](docs/CITY-DATA.md).
- Optional OpenStreetMap selection previews a point and requires confirmation; it needs internet access, displays attribution, and has an offline failure path.
- Today’s Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha, with method and Asr settings, calculated by Rust using `adhaan` 0.3.0.
- iOS C ABI/XCFramework and Android JNI bridge source and build scripts.
- MIT license, contribution guide, roadmap, and CI checks.

The Quran reader remains a placeholder. Prayer times are calculated, but audio and notifications are not implemented. The Qibla result is clockwise from **true north**; the arrow is fixed and is not a live sensor compass.

## Location and prayer times

Open Qibla or Adhan, tap **Use my location**, and allow foreground access in the system prompt. Approximate access is accepted. A single foreground fix supplies both screens; there is no continuous location watch, background permission, or background location service. Device location is reused for six hours and refreshed only while a location screen is open and the app is active. Refresh sooner after travelling. **Change location** opens the three secondary choices together; city, map point, and manual coordinates each require confirmation and stop automatic device-location refresh.

The Qibla scene is an illustration, with north at the top, rather than a camera feed or tracked augmented reality. Face true north before following its arrow. Moving the phone does not rotate the guide. Swipe between pages, tap the bottom handle to show the compact tabs, or use the visible tabs before they hide after inactivity.

Permission denial, a blocked permission, disabled location services, and a 30-second position timeout have recovery messages. Automatic refresh never prompts for permission. Coordinates and preferences are held in memory for the current app session; Qibla and prayer calculations do not upload them, and the app adds no analytics. City search and manual entry are offline. The optional map sends tile requests (IP address and viewed area) to OpenStreetMap; see [MAP-PICKER.md](docs/MAP-PICKER.md). OS location services may use network assistance.

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
NODE_ENV=production ./gradlew :app:assembleRelease --max-workers=2
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. It includes the JavaScript bundle and uses Expo's generated debug signing key for local testing. Configure your own release signing before store distribution.

## iOS development build

Use macOS with Xcode and CocoaPods, plus Rust and Node.js 22 on your PATH.

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

Android test APKs are compiled on Linux with JDK 17. Their ARM64/x86_64 Rust libraries, JNI exports, bundled JavaScript, APK signature, and 16 KB packaging/library alignment were checked. Native Rust Qibla/prayer results, location permissions, and Arabic/English layouts were exercised on an Android API 36 x86_64 emulator. Physical-device compass/GPS behavior and the iOS native build remain unverified.

The initial npm audit (10 October 2026) also reports inherited dependency advisories through Expo/Metro/Xcode tooling (`braces`, `node-forge`, and `uuid`). Compatible automatic updates did not resolve them. Updating upstream packages is follow-up work; functional checks do not imply a clean dependency audit.

## Layout

```text
App.tsx                         Mobile shell and shared calculation state
src/components/                 Screens, swipe tabs, location sheet, map picker
src/i18n.ts                     Arabic / English copy
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

See [the roadmap](docs/ROADMAP.md). Next steps include a verified, redistribution-compatible Quran dataset and offline reader, licensed Adhan audio and local notifications, persistent preferences, advanced high-latitude handling, and a calibrated compass.

The app adds no analytics and calculates Qibla and prayer times locally. Only foreground location permission is requested, after the user chooses device location. Notification permission is not requested yet. The icons are Expo template placeholders.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Code is licensed under [MIT](LICENSE). Rust prayer, GeoNames, and Leaflet notices are in [third-party-notices.txt](modules/islamic-core/assets/third-party-notices.txt) and included in the native app assets. Future Quran datasets, fonts, recitations, and translations need their own source attribution and license records.

## References

- [Expo local native modules](https://docs.expo.dev/more/create-expo-module/)
- [Expo development builds and custom code](https://docs.expo.dev/workflow/customizing/)
- [cargo-ndk](https://github.com/bbqsrc/cargo-ndk)
- [Apple XCFramework packaging](https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle)
- [Adhan's Qibla reference coordinates and spherical formula](https://github.com/batoulapps/adhan-js/blob/master/src/Qibla.ts)

- [adhaan Rust engine and reference schedules](https://github.com/RagibHasin/adhaan)
- [Expo foreground location](https://docs.expo.dev/versions/v57.0.0/sdk/location/)
