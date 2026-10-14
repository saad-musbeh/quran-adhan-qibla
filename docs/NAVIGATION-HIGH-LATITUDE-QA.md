# Compact controls, compass and high-latitude follow-up

Validated 14 October 2026 on `codex/compass-reader-high-latitude`, based on the published v0.5.1 source. `main` was fast-forwarded to that release before starting this work. This follow-up has not replaced the v0.5.1 GitHub release.

## Source and calculation checks

`npm run check` passes TypeScript, complete locale/placeholder auditing, 137 JavaScript behavior tests, Rust formatting/Clippy and 17 Rust tests. `npm run export:mobile` exports Android and iOS successfully. New prayer tests cover the three twilight limits, saved preference migration, polar opt-in, both hemispheres, requested-day timestamps, C ABI results and invalid flags. Existing prayer reference fixtures remain unchanged. See [high-latitude behavior](HIGH-LATITUDE.md).

## Interface checks

The T3 collaborative browser used the actual React Native components through React Native Web with mocked device heading, location, safe-area/font loading and audio services. These checks verify interface behavior, not native sensor or audio operation.

- At 320 × 740, Arabic, English, Saraiki, Uyghur, Kurmanji, Oromo and Wolof were checked in both appearances with default and 1.45× app text size. Quran and Qibla had no horizontal document overflow in these 56 combinations. The reciter button now has a bounded width, retaining a full accessibility label.
- Shared location and Qibla mode buttons measure 44 points at default Arabic text size. Long location names stay on one line with the complete name in the accessibility label. Large text can expand other controls; Qibla remains scrollable. At 740 × 360, enlarged Arabic controls also fit horizontally.
- Arabic page `١٠٠` navigates to page 100; juz `٣٠` navigates to the verified first page 582. Page `٦٠٥` displays an error and leaves the current page unchanged. Focusing and leaving an unchanged juz field does not jump to its opening page. No navigation modal opens for these fields.
- The shared banner appearance switch changes the reader’s effective night mode without altering its saved page or bookmarks. Arabic search returns the bundled verified verses with light text on dark surfaces. Tafsir catalogue surfaces follow all five themes in both appearances; sourced tafsir content and download/network operation were not exercised here.
- High-latitude radio controls update the selected twilight and polar rules. Both location strips call the same picker action.
- The dial animates across north from `rotate(-359deg)` through intermediate values to `rotate(-361deg)`, avoiding a full turn. Calibration resets to `rotate(0deg)` and shows a fixed guide. Native-driver timing and physical sensor response still require phone verification.

## Actual Quran renderer

A separate standalone browser document used the app’s actual `buildMushafDocument` / `MUSHAF_RUNTIME`, decompressed original SVGs and bundled Amiri font. The component shell’s mock page image was not used for this check.

- Pages 1, 2, 68, 69, 599 and 604 passed 60 combinations of five themes and both appearances. Source calligraphy, paper, verse numerals and page metadata remained visible; calligraphy contrast was at least 8.86:1 in the sampled source glyphs. Repeated appearance changes preserve the SVG DOM. Source paths and Quran text were not edited.
- Opening, middle and final two-page spreads passed 40 theme/appearance combinations at 740 × 360, including switching both leaves together and activating cached spreads without horizontal overflow.
- On dark page 604, the actual verse action menu opens and emits the correct tafsir key `112:1`. The document now declares UTF-8 explicitly so Arabic labels also display correctly when served as standalone HTML.

## Native verification limits

Android release compilation succeeds for ARM64, x86_64 and the two-ABI universal APK. Integrity checks confirm the release signing certificate, current Hermes bundle, freshly compiled Rust input/output, 16 KB ZIP/ELF alignment, all 604 original compressed Quran pages and all six Android Adhan recordings. No Android device was attached for this follow-up. The previous local emulator crashes before launching the app, so native compass motion, Android WebView rendering, permission recovery and alert delivery for this revision remain unverified locally. An iOS build/runtime check requires macOS and is still pending.

The user reported completion of the v0.5.1 phone follow-up, is reviewing interface translations, and plans iOS testing for the weekend. Those reports do not substitute for testing this new revision. New localized interface strings remain machine-assisted drafts; Quran verse translations are permanently excluded.

## Android preview artifacts

These development builds retain package version 0.5.1 / Android code 20 and the existing signing key; they have not replaced the GitHub release assets.

| Build | Size | SHA-256 |
| --- | --- | --- |
| quran-controls-preview-arm64-v8a.apk | 95.68 MiB | `4c7d46ccc73c3f50f12c0aeef2d2c9b0e0fb2bd3ebe8a3841244142010c7eacc` |
| quran-controls-preview-x86_64.apk | 95.78 MiB | `c829a3bd7b1eb08fcc33448b7a641491b43904821007dfe7094a1e261193033c` |
| quran-controls-preview-universal.apk | 101.44 MiB | `801b0f6a0539c5c69211fbc0e9069bf47a88c04397890b4902155b37009ba8db` |
