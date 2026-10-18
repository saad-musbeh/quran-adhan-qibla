# Reader and compass verification

## 13 October 2026 — library, landscape book, appearance and Adhan customization

New libraries start with one Quran copy and can add up to six; restoration preserves existing copies, their order, positions and bookmarks. The top Home action works while reading and in the full-screen book reader. The player uses a microphone, reciter label and dropdown indicator in place of the three dots.

Landscape reading uses one WebView, one page-turn sequence and one cached panel containing both leaves. Browser checks cover touches from either leaf, rapid alternating directions, interrupted animations, opposite multitouch cancellation, shared zoom/panning, verse actions from both leaves, bounded caching and the first/last spreads (1–2 and 603–604). All previous portrait renderer checks still pass. Artwork and verse data are unchanged.

Each of the five app colors has saved Light and Dark variants. Palette tests check text contrast across app backgrounds/cards, control contrast, independent appearance/color restoration, and retention of Quran paper/night colors. The resolved light palette is memoized so unrelated updates cannot reload the map. Repeated Home-card/library/location/reader subtitles were removed; source credits, permissions, errors and relevant operational guidance remain.

The city catalogue now has 224,763 places across 245 countries/territories without country quotas. Search tests cover sourced Arabic/transliterated names, exact/prefix ranking, and results beyond the former fifty-match limit. The larger catalogue's real-device search responsiveness and memory use remain unverified.

Prayer sound choices are saved independently for the five salahs, with six licensed recordings in total and a stronger Fajr-only recording. Muting a prayer keeps its visual notification; the master switch cancels all reminders. Tests cover saved-state validation, Fajr-only wording restrictions, sound-specific Android channels, per-prayer schedule selection, native sound registration and all six 29-second PCM iOS excerpts. FFmpeg decoding and peak checks passed for all twelve files; sources and modifications are recorded in the Adhan provenance document and in-app Credits. The next Adhan panel stays physically on the right in landscape, including separately calculated tomorrow Fajr after Isha. Date/boundary tests cover sunrise exclusion, prayer boundaries, midnight, month/year changes and DST.

`npm run check` passes TypeScript, the complete localization audit, 114 JavaScript tests, Rust formatting/Clippy and 14 Rust tests. Both Android and iOS mobile exports pass. New interface translations are machine-assisted drafts awaiting native-speaker review.

Native Android UI testing for this change is blocked: three emulator boot attempts, including software graphics and disabled CPU acceleration, crashed with exit 139 before a usable UI. The fresh Android release APK builds successfully: all twelve sound resources match the bundled source hashes, the final Hermes bundle and both Rust ABIs are present, APK signing and 16 KB ZIP alignment pass, and all 34 native libraries have at least 16 KB LOAD alignment. Native iOS compilation/playback and physical-device notification sound, compass and GPS remain unverified.

## 13 October 2026 — Honor page turning and persistent controls

The attached Honor Magic 7 Pro recording showed repeated unsuccessful page turns around pages 58–59. Android emulator testing reproduced the reverse-turn failure: preparing the next two neighbors after advancing to page 59 evicted page 58 from the five-page FIFO cache. Without that prepared page, subsequent backward gestures only applied the edge resistance. Cache eviction now removes the farthest unprotected page, retaining the current page, the incoming page and any active drag target. Neighbor preparation keeps both directions available without increasing the five-panel limit.

Rapid alternating swipes also exposed delayed React commits dropping newer turns or restoring an older page. Each gesture now carries an increasing sequence number; the native bridge validates against the displayed page and saves the absolute destination. Intermediate commits and stale WebView activation acknowledgements cannot overwrite a newer turn. Reloads reset the sequence, and page-picker navigation establishes a new displayed page.

Quick flicks now turn pages without requiring a half-page drag. Slow drags still require halfway travel, and small movements/cancelled gestures return to the current page. Fit-page gestures suppress browser panning; enlarged reading retains native panning and pinch zoom. The language/location/settings banner stays visible. A permanent bottom bar provides previous ayah, replay, play/pause, next ayah, stop, loop and the full player. Page sizing measures the space between the banner and audio bar, keeping the complete printed page visible.

Validation:

- `npm run check`: TypeScript, 81 JavaScript tests, Rust formatting/Clippy and 14 Rust tests pass. Page-turn tests cover delayed commits, explicit navigation/reloads and malformed, duplicate or out-of-order messages.
- `npm run export:mobile`: Android and iOS JavaScript/assets export successfully.
- `scripts/check-mushaf-renderer.mjs`: real Chromium touch input covers four-direction short flicks, small movements, slow/cancelled drags, interrupted animations and zoom panning. The native neighbor-preparation order reproduces the old cache failure and passes repeated 58/59 turns with the fix. Existing artwork, theme, language, ayah-menu and opening-page checks pass.
- Android API 36 emulator: the bundled release APK builds and installs over existing app data. Repeated 58/59 turns and all four swipe directions pass at 390 × 844 and 320 × 568. Twelve uninterrupted alternating swipes end on the correct page; reopening the book preserves that page, and explicit page-picker navigation afterward succeeds. Banner and audio controls remain after the reading tools time out. All seven audio buttons retain at least 44-pixel heights on the small screen, and banner/page/player bounds do not overlap. Arabic and English layouts, language selection, settings, location options, full player and loop editor open correctly.
- Native audio playback advances its elapsed time and moves between ayahs. Pause retains its position; previous/next select the expected ayahs, replay resets playback, and stop clears the elapsed time and disables the stop control. Android media-session state independently confirms playback; UI hierarchy dumps can fail to reach idle during continuous audio updates.
- APK signing and 16 KB ZIP alignment checks pass. No application crash was recorded.

The physical Honor device was not connected; this is recording-based diagnosis plus browser and Android emulator confirmation. Native iOS compilation/runtime behavior for this change remains unverified.

### Running the optional browser checks

`npm run test:reader` needs Playwright and its Chromium browser, installed separately from the mobile app dependencies. For an isolated local installation:

```sh
npm install --prefix /tmp/quran-reader-qa --no-save --package-lock=false playwright
node /tmp/quran-reader-qa/node_modules/playwright/cli.js install chromium
PLAYWRIGHT_MODULE=/tmp/quran-reader-qa/node_modules/playwright npm run test:reader
```

Alternatively, set `PLAYWRIGHT_MODULE` to an existing compatible Playwright installation. These browser checks exercise the embedded reader; native WebView and audio behavior still require platform validation.

## 0.3.6 — six reading copies and reader polish

The Quran tab now opens six reading copies. All new copies start at Al-Fatiha. Each copy has its own name, last printed page, page bookmarks and ayah bookmarks; the model rejects malformed/out-of-range saved state. The reader stays mounted between the library and other app sections, with its expensive assets warmed from the library. Saved tafsir books are loaded only when the tafsir library is opened. Android Back returns from reading to the library. Section tabs are hidden while a Quran copy is open.

The shared screens/cards/navigation use gold outlines and the selected app palette. Night reading separately tints the original ayah numeral paths because they live outside the source calligraphy group. Vertical and horizontal page gestures follow the finger: beyond half the page advances; shorter/cancelled gestures return. The same gestures work with reader controls visible. Zoom continues to pan rather than change pages.

Playback controls are previous ayah, replay, play/pause, next ayah, and stop. A ten-voice selector is available directly in the player. Source catalogue entries and first/last ayah endpoints were checked for all ten voices. Al-Saadi and Al-Nafahat expand the tafsir library to four books; 114 surahs from each new source were validated. Al-Saadi's source passages, including the overlap at Al-Kahf 99, are kept intact and labelled with their ayah range. See the tafsir provenance notice for publication dates and source digests.

Compass changes reduce smoothing delay during deliberate turns, coalesce display updates to animation frames, and calculate WMM magnetic correction once per subscription. Calibrated true north, permission handling and foreground-only sensor use remain required. Improved response on the user's physical compass has not been verified.

Validation: 74 JavaScript behavior/data tests and 14 Rust tests pass, alongside TypeScript, formatting and Clippy. The standalone browser renderer passes complete page content, all theme/day/night numeral colors, live drag tracking, short drag cancellation, halfway commit in both axes, gesture cancellation, prepared-panel reuse, ayah actions, bounded cache and opening-page checks. Android/iOS JavaScript and asset exports pass. The Android version 0.3.6 / versionCode 9 test APK builds successfully with ARM64/x86_64 Rust libraries.

The Android emulator exits with a segmentation fault during boot on this host, including without hardware acceleration. This prevented fresh native UI/audio/compass runtime checks for this version. Native iOS compilation and physical Android/iOS checks remain pending. Browser/data checks and successful APK compilation do not establish physical-device sensor accuracy or playback behavior.


## 0.3.3 — reader themes, centered opening pages, and native audio queues

The Quran reader offers Green, Maroon, Blue, Black, and Brown in the top gear sheet. The saved choice applies to reader backgrounds, frames, metadata, menus, and controls in both reading views. Every page has equal horizontal artwork margins. Pages 1 and 2 use a tighter runtime viewBox around the existing vector paths and an original geometric opening frame; the source calligraphy, ayah polygons, printed line breaks, and bundled asset hashes are unchanged.

Ayah actions can start a loop immediately through the surah's end, or select an ending ayah for review in the range sheet. The range button also supports tapping a start and end on the page. An empty ending field means the selected surah's end. Playback uses one native playlist rather than reloading each ayah from JavaScript. Android's foreground MediaSession service uses that same ExoPlayer. iOS uses the Expo AVQueuePlayer with a version-checked postinstall patch for consumed-item removal and prepared repeat cycles; native iOS compilation and runtime behavior remain unverified on this Linux host.

`npm run check` passed: 59 JavaScript tests, 14 Rust tests, TypeScript, formatting, and Clippy. Both Android and iOS JavaScript/asset exports passed. The Android release build passed with version 0.3.3 / versionCode 6. Chromium renderer QA passed prepared-panel reuse, bounded eviction, rapid transition cleanup, ayah selection, menu actions, bookmarks, language/theme updates, zoom, and small-screen resizing. Opening-page checks covered all seven Al-Fatiha and five opening Al-Baqarah ayahs, the cropped artwork bounds, and night reading.

Android API 36 observations with the final test build:

- Maroon survived app restart. All five Arabic color choices fit at 320 × 568 dp. Green, Maroon, Blue, Black, and Brown were selected on the emulator; Brown also rendered complete page 37 in book-view night reading.
- Pages 1 and 2 retained every verified accessible ayah at 320 × 568 dp. Their complete artwork and original opening frames were visually inspected. Book page 37 retained all three complete source ayahs at that size; initial reading did not require scrolling.
- Long-pressing Al-Fatiha 1:1 and choosing the loop start began playback through 1:7. Choosing 1:2 as the endpoint opened the range editor with 1–2. In book view, tapping 1:1 and 1:3 populated 1–3. Clearing the ending field and starting restored the active 1–7 range. The range fields and action buttons remained reachable at 320 × 568 dp.
- Al-Fatiha's seven recitations were downloaded to private storage. With Wi-Fi and cellular disabled and the app restarted, the saved range played all seven ayahs and repeated twice. The captured automatic transitions remained `PLAYING` through indices 0–6 and back to 0, with no intermediate paused or buffering state after initial loading. Playback stayed active after more than 90 seconds in the background. The service reported `isForeground=true` and its notification carried `FOREGROUND_SERVICE` before the first ayah finished.
- Normal playback advanced from Al-Fatiha through its seven ayahs into Al-Baqarah's first ayah, with the native queue retaining the current and next surah. The captured automatic transitions remained `PLAYING`. Media-session metadata followed each ayah. Native pause/resume, next/previous commands, and 1.5× playback speed were exercised. Manual skips can require buffering; the observed uninterrupted automatic transitions do not promise gapless playback for every source or network condition.

Natural pauses in the source recordings remain; there is no silence editing or crossfade. Physical Android devices, Bluetooth/audio interruptions, extended background sessions, TalkBack/VoiceOver, and native iOS still need device verification.

The universal APK is 147,158,767 bytes (147.16 MB / 140.34 MiB), using the existing generated test signing key. Signature verification and 16 KB ZIP alignment passed; all 32 packaged native libraries retain at least 16 KB ELF LOAD alignment. No tafsir books or recitation downloads are bundled.

SHA-256: `44965a2d33f83e0d2ffa0bbb5dec3790d1fa69e118fbdd9c64ab83695e692b97`.

## 0.3.2 — cached pages, verse actions, tafsir downloads, and loop picker

The reader keeps one WebView alive, prepares the two adjacent pages in each direction, and retains at most five SVG page panels. Cached pages reuse the parsed artwork; rapid turns settle the previous slide before starting the next. A long press opens play, tafsir, and persistent verse-bookmark actions. Both reading views include the supplied four-line range icon, opening Arabic-only surah selection and first/last ayah fields for continuous repetition within that surah.

`npm run check` passed: 52 JavaScript tests, 14 Rust tests, TypeScript, formatting, and Clippy. Android/iOS JavaScript exports and the Android release build passed. Optional Chromium renderer QA checked prepared-panel reuse, bounded eviction, rapid transition cleanup, theme/language changes, verse actions, zoom, and resizing. Native iOS and physical TalkBack/VoiceOver remain unverified.

Android API 36 observations:

- Six right/left turns traversed pages 599–602 and ended on page 601 with all 17 verified verse labels. The final recording contained 425 frames; the central printed-text crop retained at least 1.40% dark ink, with no blank frames below the 0.3% threshold. This checks that recording, not every device or uncached navigation.
- Main-view verse actions and zoomed book-view tafsir were exercised offline. The scroll container uses left-to-right coordinates while Arabic metadata retains its own RTL layout; Android WebView verse/action bounds then matched the zoomed artwork.
- Verse bookmark 1:1 survived app restart and appeared in the bookmark picker with its verified text.
- Both QuranEnc books downloaded completely. Each saved private file contained all 6,236 ayahs in canonical order; the saved Moyassar text, Arabic source text, and footnotes matched the retained provenance fixture verbatim. No partial files remained. Mokhtasar cancellation and retry succeeded.
- With Wi-Fi and cellular disabled, restart preserved the selected Mokhtasar edition. Its tafsir opened offline, switching to saved Moyassar worked, and deleting Mokhtasar changed its row back to the download state.
- The loop picker rejected a reversed range. Starting Al-Fatiha 1–2 produced native media-session metadata for ayah 2 followed by ayah 1; reopening showed the active range and the stop action cleared repetition. Main and book buttons opened the picker. Arabic start/end fields and the primary action fit at 320 × 568 dp.

The universal test APK is 147,109,107 bytes (147.11 MB / 140.29 MiB), with no tafsir or recitation files bundled. Its signature and 16 KB ZIP alignment passed; all 32 packaged native libraries retain 16 KB ELF load alignment. It uses the existing generated test signing key.

SHA-256: `48fbeb0982c41a798b95ac64b7ca543237290b087a54f9314706038e2a77a5b8`.

## 0.3.1 — full-page Mushaf reader

The reader now bundles all 604 Hafs/KFGQPC vector text blocks from Quran.ws. It preserves calligraphy and printed line breaks, fits one complete page without scrolling, and uses the SVG verse polygons for accessible verse labels and recitation highlighting. Search, surah selection, and audio following use the matching printed-page verse index. The added green-and-gold heading frame is original project artwork recreated from the reference style; it is not claimed to be the reference application's exact ornament. Running labels and the folio are app-rendered. Source details and licensing are in [Mushaf provenance](../assets/mushaf/PROVENANCE.md).

`npm run check` passed: 39 JavaScript tests, 14 Rust tests, TypeScript, formatting, and Clippy. The asset test checks all 604 packed/unpacked hashes and all 6,236 verse keys against the verified Tanzil corpus. Android and iOS JavaScript/asset exports passed. The Android release build passed on Linux; native iOS remains unverified.

Android API 36 observations:

- Whole pages 37, 38, 599, 600, and 604 were inspected; their accessible verse labels matched the complete source page.
- Right/left swipes turned pages 38/39 and 600/601. Tapping the page reveals tools; the page picker, dismiss action, and inactivity timeout work. The floating tools have their own touch layer above the WebView.
- At 320 × 568 dp, page 38 remained complete without scrolling. Switching size without restarting correctly resized the vector page. Book zoom enlarges the preserved artwork and permits pan; its initial horizontal position follows Arabic reading direction.
- With Wi-Fi and cellular disabled, an app restart and first visit to page 604 loaded its bundled artwork and all 15 verse labels. Language switching preserved Arabic surah names. Night reading showed light calligraphy against the dark paper.
- Al-Fatiha playback paused at 2,068 ms and resumed at 2,144 ms in the Android media session. The UI reconciles fresh native status events so a local pause no longer reuses a stale playing sample.
- Screen readers keep tools visible. A dedicated dismiss action remains available, while the touch backdrop is excluded from screen-reader traversal; full-page verse regions carry the verified Arabic verse text. Physical TalkBack/VoiceOver behavior still needs device checks.

The universal test APK is 147.02 MB (140.21 MiB). Its 604 offline SVG assets use 95,248,101 bytes after lossless gzip; no recitation MP3s are included in the APK. Signature verification and 16 KB ZIP alignment passed; the 32 packaged native libraries retain 16 KB ELF load alignment. This build uses the existing generated test signing key.

SHA-256: `0a63cf745368160141db2741aa6be6e32b98b1979b3d7c83f1295e09029772f8`.

## 0.3.0 — previous reader, audio, and compass checks

The Android test build uses Expo SDK 57 / React Native 0.86.3, Android SDK 36, JDK 17, and ARM64 plus x86_64 Rust libraries. The test environment is an API 36 x86_64 emulator. Native iOS compilation requires macOS/Xcode and has not been performed here.

### Automated checks

`npm run check` covers TypeScript, Quran counts/page metadata, normalized search, exact text reconstruction after pagination, reciter cache isolation, repeat boundaries, coordinate/heading math, Rust formatting and Clippy, prayer/Qibla reference results, and WMM2025 declination against NOAA reference points. `npm run export:mobile` bundles JavaScript and assets for Android and iOS; it does not verify Swift compilation or iOS runtime behavior.

### Android observations

- The three top icons open language switching, shared location selection, and the gear sheet. Gear sections cover Quran, prayer calculations, and compass mode.
- At 320 × 568 dp, Quran text uses measured page portions with explicit next/previous controls. Quran text and the reader font are bundled; recitations are optional network streams or private downloads.
- The book icon opens a full-screen framed page. Al-Fatiha remained readable at 320 × 568 dp, with verse highlighting and explicit navigation. Surah names remain Arabic when the interface language is English.
- Page 1's last portion remained labelled part 2/2 when reached with the book navigation controls; a short final portion does not increase its page budget. Pause was confirmed by the native media session retaining its position (840 ms), and the lock-screen metadata showed `الفاتحة`.
- First streamed playback, automatic verse advance, 1.5× speed, and repeated Al-Fatiha 1:1 were exercised. The native media session reported playing position and reciter/verse metadata. Audio continued when the app was backgrounded.
- Al-Fatiha's seven audio files downloaded successfully. After disabling both Wi-Fi and cellular data and restarting the app, its cached first verse played and repeated. Downloads stay in private app storage, scoped by reciter.
- Foreground device location supplied Riyadh coordinates to the Rust bridge. Qibla returned 243.8°; fixed true-north mode keeps north at the top.
- Without a usable initial compass sample, the emulator showed an explicit fixed guide and a compass explanation. The watch now stays available for a later heading while the screen is active, because Expo Android can suppress an initial near-zero azimuth. This does not verify real compass alignment. Physical-device calibration, magnetic interference, sensor orientation, and GPS accuracy still require device testing.
- With a flat synthetic acceleration vector and changing magnetic-field vectors, live mode showed “LIVE · TRUE NORTH” and a phone-relative turn instruction. This verifies the Android sensor callback and UI path with simulated inputs, not physical compass precision.

### Download build

The final universal test APK contains ARM64 and x86_64 libraries, is 51.36 MB (48.98 MiB), and includes no MP3 recordings. Its signature, ZIP alignment and all 32 native libraries' 16 KB ELF load alignment were checked. Both Rust libraries contain the new declination C and JNI exports. Only the required Quran and icon fonts remain in the generated resources.

SHA-256: `ebee922eaf78b4aac4568bbe19f14aa95028d72439bdb691004acad5ded10029`.

### Remaining platform checks

Test a physical Android phone and iPhone for compass calibration and movement, foreground/background sensor cleanup, Bluetooth/audio interruptions, lock-screen controls, and extended background recitation. No camera permission, microphone permission, or background location permission is needed. Android test APKs use the generated debug signing key and are intended for testing, not store distribution.

## 0.3.4 — Android icon, language menu and Adhan notifications (11 October 2026)

- Added the Android book/direction/crescent launcher icon and a separate white notification silhouette; verified the installed launcher icon on the API 36 emulator. The ImageGen prompt is saved in `assets/branding/README.md`.
- All 35 language IDs are selectable by native name and searchable. The 33 new catalogs contain all 268 source messages with intact placeholders and no empty entries or translation sentinels. AST review found no uncatalogued `bilingual`/`localizeCopy` UI strings. These are machine-assisted drafts; structural checks do not replace native-speaker review.
- Native checks at 390×844: French menus/settings, language search and Urdu settings with reversed rows, switch position and tabs. At 320×568: Chinese settings/font fallback and the German Qibla screen fit; the final German dock label uses the short, conventional `Qibla` name. Quran text and surah names remain Arabic. Browser checks also passed French, German, Urdu, Sorani, Chinese and Hindi ayah menu labels/direction at 320px, alongside the existing page-cache, opening-frame, loop and theme checks.
- Opt-in Android alerts use the saved location/calculation settings, exclude sunrise, and cover remaining prayers today plus seven following local dates. Enabling requested notification permission; missing-location recovery opened the location sheet without an unsolicited GPS prompt. Riyadh after Isha produced 35 future alarms.
- With exact-alarm access denied, Android reported a one-hour inexact window and the app offered Alarms & reminders. Granting access changed all 35 alarms to `window=0` / `exactAllowReason=permission`; the timing guidance disappeared after return.
- Five-second test alerts were delivered while the app was foregrounded and while the launcher was foregrounded. Notification records used the Adhan channel and `android.resource://org.saadmusbeh.quranadhanqibla/raw/adhan`; Android's MediaPlayer entered `started` with 44.1kHz stereo notification audio. The emulator runs without audible output: listening quality, full recording duration, DND, Bluetooth and vendor battery policies still require a physical phone.
- Turning alerts off removed all pending prayer alarms. A cold restart restored the enabled preference, Urdu selection and saved city, then rebuilt 35 alarms. Revoking notification permission removed all alarms; the in-app recovery action opened Android notification settings and restoring permission rebuilt 35.
- Changing from Riyadh to unsupported polar coordinates (80°, 0°) removed the previous city's 35 alarms; returning to Riyadh rebuilt them. Failed calculation/scheduling now clears known obsolete app-owned alerts rather than leaving stale times.
- Final host checks: TypeScript, 69 JS/domain tests, Rust formatting/Clippy and 14 Rust tests passed. Both Android/iOS JS exports passed. Android release compilation and installation passed; native iOS compilation is unverified on Linux.
- APK: `/home/saad/Downloads/quran-adhan-qibla-0.3.4-android-test.apk`, version 0.3.4 / code 7; 150,256,945 bytes. SHA-256: `83087593d627a1f422f1d2acdceabe0c48c410ef1609e49ac43257b5f5bb5252`. Signature matches the 0.3.3 test APK. ZIP alignment and all 34 ELF libraries pass 16KB checks. The bundled OGG matches its documented source SHA-256.

JSON-only edits were initially treated as up to date by Gradle's bundle task. The final APK explicitly regenerated `createBundleReleaseJsAndAssets --rerun-tasks` before assembly; the README release recipe includes that step. The owned emulator's language was restored to Arabic, alerts disabled, display/network overrides reset, then the emulator was stopped. Reboot restoration, long-term background operation and native iOS behavior remain unverified.

## 0.3.5 — shared app colours and surah headings (11 October 2026)

- The five persisted palettes now apply across Quran, Adhan, Qibla, the header/dock, settings and location surfaces. **App color / لون التطبيق** is available in every gear section and reuses the saved reader preference. The native colour menu exposes all five options; maroon, brown, black, green and blue selections were exercised. Brown prayer times, black Qibla and black after a cold restart were inspected. The saved black selection remained checked after reopening settings.
- Night mode no longer filters the full page artwork and banner together. Only the original source glyph group receives inversion, preserving the banner's intended paper colour. Browser checks on pages 599 and 604 cover all five palettes in light/night mode with at least 7:1 title/paper contrast.
- Blank heading frames moved down 2.5 SVG units around the preserved source title artwork. Regression checks reconstruct source glyph contours and measure their transformed bounds, verifying title centres within 3 screen pixels of the frames and frame containment within a 2-pixel edge allowance. Source Quran glyphs, ayah geometry and bundled SVG assets are unchanged. Native page 604 retained all 15 verified ayah accessibility labels; its light/night title rendering was inspected.
- TypeScript, 69 JS/domain tests, Rust formatting/Clippy and 14 Rust tests passed; Android/iOS JavaScript exports passed. The strengthened Mushaf browser checks passed. Android release build and upgrade installation passed with no app runtime crash. Native iOS and physical-device checks remain pending.
- APK: `/home/saad/Downloads/quran-adhan-qibla-0.3.5-android-test.apk`, version 0.3.5 / code 8; **150,260,389 bytes**. SHA-256: `3ad693610def3cbee0f7649e6426b027ac3b29b0c6d344de8dc9d7245ed33d04`. Signature matches the preceding test build. ZIP alignment and all 34 native ELF libraries passed the 16KB checks. JS/assets were forced to regenerate before assembly.
