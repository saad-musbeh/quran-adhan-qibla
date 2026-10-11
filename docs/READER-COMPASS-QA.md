# Reader and compass verification — 0.3.0

The Android test build uses Expo SDK 57 / React Native 0.86.3, Android SDK 36, JDK 17, and ARM64 plus x86_64 Rust libraries. The test environment is an API 36 x86_64 emulator. Native iOS compilation requires macOS/Xcode and has not been performed here.

## Automated checks

`npm run check` covers TypeScript, Quran counts/page metadata, normalized search, exact text reconstruction after pagination, reciter cache isolation, repeat boundaries, coordinate/heading math, Rust formatting and Clippy, prayer/Qibla reference results, and WMM2025 declination against NOAA reference points. `npm run export:mobile` bundles JavaScript and assets for Android and iOS; it does not verify Swift compilation or iOS runtime behavior.

## Android observations

- The three top icons open language switching, shared location selection, and the gear sheet. Gear sections cover Quran, prayer calculations, and compass mode.
- At 320 × 568 dp, Quran text uses measured page portions with explicit next/previous controls. Quran text and the reader font are bundled; recitations are optional network streams or private downloads.
- The book icon opens a full-screen framed page. Al-Fatiha remained readable at 320 × 568 dp, with verse highlighting and explicit navigation. Surah names remain Arabic when the interface language is English.
- Page 1's last portion remained labelled part 2/2 when reached with the book navigation controls; a short final portion does not increase its page budget. Pause was confirmed by the native media session retaining its position (840 ms), and the lock-screen metadata showed `الفاتحة`.
- First streamed playback, automatic verse advance, 1.5× speed, and repeated Al-Fatiha 1:1 were exercised. The native media session reported playing position and reciter/verse metadata. Audio continued when the app was backgrounded.
- Al-Fatiha's seven audio files downloaded successfully. After disabling both Wi-Fi and cellular data and restarting the app, its cached first verse played and repeated. Downloads stay in private app storage, scoped by reciter.
- Foreground device location supplied Riyadh coordinates to the Rust bridge. Qibla returned 243.8°; fixed true-north mode keeps north at the top.
- Without a usable initial compass sample, the emulator showed an explicit fixed guide and a compass explanation. The watch now stays available for a later heading while the screen is active, because Expo Android can suppress an initial near-zero azimuth. This does not verify real compass alignment. Physical-device calibration, magnetic interference, sensor orientation, and GPS accuracy still require device testing.
- With a flat synthetic acceleration vector and changing magnetic-field vectors, live mode showed “LIVE · TRUE NORTH” and a phone-relative turn instruction. This verifies the Android sensor callback and UI path with simulated inputs, not physical compass precision.

## Download build

The final universal test APK contains ARM64 and x86_64 libraries, is 51.36 MB (48.98 MiB), and includes no MP3 recordings. Its signature, ZIP alignment and all 32 native libraries' 16 KB ELF load alignment were checked. Both Rust libraries contain the new declination C and JNI exports. Only the required Quran and icon fonts remain in the generated resources.

SHA-256: `ebee922eaf78b4aac4568bbe19f14aa95028d72439bdb691004acad5ded10029`.

## Remaining platform checks

Test a physical Android phone and iPhone for compass calibration and movement, foreground/background sensor cleanup, Bluetooth/audio interruptions, lock-screen controls, and extended background recitation. No camera permission, microphone permission, or background location permission is needed. Android test APKs use the generated debug signing key and are intended for testing, not store distribution.
