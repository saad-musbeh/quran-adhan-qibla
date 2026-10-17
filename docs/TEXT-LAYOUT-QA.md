# Android text clipping follow-up — 2026-10-16

The phone screenshots showed truncated surah names, multi-digit surah numbers and Asr choices. The earlier Adhkar title change addressed one layout, but did not address the shared native wrapping behavior.

## Shared correction

React Native 0.86.3 measures text with advance widths. Android 15+ can draw TextView text using glyph bounds instead, moving trailing text onto a line React Native did not allocate height for. This is a likely contributor to the reported symptoms; the precise behavior on the reporting TECNO phone has not been reproduced locally. The upstream correction and explanation are in [react-native#58280](https://github.com/react/react-native/pull/58280).

`TextLayoutPackage` backports the correction at native text view creation and recycling, setting `useBoundsForWidth=false` on API 35+. The Expo config plugin registers the package before the default text manager. Ordinary and selectable Text retain the inherited React Native props, spans, selection and accessibility. Below API 35, the package supplies no replacement. If React Native's prepared text layout feature is enabled, its ordinary-text manager is preserved; selectable text still receives the correction. Recheck this backport when upgrading React Native, and remove it when the installed framework includes the upstream fix.

Additional layout fixes give surah names and settings labels available row width, reserve room for complete surah numbers and checkmarks, and let titles wrap. Main menu/library titles and navigation labels receive explicit width and line spacing. The top banner and navigation report their measured height so enlarged text does not cover content. Salawat wheel rows also account for the operating system's font scale. Quran text and the offline Mushaf assets are unchanged.

## Verification

- `npm run check`: 150 TypeScript tests and 17 Rust tests pass, including type checking and content checks.
- `npm run export:mobile`: Android and iOS export successfully.
- Android `:islamic-core:testDebugUnitTest`: five Robolectric tests cover both text managers, recycling after bounds wrapping is enabled, the API 34 fallback, prepared-layout compatibility, and native text drawing versus advance-based measurement. The drawing matrix includes Arabic labels from the screenshots, Arabic digits, cursive and sans-serif fonts, narrow/full widths and 1×/1.45×/2× font sizes. Robolectric does not reproduce the phone's platform compatibility default; these tests verify the applied mode and measurement parity, not that the original TECNO failure has been reproduced.
- A temporary browser harness rendered production components with native services stubbed. It checked 528 combinations: 11 screens/pickers × Arabic/English × light/dark × 1×/1.45×/2× app text scale × four viewports (320×568, 411×936, 844×390 and 1024×768). No measured text or document overflow remained. It checked all 114 surah rows, full names/numbers, Arabic search and selection, Asr choices and polar-rule selection. Native text rendering is covered separately above; browser geometry cannot establish Android glyph rendering.
- The layout review included shared text handling, fixed heights, line limits and row sizing across the component directory. Intentional previews and compact player/location labels retain their ellipsis behavior.
- The Android release build and APK content audit pass. The ARM64 artifact contains all 604 offline Quran pages, 12 configured notification sounds and the Rust library; no iOS WAV excerpts are packaged.

## Remaining device verification

Install the new release APK on the reporting TECNO POVA 7 5G and check all surah names/numbers, settings choices, Adhkar cards, and large system/app text in portrait and landscape. No physical phone is attached here. The local emulator currently exits with status 139, so full-app native runtime verification remains pending. No iOS native SDK is available in this Linux environment; iOS has bundle verification only for these changes.
