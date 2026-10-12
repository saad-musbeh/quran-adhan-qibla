# 0.4.2-test — Fix Android Quran opening crash

- Fixed the 0.4.1 Android regression that closed the app when opening any Quran book. The captured fatal error was `Invalid calendar option !` in the tafsir publication-date formatter.
- Select the Hijri calendar using one locale extension instead of the multi-part calendar option rejected by Android Hermes. Replace the Gregorian extension before adding the Hijri extension, preserving the iOS locale fix.
- Skip the hidden tafsir catalogue at reader startup. If a device cannot format optional digital edition dates, keep the documented first-publication year instead of terminating the reader.
- Upgrading directly from 0.3.5 imports its old reading position, page bookmarks and ayah bookmarks into book 1 when no six-book library exists. Existing 0.3.6 and later libraries take precedence; the original legacy keys remain stored. App identity/signing and audio/settings storage are retained.
- Version 0.4.2, Android build 12 and iOS build 12. Existing books, saved positions, bookmarks, settings and downloads are retained when updating with this APK.

## Validation

The old 0.4.1 APK reproduced the exact fatal error on an Android API 36 emulator. After installing 0.4.2 over it, the reader and tafsir catalogue opened, source verse controls were present, native Hijri publication dates were displayed, and the crash buffer stayed empty. TypeScript, Android/iOS JavaScript exports and the native Android release build passed. Legacy reading-position/bookmark conversion and existing six-book record parsing were checked on the host. APK signature and 16 KB ZIP alignment were checked; the signing certificate matches previous test releases.

This is emulator confirmation; the user's OnePlus device has not been directly inspected. The updated [iOS native run](https://github.com/saad-musbeh/quran-adhan-qibla/actions/workflows/ios.yml) is pending. The 0.4.1 iOS book-name input and whole-Quran download failures remain unresolved. Physical-device compass, background audio and notification sound checks remain pending.
