# 0.4.8-test

- Fix the immediate startup crash in 0.4.7. The full offline city catalogue is compiled as bounded arrays, avoiding Hermes’ large array-literal boundary. All 224,763 source records, fields and their order are preserved; no cities are removed.
- Open Home on new installations. Phones with Home explicitly disabled open Adhan. Saved reading positions, books, reciter choices, location and appearance preferences are retained.
- Use Mahmoud Khalil Al-Husary as the first/default reciter for new installations, from the existing EveryAyah recording directory. Existing saved voices remain selected.
- Show remaining hours/minutes for each salah’s next occurrence, including Asr in the morning. Elapsed prayers show tomorrow’s independently calculated time and a Tomorrow label. The next Adhan stays at the top in portrait and physically on the right in landscape; after Isha it shows tomorrow’s Fajr.
- Refresh countdowns on foreground/resume and each minute while Adhan is visible. Hidden/background screens do not keep countdown timers running.
- Show the selected city prominently on Adhan and open location choices when it is tapped. Device/map/manual fixes use an explicitly approximate Near label for a sourced catalogue place within 50 km, or coordinates when farther away. The lookup works offline.
- Update English, Arabic and the remaining interface catalogues together. Additional translations remain machine-assisted drafts awaiting native-speaker review.
- Version **0.4.8**, Android version code **18**, iOS build **18**, with the existing package/signing identity and storage keys.

## Validation

The source passes TypeScript, the localization/placeholder audit, **129 JavaScript tests**, Rust formatting/Clippy and **14 Rust tests** through `npm run check`. Android and iOS JavaScript/asset exports pass through `npm run export:mobile`.

The city regression verifies bounded literals and exact SHA-256 equality of the complete flattened source snapshot and ordered IDs. Isolated Hermes compilation uses a maximum city literal capacity of 4,096 with a maximum dense index of 4,095.

The exact released 0.4.7 APK was installed and reproduced the immediate `countryCode` startup exception on an isolated Android API 36 emulator. The rebuilt 0.4.8 APK installs over it and passes three consecutive cold starts with an empty crash log. Native UI hierarchy checks verify fresh Home startup, saved phone Home opt-out opening Adhan, worldwide Riyadh search results, the prominent city label, morning Asr countdown, all five salah countdowns, tomorrow Fajr after Isha physically on the right in tablet landscape, and immediate countdown refresh on foreground resume. Seeded saved reciter, book page/bookmark, location and Home preferences remain intact. The isolated emulator clock is restored to automatic time after night/resume checks.

The packaged Hermes bundle matches the generated release bundle. All twelve Adhan sound hashes match source assets; both Rust ABIs and three JNI exports are preserved. All 34 native libraries pass 16 KB ZIP and ELF LOAD alignment. The signing certificate matches previous releases. API 36 native hierarchy/behavior checks establish these paths; the headless emulator returned black screenshots, so they do not establish a full visual review.

## Downloads and limits

Download the APK, source ZIP and SHA-256 checksums from this release. Install the APK over the existing app to retain saved data. Do not uninstall or clear app storage as part of this update. Mac/iOS setup is in [the testing guide](https://github.com/saad-musbeh/quran-adhan-qibla/blob/v0.4.8-test/docs/IOS-TESTING.md).

This is a prerelease using the existing development signing identity. Physical-device GPS, compass and notification sound behavior, native iOS compilation/runtime of 0.4.8, and older iOS book-name/full-download issues remain unverified. JavaScript exports do not establish native iOS behavior.
