# 0.4.3-test

Source branch: `codex/tablet-location`. Android versionCode 13; iOS build 13.
This test APK uses the same package/signing identity as 0.3.5–0.4.2, so it is
an in-place update. Six-book progress, names, bookmarks, settings and existing
private downloads retain their storage keys. Do not uninstall before updating.

## Changes

- Large-screen home page with Quran, Adhan and Qibla buttons. Small phones can
  enable **Main menu on small screens** in shared Settings.
- Landscape orientation, responsive six-book grid, and two-page landscape
  reading on wide tablets. Prayer/Qibla pages scroll when the available height
  is small; landscape layouts put their main content side by side.
- Android foreground location through system GPS/network providers, without a
  Google Play Services requirement. Location settings recovery is available
  when system location is disabled. Permissions, timeout/background cleanup,
  six-hour saved location and offline alternatives remain.
- Seven Arabic tafsir additions: Jalalayn, Ibn Kathir, Tabari, Qurtubi, Safwat,
  Fath al-Qadir and Aysar. Arabic books always remain in the catalogue;
  25 published non-Arabic editions in 21 supported languages appear first when
  their language is selected. No commentary is generated or substituted for
  a missing source entry. See [source/edition details](TAFSIR.md).
- Compact title/author/date tafsir rows. The reader's source footer is removed;
  **Settings → Credits** has publishers, versions, source links and licences.

## Build and inspection record

TypeScript and Android/iOS bundle exports pass. Android release compilation,
including the system-provider and crypto modules, passes with JDK 17.
The API 36 emulator without Google Play Services returned an injected GPS fix
through the app, displaying device location and a prayer schedule.
This does not confirm Huawei MatePad M6 hardware/provider behavior.

New tafsir sources were inspected across all 114 chapters. New compact archives
are separate release downloads; no tafsir text or recitation MP3 is bundled in
this source repository or the APK. Hashes, expected sizes, source identities
and verse mapping/counts are checked before an archive becomes available.
The existing QuranEnc download schemas remain supported.

An iPad portrait/landscape simulator check is added to the iOS native workflow.
Native iOS results and physical iPad/MatePad behavior must be reported separately;
bundle export alone is not a native iOS build. Previously unresolved 0.4.1
XCTest typing and whole-Quran download observations are not claimed fixed.
