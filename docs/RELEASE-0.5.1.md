# 0.5.1 — More languages and a redesigned Qibla compass

Version **0.5.1**, Android version code **20**, iOS build **20**.

## Changes

- Add **Saraiki, Oromo, Kurmanji, Uyghur and Wolof**, bringing the interface to **40 languages**. Saraiki and Uyghur use RTL layouts; Kurmanji remains separate from Sorani. Interface and prayer-notification catalogues preserve interpolation variables. These are machine/AI-assisted drafts awaiting native-speaker review; Quran text stays Arabic. See [localization provenance](LOCALIZATION.md).
- Redesign the whole Qibla page with a circular compass, prominent bearing, direct phone-compass/fixed-north controls, calibration/turn guidance and a location card that opens the shared picker. The numeric bearing remains clockwise from true north. Live status and alignment appear only with an accepted heading; calibration or unavailable sensors retain a clearly labelled fixed guide.
- Improve light appearance across all five colors with white surfaces, subtle tinted backgrounds/borders, readable secondary text and contrasting selected navigation. Use distinct guidance/position colors for the compass. Quran paper and night-reading colors remain independent.
- Retain the smaller 0.5.0 APK packaging, all **604 offline Quran pages**, **6,236 verses**, **224,763 places** and **six Android Adhan recordings**.

## Installation

Use the **ARM64 APK** for ARM64 Android phones, the **x86_64 APK** for compatible devices/emulators, or the **universal APK** when unsure. App identity, storage keys and the existing development signing certificate are retained. Install over the existing app; do not uninstall or clear storage during an upgrade. This GitHub release is not a store submission.

Source ZIP and SHA-256 checksums are included. Mac/iPhone setup: [IOS-TESTING.md](IOS-TESTING.md).

## Validation and limits

The versioned artifacts pass `npm run check` (TypeScript, catalogue audit, **131 JavaScript tests**, Rust formatting/Clippy and **14 Rust tests**) and `npm run export:mobile` for Android and iOS. Native Android release builds and packaging audits pass for ARM64, x86_64 and universal APKs. Each identifies itself as **0.5.1 / code 20**, matches the existing signing certificate, contains the same final compiled JavaScript and retains all 604 exact packed Quran pages and six exact OGG recordings. ZIP alignment and every native ELF load segment pass 16 KB checks. Rust library bytes match the preceding development APKs. Linux iOS project generation verifies **0.5.1 / build 20**, all six exact WAV excerpts, no Android OGGs and no APNs entitlement; it does not compile or run iOS.

Visual checks on the underlying source revision rendered the actual Qibla component through React Native Web with mocked heading/location services: portrait/landscape, light/dark themes, RTL, larger text, live/fixed status, turn/alignment guidance and error states. These checks do not establish native sensor behavior. See [redesign QA](QIBLA-REDESIGN-QA.md).

Native runtime/upgrade testing for this revision remains pending because the installed Android emulator crashes with a native SIGSEGV before app launch. The 0.5.0 direct-upgrade checks from commonly installed 0.4.5/0.4.6 remain historical evidence; they are not new 0.5.1 runtime results. Physical-device GPS/compass, notification delivery/sound and native iOS builds/runs remain unverified. The translations require native-speaker review, particularly the separate Saraiki draft and low-resource translation corrections.

## Downloads

- **ARM64 phone: 95.62 MiB** (100,268,521 bytes), `quran-adhan-qibla-v0.5.1-arm64-v8a.apk`.
- **x86_64: 95.73 MiB** (100,375,330 bytes), `quran-adhan-qibla-v0.5.1-x86_64.apk`.
- **Universal (ARM64 + x86_64): 101.38 MiB** (106,300,338 bytes), `quran-adhan-qibla-v0.5.1.apk`.
- Tracked source: `quran-adhan-qibla-v0.5.1-source.zip`.
- SHA-256 checksums: `quran-adhan-qibla-v0.5.1-SHA256SUMS.txt`.
