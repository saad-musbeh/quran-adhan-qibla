# 0.4.6-test

- Fix reverse Quran page turns caused by neighbor preloading evicting the previous page. Keep the nearest pages in the bounded five-panel cache.
- Sequence page-turn messages so delayed React/native acknowledgements cannot drop rapid turns or restore an older page. Save the displayed destination, including two-page tablet spreads.
- Keep the language/location/settings banner visible during reading and add a permanent bottom player with previous, replay, play/pause, next, stop, loop and full-player controls.
- Retain the 0.4.5 short deliberate swipe threshold, app-wide text sizing, source-proportioned Quran artwork, tablet/landscape layouts, system Android location and source-backed multilingual tafsir. Enlarged pages still pan and turn outward from a page edge.
- Resolve issue #5: the newer Quran/library/download menu messages have translations in all 33 additional languages. Make the AST call-site/catalogue/placeholder audit part of `npm run check`, with regression tests for the reported French, Urdu, Indonesian and Turkish labels. Interface translations remain drafts awaiting native-speaker review; source Quran and tafsir passages are preserved.
- Fix the stale catalogue test that blocked PR #7's checks. Validate the expanded catalogue's original editions, pinned archive descriptors, source hashes/licences and language ordering.
- Version 0.4.6, Android version code 16 and iOS build 16. Package identity, signing certificate and storage keys are retained. Tafsir archive URLs remain pinned to `v0.4.3-test`.

## Validation

`npm run check` passes TypeScript, the localization audit (584 active messages, 600 IDs per catalogue, no missing entries or placeholders), 84 JavaScript tests, Rust formatting/Clippy and 14 Rust tests. Both mobile JavaScript/asset exports pass. Browser renderer checks cover page cache/acknowledgement regressions, rapid and short gestures, zoom panning, smaller text sizes, tablet spread steps, artwork, ayah actions and themes. A deliberately uncatalogued UI message was rejected by the new required audit.

The Android release APK builds with ARM64/x86_64 Rust libraries and the system location module. Its manifest reports 0.4.6/build 16. Android emulator checks cover library navigation, all six books, four-direction and rapid page turning, persistent banner/player controls and saved page destinations. Signing and 16 KB ZIP alignment are checked before publishing.

## Downloads and limits

The prerelease includes the Android test APK, a source ZIP for the Mac/iOS tester and SHA-256 checksums. Follow [the iOS testing guide](IOS-TESTING.md) for the source build. The APK uses the existing development signing identity for sideloaded testing.

The physical Honor device and physical tablet behavior remain unverified. Native iOS validation is tracked by GitHub Actions and is not claimed from successful JavaScript exports. Earlier iOS book-name typing and whole-Quran download checks remain unresolved; native-speaker review and physical-device compass/notification checks remain pending.
