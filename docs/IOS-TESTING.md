# iOS testing on a Mac

Use **`codex/reader-polish`**. The repository's `main` branch is older and does
not contain the 0.3.6 reader improvements.

## Requirements

- Full Xcode **26.4+** (26.6 recommended), with its license accepted and an iOS simulator runtime installed.
- A compatible macOS version, Node.js **22.13+ within version 22**, npm, Rust/rustup and CocoaPods (`pod`).
- Physical iPhone/iPad testing requires **iOS 16.4+**.

These requirements follow [Expo SDK 57's compatibility table](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions).
Scene lifecycle support is enabled for Xcode 27 too; that toolchain needs its own native validation.
Open Xcode once and install its requested components. Check the selected tools:

```sh
xcode-select -p
xcodebuild -version
node --version
cargo --version
pod --version
```

If the developer directory is `/Library/Developer/CommandLineTools`, select the full Xcode installation in Xcode's Settings → Locations → Command Line Tools.

## Current source and development build

```sh
git clone --branch codex/reader-polish --single-branch https://github.com/saad-musbeh/quran-adhan-qibla.git
cd quran-adhan-qibla
git log -1 --oneline
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
npm ci
npm run ios
```

This builds Rust for devices and both simulator architectures, creates the XCFramework, generates the Xcode project, installs Pods and starts a native development app with Metro. Keep the terminal running. Expo Go cannot test the Rust module or native audio controls.

`npm ci` applies the pinned Expo Audio 57.0.5 playlist patch. Expo modules build from source to include that patch. Do not use `--ignore-scripts` or enable `usePrecompiledModules` for these checks. Internet is needed for dependency installation, streamed recitations and first-time tafsir downloads. Quran text/pages are bundled offline.

## Standalone simulator build

```sh
npm run rust:ios
npx expo run:ios --configuration Release
```

This includes JavaScript and offline Quran assets and should open without Metro. Generated `ios/`, Pods, native binaries and `node_modules/` are ignored build outputs; send the tracked source and lockfiles to the tester.

## Physical iPhone

Connect and trust the phone, enable Developer Mode, then run:

```sh
npm run rust:ios
npx expo run:ios --device
```

For signing, open `ios/QuranAdhanQibla.xcworkspace` in Xcode, select the **QuranAdhanQibla** target, and choose the friend's development team under Signing & Capabilities. Use automatic signing. If their team cannot register `org.saadmusbeh.quranadhanqibla`, change `ios.bundleIdentifier` in `app.json` before regenerating. The app requests no APNs push entitlement.

For a bundled device build, use `npx expo run:ios --device --configuration Release`. An unsigned simulator `.app` cannot run on a physical iPhone; an IPA needs the friend's signing and provisioning setup.

## Checks for the tester

1. **Native core:** choose a city and confirm prayer times/Qibla calculations appear. Check GPS and live compass on a phone; simulator readings cannot establish compass accuracy.
2. **Six books:** each initially starts at Al-Fatiha. Save different pages/names in two books, restart the app and confirm they remain independent. Return to the shelf to access Adhan/Qibla.
3. **Reader:** first opening, gold borders, night ayah numbers, long-press actions and enlarged reading. Up/right beyond halfway advances; shorter drags return. Check down/left and zoom/pan.
4. **Audio:** reciter switching, previous/replay/play-pause/next/stop, speeds, multi-ayah loops across several cycles, downloaded audio in airplane mode, screen lock, lock-screen controls, headphones and interruptions.
5. **Tafsir:** download/select each book, check publication dates and passage ranges, then read offline after restarting.
6. **Layout:** Arabic RTL, English, iPhone safe areas, iPad and larger text.

## Current status

Version **0.3.6**, iOS build **9**. The latest Quran library, gestures, themes, reciters, tafsir, prayer calculations and compass changes share source with Android. Scheduled Adhan alerts are **Android-only** and iOS settings say so. iOS now uses the Quran/direction launcher icon.

On 12 October 2026, [the macOS native build passed](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/38219756885) for commit `82bb4b0204fba765a98c0684e7b4086fd2a74308`: Rust device/simulator libraries, CocoaPods, Swift compilation and packaging of a bundled Release simulator app. The **iOS native build** workflow saves the simulator ZIP and build log. The checked source ZIP is attached to the 0.3.6 release. Physical-device signing, compass accuracy, audio behavior and Xcode 27 remain for the tester to verify.

Linux checks also passed: 74 JavaScript tests, 14 Rust tests, TypeScript, formatting/Clippy and Android/iOS bundle exports. The generated iOS project was checked for version/build, foreground-only location permission, background audio, scene lifecycle, patched source compilation and no push entitlement. The first Mac build caught an optional-value assignment in the lock-screen module; the linked successful build includes its fix.
