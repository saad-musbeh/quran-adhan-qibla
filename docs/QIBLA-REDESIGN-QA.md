# Qibla redesign and additional locales

Checked on 14 October 2026, following the 0.5.0 release. These changes are development source and test APKs, not a replacement for the published 0.5.0 release assets.

## Changes

- Forty language choices: added Saraiki, Oromo, Kurmanji, Uyghur and Wolof interface/notification drafts. Saraiki and Uyghur are RTL; Kurmanji is separate from Sorani. All 682 catalogue messages and placeholders are present. Existing catalogue values were retained. See [translation provenance and review limits](LOCALIZATION.md).
- A circular compass replaces the perspective landscape. The true-north bearing remains prominent; the dial rotates relative to an accepted heading only. Direct live/fixed controls share the saved settings, and the location card opens the existing picker.
- Light palettes use white surfaces, subtle tinted backgrounds/borders and readable secondary text. Selected navigation has a contrasting fill. The Qibla dial has explicit guidance/position colors in both appearances. Quran paper and night-reading colors are retained.

## Verification

`npm run check` passed: TypeScript, catalogue audit, 131 JavaScript tests, Rust formatting/Clippy and 14 Rust tests. `npm run export:mobile` passed for Android and iOS. Added checks cover locale search, RTL/swipes, notification copy, Gregorian formatting, interpolation and compass/palette contrast.

Android release builds passed for ARM64, x86_64 and the two-architecture universal APK. Measured sizes are 95.62 MiB, 95.73 MiB and approximately 101.38 MiB. APK audits verify all 604 offline Quran pages and six Adhan recordings. All three contain the same final compiled JavaScript; the ARM64 signing certificate matches the published releases.

The actual `QiblaScreen.tsx` was also rendered through React Native Web in a local, ignored review harness. Heading and location services were mocked; this verifies presentation and interactions, not native sensors. Checks covered:

- 320-pixel portrait width, English/Arabic plus the five new languages, light/dark mode and default/maximum app text size: no horizontal overflow, mode buttons fit and content scrolls.
- Landscape across all five colors in light/dark mode.
- Simulated ready heading: a 230.3° bearing and 240° heading display “Turn left 10°”; alignment appears only for a ready matching heading. Switching to fixed mode retains the true-north bearing and changes the status.
- Calibration fallback remains visibly labelled as fixed. Location-card presses invoke the picker callback.
- No-location, permission-denied, unavailable-calculation and calculation-error layouts; invalid/unavailable results show no compass.

## Remaining device checks

The installed Android emulator exits with a native SIGSEGV before app launch, across Google APIs/ATD images, GPU settings and accelerated/software CPU modes. Native runtime checks for this revision could not be completed here. Physical Android compass/GPS checks and native iOS builds/runs remain pending. Translation quality still needs native-speaker review, particularly the AI-authored Saraiki draft and corrections to low-resource machine translations.
