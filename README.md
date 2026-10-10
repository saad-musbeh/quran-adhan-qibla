# Quran · Adhan · Qibla

**قرآن · أذان · قبلة** — an open-source app for iOS and Android, built with React Native, TypeScript, Expo, and a shared Rust core.

This is the initial development scaffold. It includes Arabic/English screens and a Rust Qibla calculation with Swift and Kotlin bridge source. Quran text, prayer times, Adhan playback, notifications, and a live compass are upcoming work.

## What is ready

- Arabic by default, English toggle, and layouts that follow the selected language.
- Separate Quran, Adhan, and Qibla tabs.
- Offline Rust Qibla bearing calculation with coordinate validation and tests.
- Manual coordinate entry, including Arabic/Persian digits, and a clearly labelled Riyadh example.
- iOS C ABI/XCFramework and Android JNI bridge source and build scripts.
- MIT license, contribution guide, roadmap, and CI checks.

Quran and Adhan screens are clearly marked as in development. No Quran text, recitations, or calculated prayer times are bundled yet. The Qibla result is clockwise from **true north**; it is not a live sensor compass.

## Quick preview

Use Node.js 22 LTS and npm. From the repository root:

```sh
npm ci
npm run preview
```

Open the app in the compatible Expo Go version. Expo Go previews the UI but does not contain this project's Rust native module: Qibla calculation is disabled there. Use a native development build below for the Rust feature.

## Android development build

Install Rust through [rustup](https://rustup.rs/), Android Studio with its SDK/NDK, and the JDK required by the generated Expo Android project. Make sure `cargo` is on your PATH.

```sh
rustup target add aarch64-linux-android x86_64-linux-android
cargo install cargo-ndk --locked
npm ci
npm run android
```

The command builds Rust for ARM64 devices and x86_64 emulators, then generates and builds the Android app. Set `ANDROID_NDK_HOME` if cargo-ndk cannot find your NDK. Other Android ABIs are not included in this starter.

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

`check` runs TypeScript, coordinate parsing tests, Rust formatting/lint checks, and Rust tests. The export builds the JavaScript bundles for both mobile platforms; it does **not** compile Swift, Kotlin, or an installable app. Initial host checks cover the Rust core and C ABI. Full native builds and real-device bridge/RTL checks remain to be completed on hosts with the platform SDKs.

The initial npm audit (10 October 2026) also reports inherited dependency advisories through Expo/Metro/Xcode tooling (`braces`, `node-forge`, and `uuid`). Compatible automatic updates did not resolve them. Updating upstream packages is follow-up work; functional checks do not imply a clean dependency audit.

## Layout

```text
App.tsx                         Mobile shell and three screens
src/i18n.ts                     Arabic / English copy
src/domain/                     Coordinate parsing and tests
crates/islamic-core/             Rust calculation and C header
modules/islamic-core/            Expo module: TypeScript, Swift, Kotlin
scripts/build-native.mjs         Android libraries / iOS XCFramework
docs/ROADMAP.md                  Next development milestones
.github/workflows/ci.yml         TypeScript, Rust, and bundle checks
```

Expo generates root `android/` and `ios/` projects when needed. They, Rust build outputs, and compiled bridge binaries are ignored by Git. Maintain native bridge source under `modules/`.

## Next work

See [the roadmap](docs/ROADMAP.md). Start with a verified, redistribution-compatible Quran dataset and offline reader, then prayer calculation settings and local notifications, followed by device location and a calibrated compass.

The starter makes no network requests, adds no analytics, and keeps manually entered coordinates in memory. Location and notification permissions will be added when those features are implemented. The icons are Expo template placeholders.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Code is licensed under [MIT](LICENSE). Future Quran datasets, fonts, recitations, and translations need their own source attribution and license records.

## References

- [Expo local native modules](https://docs.expo.dev/more/create-expo-module/)
- [Expo development builds and custom code](https://docs.expo.dev/workflow/customizing/)
- [cargo-ndk](https://github.com/bbqsrc/cargo-ndk)
- [Apple XCFramework packaging](https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle)
- [Adhan's Qibla reference coordinates and spherical formula](https://github.com/batoulapps/adhan-js/blob/master/src/Qibla.ts)
