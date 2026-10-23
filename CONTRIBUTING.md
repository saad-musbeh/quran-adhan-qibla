# Contributing

Open an issue for a proposed feature or a bug, then send a focused pull request. Include steps to reproduce bugs and describe the visible behavior changed by a PR.

Use Node.js 22.13+ within version 22 (see `.nvmrc`) and Rust. Work on a focused `codex/` branch. Run `npm ci` with install scripts enabled: it applies the required dependency-security and Expo Audio patches. Then run `npm run check` and `npm run export:mobile` before submitting changes. See [dependency security](docs/DEPENDENCY-SECURITY.md) for the patches and remaining audit warnings.

Native changes also need builds and device/simulator checks for the affected platforms when their SDKs are available. Report what you tested and any native behavior left unverified. JavaScript exports do not compile Swift or Kotlin. See the [Android build instructions](README.md#android-development-build) and [iOS testing guide](docs/IOS-TESTING.md).

Keep Arabic and English copy together in `src/i18n.ts` and the relevant components or dedicated Adhkar/notification catalogues. Keep the English message IDs in `src/locales/en.json` and the other locale files aligned; use `node scripts/localization-audit.mjs --write-en` to register new English messages before updating the matching entries in the other catalogues. Check RTL, both languages, large text, and small screens, and run `npm run localization:check` for catalogue completeness. The 38 opt-in testing languages remain drafts awaiting native-speaker review. Shared calculations belong in Rust; UI and OS permissions belong in the mobile app/native module. Preserve JNI names and Android release keep rules when changing the bridge.

Add meaningful reference cases for calculation changes. Include timezone, calculation method, and location when testing future prayer times. Never substitute guessed scripture or placeholder prayer times for verified content.

For hook behavior, use `src/test-support/react-hooks.ts`, which runs production hooks through React's test renderer with effects and cleanup. Host tests use native-module stubs; they cannot establish notification delivery, compass accuracy or native audio behavior. Run `npm run test:ios:harness` to check the iOS test runner without Xcode; it is also included in `npm run check`.

Quran verse translations are permanently out of scope. Interface localization and the existing sourced tafsir library remain supported. Update the [README](README.md), [roadmap](docs/ROADMAP.md) and relevant behavior/provenance documents when changing a feature; distinguish implementation from host, simulator and physical-device verification.

Before adding a dataset or media asset, record its source, version, checksum, attribution, and redistribution terms. Keep credentials, signing files, generated native projects, build outputs, and personal location data out of commits.

By contributing code, you agree to make it available under the project's MIT license. Keep third-party license notices with any imported material.
