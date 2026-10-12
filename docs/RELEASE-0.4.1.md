# 0.4.1-test — Library navigation, full downloads and opening pages

- Fixed Quran library navigation: its tabs stay visible, draw above retained screens and support horizontal swipes. App sections remain locked only while a reading book is open.
- Added **Download whole Quran / تنزيل القرآن كاملًا** in Settings → Manage downloads → Recitations. It downloads all 114 surahs for the chosen voice, shows total/current-surah progress and supports cancellation. Start again or retry to reuse saved ayahs. Keep the app open; automatic background downloads are not implemented.
- Merged Quran, Adhan and Qibla settings into one scrollable page. Reciter and prayer-method lists expand on demand. Removed duplicate playback-speed and numeric loop editors from settings; those controls remain in the reader/player. Existing preferences are retained.
- Restyled Al-Fatiha and the opening Al-Baqarah page with original green-and-rose floral vectors, gilt borders, a paper medallion and a surah-title cartouche inspired by the supplied Mushaf photos. Source verse, basmala, title and number glyph paths remain unchanged, with original verse interactions. Day/night palettes and prepared-page night rendering are supported.
- Version 0.4.1, Android build 11 and iOS build 11. Twenty reciters, Saad Al-Ghamdi default, six independent books and the other 0.4.0 features remain.

## Validation

Host checks and Android/iOS JavaScript exports passed. The new opening-page layout was visually inspected in day/night browser previews. The Android APK is compiled for ARM64 and x86_64 with the same test signing certificate used by earlier releases.

The earlier 0.4.0 iOS simulator run passed prayer-alert scheduling/cancellation, saved audio inventory and repeated tab changes. Opening a reader terminated the iOS app, so reader/audio runtime checks failed. Its diagnostic reports are being inspected; no complete iOS runtime pass is claimed. Current iOS validation and physical-device compass, background audio and notification sound testing remain pending.
