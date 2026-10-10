# Contributing

Open an issue for a proposed feature or a bug, then send a focused pull request. Include steps to reproduce bugs and describe the visible behavior changed by a PR.

Use Node.js 22 and Rust. Run `npm ci`, then `npm run check` and `npm run export:mobile` before submitting changes. Native changes also need an Android or iOS development build and a device/simulator check; say which platforms you tested.

Keep Arabic and English copy together in `src/i18n.ts`. Check both languages, large text, and small screens. Shared calculations belong in Rust; UI and OS permissions belong in the mobile app/native module.

Add meaningful reference cases for calculation changes. Include timezone, calculation method, and location when testing future prayer times. Never substitute guessed scripture or placeholder prayer times for verified content.

Before adding a dataset or media asset, record its source, version, checksum, attribution, and redistribution terms. Keep credentials, signing files, generated native projects, build outputs, and personal location data out of commits.

By contributing code, you agree to make it available under the project's MIT license. Keep third-party license notices with any imported material.
