# Android test build 0.2.0

Validated on 11 October 2026 using Android API 36, an x86_64 Google APIs emulator, JDK 17, and the SDK/NDK versions in the README.

- TypeScript checks, 21 domain/behavior tests, Rust formatting/lint checks, and 11 Rust tests passed.
- Android and iOS JavaScript exports passed. The Android release APK includes its JavaScript bundle and ARM64/x86_64 Rust bridges.
- Native Qibla returned 243.8° for the injected Riyadh device location (24.7136, 46.6753). The illustrated scene points southwest and labels the fixed true-north reference.
- Native prayer times for 11 October 2026 in Asia/Riyadh, using Umm al-Qura and standard Asr, were 04:31, 05:49, 11:40, 15:00, 17:30, and 19:00. Changing to Hanafi Asr changed Asr to 15:52 while the other times stayed the same.
- Foreground permission requests, denial recovery, and a successful precise device fix were exercised. Approximate permission and timeout logic also have host behavior tests; a successful native approximate fix is not claimed.
- Arabic and English swipes follow the visible tab order. Tabs hide after four seconds of inactivity and can be revealed with the bottom handle. Main screens have no vertical scroll view; prayer settings and location choices have their own scrollable detail views.
- Layouts were checked at the emulator's normal resolution and at 320 × 568 with 160 dpi and normal font scaling. All six prayer rows and the location/settings controls fit on the small screen.
- Offline city search and an online map point selection were exercised. The map shows Leaflet/OpenStreetMap attribution, updates its coordinate preview after a tap, and requires explicit confirmation.
- APK signature verification and 16 KB ZIP alignment passed. Packaged Rust calculation exports and bundled third-party notices were checked. There is no camera permission or background location permission/service.

The test APK uses the generated development signing key and is for sideloading. Its size is 45,743,368 bytes; SHA-256:

```text
37405f4f8368d25b1aeb8294e50413644aafeb657e7afc87e7e98bb812ec09c0
```

Physical Android device GPS/compass behavior, screen-reader/large-font behavior on hardware, and the iOS native build remain unverified. The Qibla illustration does not use a live heading sensor. Quran text, Adhan audio/notifications, and persistent preferences remain future work.
