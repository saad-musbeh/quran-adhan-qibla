# 0.6.4 — continuous surah playback and Al-Fatiha ending

Version **0.6.4**, Android code **27**, iOS source build **27**. This includes the changes from the local 0.6.3 test build, which was not published as a hosted release.

## Playback changes

- Main Play and selecting ayah 1 start one complete surah recording. This removes per-ayah file switches while preserving the reciter’s natural pauses. **Play full surah / تشغيل السورة كاملة** is also available in the player.
- Normal playback stops at the selected surah’s end. **Next surah** and **Repeat surah** are explicit session choices; an older saved continuation setting no longer carries into a new app launch.
- Downloads include a complete-surah recording and individual ayah files for exact ayah/range loops. In older ayah-only downloads, **Manage downloads → Saved → Continue download** adds the full recording without downloading saved ayahs again.
- Ghamdi’s full Al-Fatiha ends at an audited **42.000-second** boundary, after the final ayah and before the recorded Ameen. This applies to streams, existing downloads, repeats and next-surah playback. Android and iOS enforce the end in their native players, including background playback; the original MP3 remains unchanged and existing full downloads do not need replacement. Player duration and seek controls respect the same end.
- The boundary is specific to MP3Quran read 30, Al-Fatiha. The source’s seventh-ayah timing, waveform alignment against EveryAyah’s separate final-ayah file, recording hashes and the twenty-voice source/metadata audit are documented in `assets/quran/fatiha-ending-verification-2026-10-17.json`. Audio after a final timing row is not treated as proof of Ameen in another voice. Other reported voices require their own verified boundaries.
- Optional source timings provide highlights and ayah seeks within the full recording. Missing or invalid timing data disables those controls rather than inventing a verse position. The selected Maher/Jibreel editions lack timing rows; some Al-Fatiha timing sets also fail canonical coverage validation. Exact ayah/range playback remains available. Voice changes restart a full surah because recording times differ.

## Validation and limits

- `npm run check`: TypeScript, localization, **172 JavaScript tests**, Rust formatting/Clippy and **20 Rust tests** pass.
- **16 Android native unit tests** pass. Coverage includes applying ends by URI, keeping unrelated recordings intact, and preserving the end across repeat/seek commands. The Android instrumentation APK compiles with real-file streaming/download tests for the 42-second end at 1.25× and full-recording tests for the final three surahs.
- Controller regressions cover continuous playback, pause/resume, stopping, retries, cancelled loads, older-download upgrades, exact ayah/range switching, timed navigation and the Ghamdi end on local/streamed sources in Stop/Next/Repeat modes.
- Android and iOS JavaScript exports are required before publication. Android release APKs retain the package ID and local-testing signing key used by 0.6.2; install over the existing app to retain its data. The bridge signature changed, so native 0.6.4 binaries must accompany the new JavaScript.

The local Android emulator segfaulted before application startup in the preceding test session. Native playback instrumentation is also run through repository CI. Physical-phone listening, lock-screen behavior on the reporting phone and native iOS playback require follow-up. No signed iOS device binary is included in the Android release.

## Phone follow-up

1. With سعد الغامدي selected, play Al-Fatiha at 1× and 1.25×. Confirm the final word is complete, Ameen is excluded, and Stop ends playback.
2. Check Repeat and Next surah, including while the screen is locked. Reopen the app and confirm the mode starts at Stop.
3. Repeat with an existing full-surah download and internet disabled. Check individual ayah/range loops separately.
4. Start Al-Ikhlas, Al-Falaq and An-Nas as full recordings and confirm no per-ayah file changes or unexpected following surah in Stop mode.
