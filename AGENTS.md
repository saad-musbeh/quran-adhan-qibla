# Project guidance

This is the Quran, Adhan, and Qibla app for iOS and Android. It is an early scaffold; check README.md and docs/ROADMAP.md before describing features as complete.

- React Native/TypeScript handles screens and platform interaction. Shared deterministic calculations live in crates/islamic-core.
- The local Expo module in modules/islamic-core connects Rust through Kotlin/JNI and Swift/C. Preserve JNI names and release keep rules.
- Arabic is the default UI language. Update English and Arabic strings together and respect RTL layouts.
- Quran verse translations are permanently out of scope. Do not add them or put them on the roadmap. Interface localization and the existing sourced tafsir library remain supported.
- Use verified Quran content with documented provenance. Do not invent verses, recitations, or prayer times.
- Qibla bearings are clockwise from true north; do not present a static bearing as a live compass.
- Keep generated root ios/ and android/ directories, native binaries, target/, node_modules/, and credentials out of Git.
- Run npm run check and npm run export:mobile for relevant changes. Native changes require platform builds when SDKs are available; report unverified native behavior explicitly.
- Use focused commits and codex/ branches for follow-up work. Add meaningful tests for calculations and behavior, without tests that only repeat implementation.
