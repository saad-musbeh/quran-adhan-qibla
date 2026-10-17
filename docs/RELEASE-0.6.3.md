# 0.6.3 test build — continuous surah playback

Version **0.6.3**, Android code **26**, iOS source build **26**. This is a local test build; no tag or hosted release has been published.

## Changes

- Main Play and starting ayah 1 use one full-surah MP3 from the selected reciter's published MP3Quran Hafs murattal edition. **Play full surah / تشغيل السورة كاملة** is also available in the player. This removes file switches between ayahs; natural pauses in the original recording remain.
- Stop queues only the selected surah. Next and Repeat remain explicit choices for the current session; older saved continuation settings do not carry into the next app launch. Full-surah playback clears ayah loops; exact ayah and range playback remain available.
- Downloads include the full recording and individual ayahs. Older downloads can add the full recording through **Manage downloads → Saved → Continue download**, retaining existing ayahs. The full recording is necessary for continuous offline playback.
- Optional source timings provide highlighting and ayah seeks in the same recording. Missing or invalid timings disable those controls rather than inventing an ayah position. The selected Maher and Jibreel editions have no published timing rows. Voice changes restart the full surah.
- Add source links, privacy disclosures, Arabic/English labels, and the corresponding optional testing-language drafts. Make the expanded player scroll within the available screen height.

## Verification

- `npm run check` passes: TypeScript, localization, **170 JavaScript tests**, Rust formatting/Clippy and **20 Rust tests**.
- Controller regressions run the production hook with React lifecycle and mocked native IO. They cover one-file playback, old Next preferences, pause/resume, end-of-surah stop, retry position, cancellation during loading, upgrading older downloads, timing highlights and same-file ayah navigation, plus range/full-surah switching.
- `npm run export:mobile` passes for Android and iOS.
- The universal release APK builds with R8 shrinking and valid local-testing signing: **99.30 MiB**, package `org.saadmusbeh.quranadhanqibla`, version 0.6.3 / code 26. Its packaged JavaScript was compared byte-for-byte with the final generated bundle after the last source change. The content audit verifies all 604 Quran pages, both dua pages, twelve notification sounds and both Rust ABIs.
- Android's **13 native unit tests** pass; the native instrumentation APK compiles, including a new full-surah regression for Ghamdi's Al-Ikhlas, Al-Falaq and An-Nas from local files and streams at 1.25×.
- All twenty selected catalogue editions list all 114 surahs; each Al-Ikhlas audio endpoint returned HTTP 200 `audio/mpeg`. Ghamdi and Al-Husary's full 112–114 recordings were downloaded to temporary local test storage and decoded with FFmpeg without errors. No Quran audio was added to Git or app assets.

The local Android emulator **segfaulted during host startup, before boot/application playback**. Instrumentation playback and listening on the reporting phone remain unverified. No native iOS build or device test was possible on this Linux host. These automated checks do not establish that all phone audio-output issues are resolved.

Local installer: `dist/android/quran-adhan-qibla-0.6.3.apk`. SHA-256: `604754956fde16fc7102f96eb51b7c85fcc75b6aaf5038a7f7496d4e6bb8ee73`.

## Phone follow-up

1. Install the matching 0.6.3 APK over the existing app.
2. On the final Quran page, start Al-Ikhlas using Play or its first ayah. Confirm it plays as one recording and stops without starting Al-Falaq.
3. Open the player, explicitly choose Next surah, and check Al-Ikhlas → Al-Falaq → An-Nas. Reopen the app and confirm the mode is back to Stop.
4. Add the full recording to an older surah download through Continue download, turn internet off, and repeat playback, pause/resume and stop at 1× and 1.25×.
5. Check a selected ayah range still repeats independently; choosing Play full surah should clear that loop.
