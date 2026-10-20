# iOS testing on a Mac

Use **`main`** for the current **0.6.5 / build 28** source, or **`codex/fix-ios-testing`** for the test-harness fixes described below. This includes continuous-surah playback and native recording-end limits. Full Al-Fatiha playback, repeat and lock-screen ending behavior still require iPhone listening checks. The friend’s original **0.3.6** baseline remains on **`codex/reader-polish`**.

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
git clone --branch main --single-branch https://github.com/saad-musbeh/quran-adhan-qibla.git
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

## Updating from an older test source

After checking out the current source, regenerate the native project so the Short Adhan and Salawat reminder resources replace the old ones:

```sh
npm ci
npm run rust:ios
npx expo prebuild --clean --platform ios
npx expo run:ios --configuration Release
```

Re-select the development team in the generated workspace for a physical iPhone. Use `--device --configuration Release` for standalone device testing. The GitHub simulator ZIP is unsigned and runs only on an iOS simulator; physical-device installation still needs the tester’s Apple signing/provisioning.

## Checks for the tester

1. **Native core:** choose a city and confirm prayer times/Qibla calculations appear. Check GPS and live compass on a phone; simulator readings cannot establish compass accuracy.
2. **Quran library:** a fresh library starts with one copy at Al-Fatiha. Add copies up to six; existing saved copies must remain intact. Save different pages/names in two books, restart the app and confirm they remain independent. Return to the shelf to access Adhan/Qibla.
3. **Reader:** first opening, gold borders, night ayah numbers, long-press actions and enlarged reading. A deliberate up/right swipe advances; small movements return. Check down/left and zoom/pan. In landscape, either leaf must turn and zoom the whole spread together. Check the top Home button and microphone-labelled reciter selector. Fresh audio preferences should default to Al-Husary; saved choices must survive upgrades.
4. **Audio:** reciter switching, previous/replay/play-pause/next/stop, speeds, multi-ayah loops across several cycles, downloaded audio in airplane mode, screen lock, lock-screen controls, headphones and interruptions.
5. **Tafsir:** download/select each book, check publication dates and passage ranges, then read offline after restarting.
6. **Prayer alerts:** choose a location, enable alerts in the Adhan alerts section of Settings, allow notifications and confirm upcoming alerts appear. Choose different voices for two prayers, test each, and mute one prayer to keep only its silent notification. Check all four voices: Makkah, Al-Madinah, Andrewler and Original. Disable the master switch to cancel all reminders. iOS plays a labelled 29-second Adhan excerpt; check Silent Mode, Focus and notification sound settings on the phone. Reopen at least weekly to refresh the eight-date schedule.
7. **Downloads:** download a surah, change voices, continue a partial download, then remove a saved surah. In Manage downloads → Recitations, start/cancel the whole-Quran job, then start it again to reuse saved files; keep the app open. Audio/tafsir totals and saved counts should follow the files. Confirm offline playback after restart.
8. **Layout:** Arabic RTL, English, iPhone safe areas, iPad and larger text. Check Light and Dark for all five colors and saved appearance after restart. In landscape Adhan, the next prayer must stay on the right; after Isha it must show tomorrow’s separately calculated Fajr. Each salah should show a live remaining-time label, including Asr in the morning; completed prayers should show tomorrow explicitly. Check the prominent city label and tap it to change location. Fresh startup should show Home; a phone with Home disabled should open Adhan, never Quran.

## Current status

The current source is **0.6.5 / build 28**. See [0.6.5 release notes](RELEASE-0.6.5.md). iOS native verification was deferred for that release. An earlier failing [CI run](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/39129564231) passed the two language/reminder tests, then failed in iPad startup before reaching the shelf. Its source used a three-second Home wait; the current test waits up to 45 seconds. The intervening cancelled runs did not verify this fix; the follow-up results are recorded below.

The follow-up harness fixes isolate every test with a fresh install, seed both ayah files and full-surah recordings from the app's documented sources, check the reciter picker and select a voice from its automatically expanded list, and wait for each book-name input update. CI builds the app and tests once with `build-for-testing`, then uses `test-without-building` without parallel simulator clones. Each test keeps its own result bundle/log; failures retain a screenshot and accessibility hierarchy. Subsequent tests and device groups still run after a test failure. The CocoaPods cache key uses tracked dependency/configuration inputs instead of a generated lockfile that may not exist yet.

The first follow-up [macOS run](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/39374123052) compiled the native app/tests and passed book-name/relaunch, iPad portrait/landscape page turns, repeated tab transitions, testing languages and Adhkar/reminders (five of seven UI checks). The playback test closed the already expanded reciter list; that extra tap is removed. The download check exposed the default background NSURLSession failing to connect to `com.apple.nsurlsessiond` in the unsigned simulator app. Audio downloads now explicitly use a foreground session, matching the documented requirement to keep the app open. A host regression checks full-surah and ayah downloads when the background session is unavailable. The [next macOS run](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/39379664913) passed all six iPhone checks, including native playback and whole-Quran start/cancel. Its iPad test timed out reading the native page-number toolbar after its six-second auto-hide timer, while the failure screenshot and WebKit hierarchy showed the correct two-page spread. The tablet test now checks the persistent accessibility region of the actual rendered spread, including each forward/backward gesture, instead of revealing temporary tools. The updated iPad test awaits a new native run. Physical-device signing, playback, interruptions, compass accuracy and notification sound policy still require an iPhone/iPad.

To reproduce the CI UI suite on a Mac, after building Rust and generating/installing the native project:

```sh
ruby scripts/prepare-ios-ui-tests.rb
xcodebuild build-for-testing -workspace ios/QuranAdhanQibla.xcworkspace \
  -scheme QuranAdhanQibla -configuration Release \
  -destination "platform=iOS Simulator,id=$QURAN_SIMULATOR" \
  -derivedDataPath target/ios-build CODE_SIGNING_ALLOWED=NO
node scripts/ios-ui-tests.mjs "$QURAN_SIMULATOR" polish
node scripts/ios-ui-tests.mjs "$QURAN_SIMULATOR" iphone
node scripts/ios-ui-tests.mjs "$QURAN_IPAD" ipad
```

Set `QURAN_SIMULATOR` and `QURAN_IPAD` to booted, disposable iPhone/iPad simulator UDIDs from `xcrun simctl list devices available`. Each test uninstalls this app from its selected simulator, clearing its saved data and permissions. Within the book-persistence test, relaunch preserves data as usual. Audio fixtures and Al-Ghamdi's source Al-Fatiha ayah timings are downloaded to ignored `target/ios-test-audio/` and copied into the simulator's private storage, never into the distributed app or CI artifacts. The playback test checks Al-Husary playback/pause/replay/stop, then uses Al-Ghamdi's complete seven-ayah timing metadata for next/replay/stop navigation. Al-Husary's current endpoint has six numbered ayahs and an opening invocation; the app correctly declines that incomplete metadata instead of guessing canonical boundaries. The whole-Quran start/cancel check still uses the real download service and needs internet access; it does not download all 114 surahs.

Run `npm run test:ios:harness` on any supported Node host to check test isolation, fixture ordering, simulator selection and failure propagation without Xcode. CI's `ios-ui-checks` artifact retains per-test `.xcresult` bundles, raw logs, summaries, screenshots and exported simulator diagnostics; `diagnostic_run` accepts old and new artifact layouts.

The 0.4.1 Release simulator app compiled and passed native playback/control and repeated tab-transition checks. Prayer scheduling/cancellation and saved inventory assertions also passed before a whole-Quran download displayed an error. Book 1 reached page 2 independently of book 2, but the name typed by XCTest was truncated. These historical results do not establish current native behavior.

Version 0.4.2 replaces the calendar option that crashed Android with one correctly formed Hijri locale extension. The Arabic prayer-date Gregorian extension is removed before adding the Hijri extension, avoiding the earlier iOS duplicate-extension crash. Hidden tafsir catalogues no longer format dates at reader startup; optional digital-date failures retain the documented publication year. The 0.4.3 source inherits this fix; send its updated source ZIP to the Mac tester. Its native runtime run is pending in the [iOS native build workflow](https://github.com/saad-musbeh/quran-adhan-qibla/actions/workflows/ios.yml). Physical-device signing, compass accuracy, lock-screen audio, interruptions and notification sound policy remain for the tester.

TypeScript and Android/iOS bundle exports passed for 0.4.2. The Android APK is built with the same test signing certificate as 0.3.6. An Android API 36 emulator reproduced the 0.4.1 fatal calendar error, then opened the reader and tafsir catalogue on 0.4.2 without that error, including native Hijri edition dates. Simulator checks cannot establish physical compass accuracy or device sound/background behavior.

## Tablet and landscape follow-up

For 0.4.3 use `codex/tablet-location` or its release source archive. Start on an iPad: the home page should show Quran, Adhan and Qibla buttons. Rotate portrait/landscape in each section; wide tablet reading should show two consecutive pages in Arabic reading order, preserving each book’s saved page. Verify Settings → Main menu on small screens on iPhone and Settings → Credits. Android’s new system-provider module is Android-only and does not replace iOS Core Location. Physical iPad GPS, compass and multitasking checks remain for the Mac tester.

0.4.4 reduces the page-turn distance to 18% of the page dimension, capped at 64 CSS pixels (minimum 24). The iPad simulator check now uses a short 90-point drag rather than the next-page button. The 8 compact tafsir files remain pinned to the immutable 0.4.3-test assets.

## 0.4.5 text size and localization follow-up

Settings → App text size now affects shared app text and inputs, tafsir, and the main vector reader immediately. Default resets the saved size. Enlarged Quran pages can pan; a swipe outward from an edge turns the page. The main reader uses more of the screen and tighter artwork margins. Newly added controls, downloads, Credits and home menus use the selected language catalogue; country and language names have localized display labels. Quran text, published tafsir text and original licence notices remain source content.

The 0.4.4 simulator app compiled, but its iPad landscape UI check timed out waiting for the two-WebView spread; the iPhone UI step was therefore skipped. Do not treat that run as a passed device check. The 0.4.5 commit runs the workflow again. Physical iPad/MatePad behavior is still awaiting device feedback.

## 0.6.0 focused checks

- Confirm the language picker shows only Arabic/English, including when searching. Enable Settings → Extra testing settings → Show testing languages to reveal the 38 drafts. Select one, restart, then disable testing languages: Arabic should return immediately and remain after restart.
- Open the أذكار وأدعية tab and read one entry from each fixed collection (morning, evening, after prayer). Scrolling is the default, source references open on demand, and counters or single-entry reading stay under Extra testing settings; morning/evening reminders open their collections.
- Add a الصلاة على النبي reminder and a morning/evening reminder at chosen times with a recorded phrase, then restart and confirm the chosen times remain. All recurring reminders start off on a fresh install, enabling one asks for notification permission only in that explicit action, and cancelling the schedule dialog must leave the stored times unchanged.
- Short Adhan should be the fresh default voice with Makkah, Al-Madinah, Andrewler and Original still selectable; saved per-salah voice and mute choices must survive an upgrade. Check that the recorded Salawat phrases play instead of the retired synthetic voice.
- In Quran reading, playback should stop at the current surah’s end by default, Next surah and Repeat surah remain in the player, and a new app session returns to Stop. Hold/release header, navigation, playback and settings buttons: feedback should be small and quick, and iOS Reduce Motion should not break them.
- Read/turn pages during Quran playback, switch tabs, and return. Check that the clock and ayah highlight still advance, audio continues in the background, and saved screen state survives tab changes. Compare launch responsiveness and scrolling on the same physical phone; no device performance numbers are claimed from host tests.

The [iOS native build workflow](https://github.com/saad-musbeh/quran-adhan-qibla/actions/workflows/ios.yml) runs `QuranUITests/testPolishLanguageMenuAndRepeatControls` and `QuranUITests/testAdhkarCollectionsAndReminders` against this source. `testAdhkarCollectionsAndReminders` was added with 0.6.0, so a run against earlier source cannot execute it.
