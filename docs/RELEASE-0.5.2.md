# 0.5.2 — Compact controls and high-latitude prayer settings

Version **0.5.2**, Android version code **21**, iOS build **21**. Includes merged PR [#8](https://github.com/saad-musbeh/quran-adhan-qibla/pull/8).

## Changes

- Shorten location/mode buttons and Qibla spacing, retaining accessible touch targets and scrolling for larger text. Share one location strip between Adhan and Qibla, with device refresh, city search, map selection and manual coordinates in its picker.
- Animate the compass between sensor samples using native transforms and the shortest turn across true north. Respect Reduce Motion and retain clearly labelled fixed guidance during calibration or missing readings. The numeric Qibla bearing remains clockwise from true north.
- Put shared light/dark appearance in the banner. Simplify Quran tools, widen search, remove the separate reading-mode button and enter page/juz numbers inline. Reject invalid entries without changing pages and keep unchanged juz fields from causing unexpected jumps.
- Fit the Quran audio controls on narrow screens with long localized reciter labels. Retain the original verified Quran text, SVG paths, offline pages and recitation sources. Declare UTF-8 in the Mushaf HTML so Arabic metadata also renders correctly in standalone browser documents.
- Add middle-of-the-night, one-seventh-of-the-night and twilight-angle limits. At or beyond 65°, explicitly opt into nearest usable latitude for polar estimates. Existing preferences keep middle/night and no polar approximation. Today's, tomorrow's and locally scheduled alerts use the same selected rules; method-specific fixed Isha and Moonsighting behavior remain. See [high-latitude behavior](HIGH-LATITUDE.md).
- Add an offline **Settings → Privacy** page explaining saved location/preferences, optional network services, local notifications and data removal. See [privacy details](PRIVACY.md).
- Keep Arabic Quran content and 40 interface languages. New localized interface strings are machine-assisted drafts awaiting native-speaker review. Quran verse translations are permanently excluded.

## Installation

Install the ARM64 APK for ARM64 Android phones, x86_64 for compatible devices/emulators, or the universal APK when unsure. Package identity, storage keys and the existing signing certificate are retained. Install over the existing app to retain local data; do not uninstall or clear storage during an upgrade. The higher Android version code permits upgrading from 0.5.1 and earlier builds.

The GitHub release includes all three signed APKs, tracked source and SHA-256 checksums. This is not a store submission. For Mac/iPhone setup, use [IOS-TESTING.md](IOS-TESTING.md).

## Validation and limits

The follow-up passes TypeScript, locale/placeholder auditing, 137 JavaScript behavior tests, Rust formatting/Clippy and 17 Rust tests. Android and iOS JavaScript exports pass. [Interface/renderer QA](NAVIGATION-HIGH-LATITUDE-QA.md) records 56 narrow-screen reader/Qibla combinations and 100 actual Mushaf page/spread theme cases, including appearance toggles and dark verse actions. Those source checks used browser rendering and mocked platform services; they do not establish physical sensor response or native WebView behavior.

Versioned release APKs are rebuilt and audited before publishing: version 0.5.2 / code 21, existing signing certificate, current Hermes bundle and Rust libraries, ZIP and ELF 16 KB alignment, all 604 exact offline Quran pages and six exact Android OGG Adhan recordings. The app retains all 6,236 verified verses and 224,763 offline places.

Native phone validation of this new revision remains pending. The user reported completing the earlier 0.5.1 phone follow-up, is reviewing interface translations and plans iOS testing for the weekend. Local Android runtime checks remain unavailable because the installed emulator crashes before app launch and no phone is attached. Native iOS compilation/runtime for this revision is not verified locally on Linux; GitHub's macOS simulator checks are tracked separately and iPhone testing remains pending. Published Android APKs are not iOS builds.
