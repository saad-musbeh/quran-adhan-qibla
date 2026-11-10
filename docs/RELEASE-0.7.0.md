# 0.7.0 — memory improvements and Swift iPad fixes

Cross-platform app version **0.7.0**, Android code **29**, iOS source build **29**. The separate Swift-only iPhone/iPad project retains **1.0.3 / build 6** and its own bundle identifier.

## Changes

- Keep the complete city catalogue on disk in SQLite and return bounded query results instead of loading every city into the JavaScript heap.
- Draw Android Quran pages with native vectors, removing the reader's separate WebView process. Original verse text and artwork paths are preserved. Release closed/background drawing surfaces and bound decoded-page caching.
- Allocate the audio playlist when playback is requested and release it on Stop. Cancel stale player operations, including immediate Stop/Play requests. Defer full Quran text and optional interface catalogues until used.
- Include the standalone Swift iPad source project with all 606 offline sheets and its existing 20 reciters. Build 5 moves audio-session operations off the main thread, delays activation until Play, discards cancelled activation completions and uses location authorization callbacks instead of querying global location services on the main thread. Keep iOS 17 compatibility.
- Guard delayed Swift playback recovery against Pause and cancel in-flight Adhan test notifications when alerts are disabled, while allowing explicit one-off tests when alerts were already off.
- Add simulator CPU/memory tests and avoid compiling unused Intel slices for the ARM64 React Native iOS CI destinations.

## Measurements and limits

Android emulator measurements reduced settled cold idle from about **180.5 MB to 95.4–95.6 MB**, and Al-Fatiha playback with the page open from about **360.9 MB to 135.5–154.4 MB**. Longer-surah playback reached **195 MB**, and Home after playback settled near **158.4 MB**. These are total PSS figures, including the original app's WebView renderer. **The requested 80 MB idle / 150 MB maximum budgets are not achieved or guaranteed.** See [the complete measurements and methodology](MEMORY.md).

The React Native iPhone simulator's application metric peaked at **116.5 MB** in steady longer-surah playback, averaging about **1.8% of one host CPU core**. This is not a whole-app total including separately hosted WebKit services and does not validate a physical-iPhone budget. It is also not a measurement of the separate Swift-only app.

[React Native iOS verification](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/42809589821) passed the release build and all twelve UI/performance cases. [Swift build 5 verification](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/42826951879) passed Apple SDK typechecking, serialized audio-session checks, exact offline-resource checks and an actual iPad simulator build/install/launch/reader test. Physical-device audio interruptions, sensors, notification delivery and Swift Playground import/signing remain separate checks. The reporting physical iPad must retest audio and location warnings.

Final release-head checks are recorded on [release PR 33](https://github.com/saad-musbeh/quran-adhan-qibla/pull/33). Swift build 6 additionally covers the cancellation fixes found during release review.

## Downloads

- `quran-adhan-qibla-v0.7.0-arm64-v8a.apk`: ARM64 Android phones.
- `quran-adhan-qibla-v0.7.0-x86_64.apk`: x86_64 Android devices/emulators.
- `quran-adhan-qibla-v0.7.0.apk`: universal Android APK with both supported architectures.
- `QuranAdhanQibla-iPad-build6-compact.zip`: ready-to-open Swift Playground source project with all offline resources. Close the old project and unzip this into a fresh folder before opening it. This is not a signed IPA.
- `quran-adhan-qibla-v0.7.0-source.zip`: repository source for developers; prepare generated Swift resources before opening the raw app project.
- `SHA256SUMS`: checksums for the published files.

Install the matching Android APK over the previous version to retain saved data. The Android application ID and signing identity are preserved. No App Store or Play Store submission is included in this GitHub release.

## العربية

الإصدار **0.7.0** لتطبيق Android ومصدر iOS، ومعه مشروع Swift المستقل **1.0.3، البناء 6**. يقلّل استهلاك الذاكرة عبر قاعدة مدن على القرص وعرض صفحات القرآن الأصلي على Android، ويُنشئ مشغّل الصوت عند الطلب ويحرّره عند الإيقاف. يعالج بناء Swift عمليّات الصوت التي قد تعطل الواجهة، ويستخدم إشعار تفويض الموقع بدلاً من فحص خدمات الموقع على الخيط الرئيسي.

**لم تتحقق حدود 80 ميغابايت عند الخمول و150 ميغابايت أثناء التشغيل بشكل مضمون.** القياسات الحالية من المحاكيات وليست ضماناً للأجهزة الفعلية. ملف iPad مشروع مصدر لـ Swift Playground مع الموارد دون اتصال، وليس ملف IPA موقّعاً؛ افتحه من مجلد جديد وأعد اختبار الصوت والموقع على الجهاز الفعلي.
