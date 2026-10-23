# Standalone Swift iOS/iPadOS app

`QuranAdhanQibla.swiftpm` is a separate SwiftUI app playground for iPhone and iPad, targeting iOS/iPadOS 17 or later. Its runtime is Swift source and Apple system frameworks. It has no React Native, Expo, Rust, JavaScript, CocoaPods or third-party binary requirement. The existing cross-platform app remains in the repository root.

The current distribution is **1.0.2 / build 3**, `dist/swift-ios/QuranAdhanQibla-iPad-build3-compact.zip`. Follow [the bilingual iPad instructions](IPAD-START-HERE.md). Generated resources are excluded from Git and included in the ZIP; downloading the raw `.swiftpm` source directory from Git without preparing resources is insufficient.

Build 3 replaces the space-heavy generated PDFs with compressed original SVG pages, keeping all offline Quran pages and source paths. Pages are decompressed individually as needed. No content or reciter choices are removed.

Build 2 introduced the current icon and startup/build mitigations. The port exports the current `app.json` iOS icon at the required opaque 1024×1024 size, separates host XCTest targets from the Apple app build, uses a direct Swift 5.9-compatible app manifest with Swift 5 language mode, and defers content initialization until a loading view is shown. The root and reader view expressions are split into smaller compiler boundaries. Resource discovery now reports missing resources instead of entering SwiftPM's fatal resource accessor. Startup errors can be shared from the app. These changes address concrete packaging and startup hazards; the user's “Crashed / Build failed” Run App failure has not been reproduced on an Apple device here. Compiler failures must be read from Swift Playground's Show Issues panel.

## Included source behavior

- Arabic-first and English UI with RTL, Home, five color choices, light/dark appearance, saved text size, unified settings and offline privacy/credits.
- All 114 surahs and 6,236 unmodified Tanzil verses. All 604 source Mushaf SVG pages and both existing khatm dua sheets are bundled with lossless gzip compression. System WebKit renders the original artwork with JavaScript disabled; native controls handle zoom, verse selection and highlights. Source paths remain intact; ordinary pages gain equal 6% margins, and empty opening-page canvas is cropped. Portrait/split landscape pages support native zoom, shared zoom level, fit-size swipe turns, page/juz entry, surah/juz navigation, Arabic search and long-pressed verse actions. A text ayah list also makes every verse/action accessible.
- Up to six independent named reading copies, last pages, page and verse bookmarks. Saved state uses atomic files; failed reads do not overwrite the original. Existing React Native app storage is separate and is not migrated automatically.
- Twenty existing reciters, full-surah playback, individual ayahs, same-surah loops, speed, next/replay/play-pause/stop, Stop/Next/Repeat at surah end, Now Playing commands, and the existing source-specific audited recording endpoints. Full-surah verse highlighting remains unavailable without validated timing metadata; individual-ayah playback highlights its actual verse.
- Foreground audio downloads for a surah or all 114 surahs, cancellation that retains completed files, resume by skipping saved files, inventory and removal. Playback prefers local files. Keep the app open while downloading; progress counts completed files. Source URLs and ending limits come from the current app catalogues.
- All 36 existing optional sourced tafsir editions. Download/select/remove, private offline storage, pinned source identity, archive checksums and size checks, ordered verse coverage and grouped-passage handling. No tafsir content is in the distribution bundle. Verse translations are permanently out of scope.
- Foreground device location with permission/timeout recovery, all 224,763 GeoNames places across 245 countries, offline city browsing/search, optional Apple Maps point selection with confirmation, and manual coordinates accepting Arabic/Persian digits. Selected location is shared by Adhan and Qibla. Coordinates stay on-device for calculations; map requests use Apple Maps instead of the cross-platform app's OpenStreetMap picker.
- Six prayer methods, standard/Hanafi Asr, explicit Umm al-Qura Ramadan interval, three high-latitude rules and opt-in polar approximation. Gregorian civil dates and device timezone/DST are used. Tomorrow's times are calculated independently; sunrise is not a prayer.
- True-north Qibla bearing, native heading sensor with an accuracy gate, shortest-turn rotation, Reduce Motion, live/fixed mode and labelled fallback. Magnetic-only readings are rejected instead of silently presented as true north.
- Opt-in local Adhan notifications with five existing sound choices and per-prayer sound switches; remaining today plus seven following dates are replenished on launch/resume/settings/day changes. Ordinary custom notification sounds stay below 30 seconds and follow Silent Mode and Focus.
- All 54 sourced adhkar entries across morning/evening/after-prayer collections; references, optional counters, and editable morning/evening/Salawat reminders with fixed times or daytime intervals and existing recorded phrases. Tapping collection reminders opens that collection. A 62-request shared budget reserves twelve nearest prayer alerts; two slots remain for tests. Open daily with frequent reminders, otherwise at least weekly.

The optional 38 machine-translated testing interface languages and experimental notification styles from the cross-platform app are not exposed in this edition. Quran text, published tafsir content and source attribution are unchanged. Native layout uses platform navigation and system WebKit SVG rendering rather than reproducing the web reader's exact floral frame or shared spread panning.

## Prepare and package from source

Development prerequisites: Node 22/npm dependencies, Python 3 for ZIP packaging. Opening-page artwork bounds are pinned to their exact source SHA-256. Inkscape is needed only if those source pages change; run `npm run swift:prepare -- --measure-opening-bounds` to refresh their measured bounds. These tools are needed only to regenerate the distribution, never on the user's iPad.

```sh
npm ci
npm run swift:prepare
npm run swift:check
npm run swift:package
```

`swift:check` verifies the configured iOS icon, separation of the Apple app graph from host tests, original source bytes, Quran coverage, every SVG/verse hit target and exact source paths, city counts, notification sound durations, actual Swift calculation tests app-source syntax, and the actual gzip decoder against all 606 pages plus damaged/truncated/oversized data. It uses a local Swift 6 compiler or the official `swift:6.0` image via Podman; the source language mode is Swift 5. `swift:package` checks the asset bundle and produces a ZIP with source, resources, instructions, licenses, byte count and SHA-256. It excludes caches, build products, credentials, partial files and resource-generation markers.

Vendored Adhan Swift is unmodified from `batoulapps/adhan-swift` commit `0bc10007aa215ead55e8ee294f9254f0dc2f9a7d`; retain [its MIT license](ADHAN-LICENSE) and upstream notices. Its sources are bundled locally so Playgrounds needs no package fetch. The Swift wrapper follows the current Rust app's six-method settings and 0.5° nearest-usable-latitude search; independent regional fixtures allow up to two minutes of algorithm/rounding difference.

## Verification status

Verified on the Linux host: Swift 6 compilation and seven calculation/scheduling tests; syntax parsing for every app Swift file; original content and generated-resource checks; all SVG artwork bytes against verified originals (only fitting viewBoxes differ); repository `npm run check` and both mobile exports. Separate executed Foundation checks cover accepted/rejected QuranEnc release metadata and the actual content model's decoding, Arabic/Persian number handling, search and saved-state validation.

The local Linux host has no Apple SDK, simulator or physical iPad. GitHub macOS build and simulator checks are being added; results are recorded after execution. This does **not** establish that the Apple app target builds, that Swift Playground preserves every app setting, or that audio, notifications, download cancellation and sensors behave correctly on a device. The complete source is prepared for that verification, not claimed to be an App Store-ready signed release.

On a Mac with Xcode, `bash scripts/check-swift-ios.sh` compiles the Adhan/core modules and typechecks all app source against the iOS simulator SDK. The dedicated `Swift iPad port` GitHub workflow runs this Apple SDK check, Swift tests, resource preparation, and an unsigned simulator app build with launch/reader smoke tests. The simulator project is generated from the same Swift source/resources; it does not verify Swift Playground’s app manifest/import UI or App Store signing. Open the `.swiftpm` package in Swift Playground/Xcode to build and run the actual application.

On an iPad, verify cold offline launch, reading/book persistence, Arabic/English RTL, all size/appearance choices, portrait/landscape zoom/turns, each reciter's playback and endings, loop cycles, interruption/headphone/lock-screen controls, all three tafsir formats, completed/cancelled/resumed downloads, device/manual/city/map location, true heading/calibration fallback, actual prayer/reference times, notification permission denial, scheduling/cancellation, Silent Mode/Focus, reminder routes, and relaunch/timezone changes. Check a TestFlight build on iPhone too before advertising iPhone support.
