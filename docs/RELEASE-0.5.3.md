# 0.5.3 — iOS testing follow-up

Version **0.5.3**, iOS build **22**, Android version code **22**, on `codex/ios-test-0.5.3`. This is a testing source revision; a physical iPhone build requires the tester’s Apple signing/provisioning. See [Mac/iPhone setup](IOS-TESTING.md).

## Changes

- Keep native Quran playback alive in a provider, with separate subscriptions for playback time labels. A seek reads the latest native position without recreating its callback every tick. Mount screen content on its first visit, then retain the native layout and state on subsequent tab changes.
- Fix the invisible Start repeating label in the Quran range sheet by pairing its dark button with explicit paper-coloured text, independent of the global light/dark text mapping. Secondary text follows the selected paper palette.
- Add small 75 ms press / 130 ms release animations to app buttons using the native animation driver. Preserve existing hit targets and handlers, skip modal backdrops and reader gestures, and disable scaling when Reduce Motion is enabled. Share one Reduce Motion subscription across buttons.
- Show Arabic and English in the normal language picker. Settings → Extra testing settings → Show testing languages reveals the other 38 draft interface translations. The flag is saved; switching it off returns a selected testing language to Arabic. Upgrades with a draft language and no explicit opt-in return to Arabic.
- Offer exactly Makkah (default), Al-Madinah, Andrewler and Original Adhan recordings. Apply mild noise reduction and matched loudness, including separately normalized 29-second iOS excerpts. Retain source attribution/licences in Credits and [provenance](../assets/adhan/PROVENANCE.md). Removed Aaqib/Shalqar/Malmö choices migrate to Makkah, preserving mute settings. New filenames create new Android sound channels; previously selected retained voices keep their IDs.
- Upload the simulator package immediately after compilation, so a later UI test failure does not prevent testers from downloading a successfully compiled app.

## Verification

Host checks cover TypeScript, locale completeness/placeholders, **135 JavaScript behavior tests**, Rust formatting/Clippy and 17 Rust tests. Mobile JavaScript exports are required for both platforms; they do not compile an installable iOS app. Audio integrity tests check that native configuration and the voice picker list exactly the same eight files, match output hashes, and keep iOS excerpts at 29 seconds in supported PCM format.

The actual React Native components were exercised through React Native Web with mocked native services. Forty repeat-sheet combinations (five themes × light/dark × Arabic/English × default/1.45× text) keep the start label visible and its button within the phone viewport; minimum measured text contrast was 10.33:1. Twenty simulated native playback-clock updates caused zero additional shell or control renders; the time label updated on every tick and a playback-state change still updated controls. An unvisited screen did not mount, mounted once on first activation, and did not remount when revisited. These are component behavior checks, not physical iPhone performance measurements.

Native simulator compilation/UI results belong to the macOS GitHub workflow for this branch. This Linux host has no Xcode, and device access is disabled. Native-driver motion, iPhone notification sound quality/delivery, hardware performance, GPS/compass and background/lock-screen behavior require native/physical-device checks. Existing historical iOS book-name and full-download test failures are not claimed fixed here. The updated suite adds testing-language gating and repeat-control checks.
