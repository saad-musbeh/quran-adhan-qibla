# 0.3.6 — Quran library and reader improvements

- Six Quran books, each starting at Al-Fatiha with a separate saved page, name and bookmarks. Return to the library to use Adhan or Qibla.
- Consistent gold borders across the main screens and navigation.
- Visible ayah numbers in night reading.
- Pages follow vertical or horizontal dragging and advance only when released beyond halfway; shorter drags return to the same page.
- Faster first opening through asset warming, deferred tafsir loading and reuse of the reader.
- Ten reciter choices, selectable directly in the audio player.
- Labelled previous ayah, replay, play/pause, next ayah and stop controls.
- Four downloadable tafsir books, with original Hijri publication information and separate digital edition dates. Undocumented original first-print dates are identified explicitly.
- Reduced compass smoothing delay during large turns and less work per sensor sample.

74 JavaScript tests, 14 Rust tests, TypeScript, formatting, Clippy, Android/iOS asset exports and the Android APK build passed. Browser checks cover live drag, cancellation, night numeral colors and preservation of printed pages. All 114 surahs from each added tafsir source were checked; Al-Saadi passages retain their original paragraphs and overlap at Al-Kahf 99.

This is an Android test APK signed with the project's existing generated test key. Fresh native runtime checks were blocked by the emulator crashing at boot on this host. Physical-device compass response, audio behavior and native iOS remain unverified. The inspected sources do not establish original first-print dates for Al-Moyassar or Al-Nafahat; their verified digital source dates are shown separately.
