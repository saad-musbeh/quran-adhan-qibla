# 0.6.0 — Short Adhan, adhkar and reminders

Version **0.6.0**, Android code **23**, iOS build **23**.

## Changes

- Add **Short Adhan** as the fresh default, retaining all four full recordings and saved per-prayer voice/mute choices. Fajr automatically adds “الصلاة خير من النوم”. Existing installations retain their selected recordings; choose Short Adhan in Adhan alert settings to switch.
- Use verified licensed temporary recordings, as agreed during planning. The preferred Nayef Saleh Faydah short voice and Farooq Hadrawi full Makkah recording remain pending redistribution permission and are not bundled or presented as available choices.
- Enable Media3 playlist preloading on Android, preparing the next ayah's source while the current ayah plays. Record native buffering/transition diagnostics locally for verification. Recitation recordings and their natural pauses are preserved.
- Stop Quran playback at the end of the current surah by default. The reader's player also offers Next surah and Repeat surah; range looping remains available. The choice is saved, and playing again after a completed surah restarts it.
- Add the **أذكار وأدعية** main tab with three fixed offline collections: morning (24), evening (22), and after prayer (8). Use sourced Arabic حصن المسلم text, scroll by default, and show references only on request.
- Add optional الصلاة على النبي reminders at chosen times, plus independent morning/evening reminders. Spoken Arabic is the default salawat style. All recurring reminders start off.
- Put counters, one-at-a-time reading, alternative reminder styles, daytime intervals and prayer-linked schedules under Extra testing settings.
- Keep new interface text brief. Arabic/English are complete; the 38 testing locales use English fallbacks for new labels until reviewed.

See [adhkar sources and behavior](ADHKAR.md), [audio provenance](../assets/adhan/PROVENANCE.md), and [Quran audio](QURAN-AUDIO.md).

## Verification

`npm run check` passes TypeScript, locale completeness/placeholders, **147 JavaScript behavior tests**, Rust formatting/Clippy and **17 Rust tests**. The Android production Kotlin module and native instrumentation tests compile locally with JDK 17. Mobile exports and native build/CI results are recorded in this release's pull request; an export alone does not compile a native app.

Actual reading/settings components were checked through React Native Web with native services mocked: 16 phone/tablet × Arabic/English × light/dark × default/enlarged-text combinations, each with all three collections. Counter limits, single-entry paging, source references, reminder time fields and testing schedules were exercised. This does not verify native phone notification delivery or audio output.

The Linux host's Android emulators crashed during startup with exit 139 in three graphics/acceleration configurations. The Android CI workflow exercises real native queue boundaries on an emulator using generated tone files and Saad Al-Ghamdi ayahs from private downloads and streams, independently of the UI. Physical OnePlus/other Android listening, notification delivery under battery restrictions, hardware sensors and physical iPhone behavior still require tester follow-up. The historical iOS book-name/full-download checks are not claimed fixed by this release.

## Installation

Install the architecture-matching Android APK over 0.5.3 to retain books, bookmarks, reciter downloads, location and preferences. The package ID and existing local-testing signing key are retained. iOS physical builds still require Apple signing/provisioning on a Mac; the source tag is `v0.6.0`.
