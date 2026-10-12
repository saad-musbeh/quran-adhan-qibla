# iOS testing on a Mac

Use **`codex/test-0.4.0`** for the current test version. The friend’s original **0.3.6** baseline remains on **`codex/reader-polish`**; its release assets are unchanged. The repository’s `main` branch is older.

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
git clone --branch codex/test-0.4.0 --single-branch https://github.com/saad-musbeh/quran-adhan-qibla.git
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
6. **Prayer alerts:** choose a location, enable alerts in the Adhan alerts section of Settings, allow notifications and confirm upcoming alerts appear. Try the five-second test and disable alerts to cancel the schedule. iOS plays a labelled 29-second Adhan excerpt; check Silent Mode, Focus and notification sound settings on the phone. Reopen at least weekly to refresh the eight-date schedule.
7. **Downloads:** download a surah, change voices, continue a partial download, then remove a saved surah. In Manage downloads → Recitations, start/cancel the whole-Quran job, then start it again to reuse saved files; keep the app open. Audio/tafsir totals and saved counts should follow the files. Confirm offline playback after restart.
8. **Layout:** Arabic RTL, English, iPhone safe areas, iPad and larger text.

## Current status

Version **0.4.1**, iOS build **11**, on `codex/test-0.4.0`. Android and iOS share the six-book reader, twenty reciters, Saad Al-Ghamdi default, download manager, playback recovery, themes and retained screen layers. Local iOS prayer notifications are implemented with a 29-second sound; no APNs entitlement is requested.

The earlier 0.4.0 Release simulator app compiled with the Rust XCFramework. Its runtime tests passed prayer-alert scheduling/cancellation, saved audio inventory and repeated tab changes, but opening a reader aborted the app due to a duplicate Unicode calendar extension in the tafsir date locale. The 0.4.1 formatter selects the Hijri calendar through its options, avoiding the invalid locale; 140 combinations of the 35 UI languages and four editions were checked on the host. Send the updated 0.4.1 source ZIP to the Mac tester. The updated native runtime run is pending. Runtime checks are being run in the [iOS native build workflow](https://github.com/saad-musbeh/quran-adhan-qibla/actions/workflows/ios.yml): book persistence, native playback, notification scheduling/cancellation, saved audio inventory and repeated tab changes. The workflow saves screenshots, the simulator app and logs. Physical-device signing, compass accuracy, lock-screen audio, interruptions and notification sound policy remain for the tester.

Linux checks passed: 78 JavaScript tests, 14 Rust tests, TypeScript, formatting/Clippy and Android/iOS bundle exports. The Android 0.4.1 test APK is built with the same test signing certificate as 0.3.6. Simulator checks cannot establish physical compass accuracy or device sound/background behavior.
