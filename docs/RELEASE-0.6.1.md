# 0.6.1 — Closing dua and Arabic text fixes

Version **0.6.1**, Android code **24**, iOS build **24**.

## Changes

- Add the complete **دعاء ختم القرآن** after the 604 Quran pages, transcribed from the two supplied photos. Both closing sheets support forward/back turns, zoom, night mode, saved positions and bookmarks. They remain separate from the Quran's page count, verse text, audio and tafsir targets.
- Correct the closing dua's overlapping rows. Lettering is shaped into fixed vector outlines and fitted to measured ink bounds with clear space between rows; font loading cannot shift it. Keep all original 604 Quran assets unchanged.
- Backport the Android 15+ text-wrapping correction across ordinary and selectable text. Give surah names/numbers, Asr choices, Adhkar titles, menus and navigation appropriate width and spacing. Let the banner and navigation grow with enlarged text.
- Replace synthetic Salawat speech with selectable recorded excerpts from the supplied reference. Add start/end time controls and a daytime interval wheel. Existing chosen reminder times and notification preferences remain saved.
- Harden reminder permission states, test-alert preservation and serialized reconciliation. Respect the iOS pending-notification budget when frequent Salawat reminders are enabled.
- Contain Rust FFI panics at the C/JNI boundary, match native Quran audio titles by media URI, and release the playback session when the task is removed. Share the existing calculation and Quran content without modifying source verses.

Arabic and English interface labels are supplied together. The 38 optional testing locales retain English fallback labels for additions pending review.

## Sources

The closing dua is sourced from the user-supplied printed pages; its words are retained without vowel marks, with no claim that the complete compilation is a Prophetic hadith. See [Quran and dua provenance](QURAN-DATA.md).

The five recorded Salawat phrases come from the user-provided reference video. **No public redistribution licence was supplied**; they are not described as CC0 or covered by the code's MIT licence. The licensed Adhan recordings and generated CC0 chime retain their separate terms. See [audio provenance](../assets/adhan/PROVENANCE.md) and the [phrase manifest](../assets/adhan/salawat-phrases-manifest.json).

## Verification

- Host checks cover TypeScript, localization completeness/placeholders, **160 JavaScript behavior tests**, Rust formatting/Clippy and **20 Rust tests**. Both mobile exports pass.
- An additional **26 mocked hook/notification tests** pass for heading, device location, notification queues and reminder reconciliation. These are host simulations, not phone delivery tests.
- The dua's production reader was checked in 64 combinations of both sheets, Arabic/English UI, light/dark appearance, four viewport sizes and two zoom levels. Thirteen touch swipe transitions were checked against the page-turn controller, including portrait/landscape boundaries and reopening either closing sheet. New tests check the actual outline bounds for overlapping rows and ensure every supplied word survives offline compression.
- The shared Android text fix has native Robolectric manager, recycling, drawing and compatibility checks. Broader text layouts were previously checked in 528 screen variations. See [text layout QA](TEXT-LAYOUT-QA.md).
- Android APKs are built with R8 shrinking and a fresh JavaScript/asset bundle. The content audit verifies all 604 Quran pages, both closing dua sheets, 12 notification sounds and a Rust library for every included ABI; Android must contain no iOS WAV excerpts.

The release PR records current CI results. Local Android emulators fail during startup on this host, so local browser and Robolectric checks do not establish physical-phone behavior. Physical Android/iPhone audio, background notification delivery and the reporting TECNO phone still need follow-up. iOS source uses build 24; native simulator results are recorded separately from JavaScript exports. The existing iOS book-name/full-download and broader iPad checks are not claimed fixed here.

## Installation

Install the architecture-matching APK over 0.6.0 to retain saved books, bookmarks, audio downloads, location and settings. The Android package ID and local-testing signing certificate are unchanged. The APKs use the existing local-testing key; store distribution requires the project's own release signing. iOS physical installation requires Apple signing/provisioning on a Mac. The source tag is `v0.6.1`.
