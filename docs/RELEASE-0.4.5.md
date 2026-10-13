# 0.4.5-test

- **App text size** in overall Settings affects menus, text inputs, prayer times, Qibla labels, tafsir and the main Quran reader immediately. It is saved across restarts, applies to existing reading copies and has a Default reset button.
- Quran pages use more available height and tighter side margins. Source calligraphy, line order, ayah numbers and verse hit polygons remain unchanged. Enlarged pages pan, and outward swipes at an edge turn the page using the short-swipe threshold.
- Missing UI catalogue messages are supplied for all 33 languages after English. Home, settings, downloads, Credits, tafsir controls, country filters and language names follow the selected language. These interface translations are drafts pending native-speaker review; Quran/tafsir source text is never generated or translated by this maintenance step.
- Version 0.4.5, Android version code 15 and iOS build 15. Existing package/signing/storage identities retained. The immutable tafsir data releases remain pinned to 0.4.3-test.

Android APK and source ZIP are published on the 0.4.5-test release. The Mac tester should use that source ZIP with docs/IOS-TESTING.md. Native iOS compilation and UI status are tracked in GitHub Actions; the 0.4.4 iPad UI check timed out waiting for a landscape spread even though compilation passed.
