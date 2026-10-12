# 0.4.0-test — Notifications, offline storage and screen transitions

- Twenty reciters, including ten new voices. سعد الغامدي (Saad Al-Ghamdi) is the default when no valid saved choice exists; each voice keeps separate offline downloads.
- Local iOS prayer alerts, foreground display, permission/settings recovery, an eight-date rolling schedule and a five-second test. iOS uses a labelled 29-second CC0 Adhan excerpt. Full Adhan alert sound remains Android-specific and system-controlled.
- Retained, laid-out tab screens and a stable header/content viewport, with one shared app background to address the blank-frame flash and brightness change when returning to Quran. Inactive layers receive no touches/accessibility focus; Qibla sensor subscriptions remain active only while visible.
- Native Android/iOS playback failure reporting, explicit playback retry independent from download retry, saved-position recovery and one recovery attempt after the network returns while playback is still requested. Pause/stop cancel recovery; stop clears the native queue.
- A shared download manager for audio and tafsir: per-voice complete/partial surahs, measured saved-file size, continuation, confirmed single/bulk audio removal, tafsir download/select/delete and storage totals. Download voice selection is independent of the current playback voice.
- Gold tafsir borders, larger rename touch targets, hidden-layer accessibility isolation, buffering feedback and visible upcoming-prayer-alert counts.
- Native iPhone simulator UI checks for independent book persistence, notification scheduling/cancellation, download settings and repeated tab transitions; simulator screenshots are saved as CI artifacts.

Physical-device compass, sound policy/interruptions, long background sessions and device-specific rendering remain for the Android/iPhone testers. Version 0.3.6 remains available for the friend's current baseline; 0.4.0 work is on `codex/test-0.4.0`.

## Validation

- 78 JavaScript tests and 14 Rust tests passed, along with TypeScript, formatting/Clippy and Android/iOS JavaScript exports.
- The Android 0.4.0 APK (build 10) compiled for ARM64 and x86_64. Its signature and 16 KB ZIP alignment passed; it uses the same test certificate as 0.3.6.
- APK SHA-256: `5491b88042573aba1801552025b16bc2212473307b4540313558e4873476f3f7`.
- The 0.4.0 iOS native app compiled in [the earlier Mac run](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/38241740471). That run failed while preparing the UI test target, before runtime checks. The setup is corrected; [current simulator runtime checks](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/38245903826) are still pending and are not claimed as passed.
- The APK was compiled from `3a86b3c07bf9a981ff67a1cedef0ebe0d046b65e`. Later commits update documentation and simulator test setup; application source is unchanged.

The source ZIP is for Mac/iPhone development and requires the tester’s own signing setup. It is not an installable iPhone build. Android APKs use a development test certificate and are not store releases.
