# 0.4.7-test

- New Quran libraries start with one copy. **Add Quran / إضافة مصحف** adds copies up to six; existing saved copies, names, pages and bookmarks are retained.
- Keep a Home button at the top while reading, including the full-screen book reader. Replace the player’s three dots with a microphone-labelled reciter selector that opens voice choices.
- Turn landscape Quran pages together as a book: both leaves share page turns, animation, zoom and panning, including rapid gestures from either side.
- Add saved **Light / فاتح** and **Dark / داكن** variants for all five app colors. Quran night reading remains a separate setting.
- Expand offline city selection to **224,763 places across 245 countries and territories**, without country quotas. Include countries with minority Muslim populations; this is location coverage, not a claim about any city’s demographics. Rank exact and prefix matches first and allow results beyond the old fifty-match limit.
- Add five licensed Adhan recordings alongside the original: Aaqib Azeez, Andrewler’s recording, Shalqar Mosque, Makkah, and Besim Azemi’s stronger Fajr recording. Each salah has its own saved voice and sound switch. Sound off keeps a silent notification; the master switch cancels all alerts. The Fajr-specific recording is restricted to Fajr. Source/licence links and modification notices are in Credits.
- Show the next Adhan physically on the right in landscape, including tomorrow’s separately calculated Fajr after Isha. Remove repetitive subtitles from the library, Home, location and other screens.
- Update all interface catalogues for the new controls and expanded country names. These are machine-assisted drafts awaiting native-speaker review; Quran text and published tafsir content are unchanged.
- Version **0.4.7**, Android version code **17**, iOS build **17**. Existing package identity, signing identity and saved reading/location preferences are retained. Tafsir download archives remain pinned to `v0.4.3-test`.

## Validation

The source passes `npm run check`: TypeScript, complete localization/catalogue/placeholder checks, 114 JavaScript tests, Rust formatting/Clippy and 14 Rust tests. Both mobile JavaScript/asset exports pass. Chromium renderer checks cover shared-spread gestures from both leaves, rapid opposite directions, multitouch cancellation, shared zoom/panning, verse actions, bounded caching and the opening/final spreads, alongside the existing portrait checks.

Sound checks verify all twelve native resource names, complete Android recordings and six 29-second PCM iOS excerpts. FFmpeg decoding, loudness and peak checks pass. The stronger Fajr recording is approximately 4 dB louder than the added regular voices; device notification volume, Silent Mode, Focus and Do Not Disturb still control playback.

The fresh Android APK is rebuilt for 0.4.7/build 17 with both ARM64 and x86_64 Rust libraries. Signing, packaged sound hashes, the final Hermes bundle and 16 KB ZIP/native-library alignment are checked before publishing.

## Downloads and limits

Download the Android test APK for installation, the source ZIP for the Mac/iOS tester, and SHA-256 checksums. Mac setup and physical-device signing are explained in [the iOS testing guide](https://github.com/saad-musbeh/quran-adhan-qibla/blob/v0.4.7-test/docs/IOS-TESTING.md). This is a prerelease using the existing development signing identity.

Native Android UI validation of these changes is blocked by three emulator boot crashes (exit 139), including software graphics and disabled acceleration. Native iOS compilation/runtime and physical-device GPS, compass and notification playback are not established by the mobile exports. The larger city catalogue’s real-device memory use and search responsiveness also remain unverified. Prior iOS book-name typing and whole-Quran download issues still need device checks.
