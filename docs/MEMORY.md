# Memory work — unreleased

The requested budgets are **80 MB idle and 150 MB total with a Quran page open during playback**, allowing roughly 70 MB for audio-related work. These are acceptance targets. This change does **not** meet them yet.

## Android measurements

Measured on 2026-11-10 with a standalone release APK, Android 16/API 36 x86_64 emulator, four virtual CPUs and host GPU rendering. Saved Arabic preferences, Riyadh location and Mishary Alafasy reciter were retained. These are emulator results, not physical-phone or iOS measurements.

Memory is Android `dumpsys meminfo` **TOTAL PSS**. The old app's separate, app-owned WebView renderer is included. RSS is not added across processes because that double-counts shared pages. Below, MB is decimal (1,000,000 bytes); MiB is binary (1,048,576 bytes).

| Scenario | Stable v0.6.5 baseline | Local optimized build |
| --- | ---: | ---: |
| Settled cold idle, Adhan screen | 180.5 MB / 172.2 MiB | 95.4–95.6 MB / 91.0–91.2 MiB |
| Cold-start sample before settling | not sampled comparably | 123.9 MB / 118.2 MiB |
| Al-Fatiha page open, no audio | 368.5 MB / 351.4 MiB | 130.3–133.2 MB / 124.3–127.1 MiB |
| Al-Fatiha open during playback | 360.9 MB / 344.2 MiB | 135.5–154.4 MB / 129.2–147.3 MiB |
| Playback with page turns/orientation changes | not sampled comparably | 144.0–162.7 MB / 137.3–155.2 MiB |
| Page 60 open after earlier reading/playback | not sampled comparably | 150.4–153.9 MB / 143.5–146.8 MiB |
| Longer-surah playback, reader follows to page 50 | not sampled comparably | 169.2–195.0 MB / 161.3–185.9 MiB |
| Return Home after playback, settled | 362.1 MB / 345.3 MiB | 158.4 MB / 151.0 MiB |

The longer recording added approximately 15–45 MB relative to the preceding reading samples. This is a whole-process difference, not an isolated measurement of the decoder: page changes, garbage collection and runtime caches also contribute. It stayed below the proposed 70 MB allowance in this run, but the reader/runtime baseline was already too large for a 150 MB total ceiling. Al-Fatiha's lower result cannot establish a maximum for other recordings or pages.

Cold idle and idle after using the reader are different states. Closing the reader removes its native views and releases the player on Stop, but native allocators, loaded JavaScript modules and code pages can remain resident. Returning Home therefore does not restore the cold-idle figure.

CPU samples during Al-Fatiha playback were 7% and 13% of one virtual core after the first sample, versus about 10% previously. This short run does not establish a CPU improvement. The Android crash log remained empty during this verification. The earlier emulator startup crash was in host SwiftShader; using the host GPU fixed that environment problem, independently of app changes.

## Changes

- The 224,763-city catalogue stays in a bundled SQLite database. Queries return only the requested window. The native cache is configured to 512 KiB with memory mapping disabled. Source fields, ordering and aliases remain covered by database tests. See [city provenance and regeneration](CITY-DATA.md).
- Android draws the original Mushaf vectors in the app process instead of launching Chromium. Each leaf has one drawing surface; only two decoded source pages are cached. Tests compare every path in all 606 sheets in both appearances with the original assets. Source Quran text and vector path data are unchanged.
- Closed and background reader screens unmount their drawing surfaces. Playback remains outside the reader lifecycle.
- The native playlist is allocated on first playback. Stop detaches native controls and releases it; Pause retains it for resume. Tests cover immediate Stop/Play, stale queues, status events, loops and cleanup.
- Full Quran text, reader components, the map and reminder-audio settings load when used. Surah metadata remains small and eager. Only requested UI language catalogues load on native platforms.

## Verification and remaining work

`npm run check` passes: dependency security checks, TypeScript, localization audit, 217 application tests, eight iOS harness tests and 20 Rust tests. `npm run export:mobile` exports both platforms. ARM64 and x86_64 Android release APKs build successfully. Android checks include city search, opening/regular pages, long-press actions, page turns, light/dark rendering, playback, immediate Stop/Play and orientation changes. Screen-reader action overlays are implemented but physical TalkBack behavior is unverified.

iOS retains its WebView renderer. Its release simulator build, seven functional UI checks and five performance checks subsequently passed on GitHub (details below). Physical-iPhone behavior and iOS city-search interaction remain unverified. This work does not establish iOS memory savings or a universal memory ceiling.

Raw baseline logs are in `/home/saad/.t3/scratch/quran-ram-baseline-2026-11-10`; optimized logs and `samples.json` are in `/home/saad/.t3/scratch/quran-ram-optimized-2026-11-10`. Final measured APK SHA-256 values:

- x86_64: `e5f5fb65faed6e01f0d8a69d3ddfffa4ff895e0896da1a96f5accd272cbd6831`
- ARM64: `58f240e5e256f45dfdd526dafc62af89d6ed0e92288ce696442d18bf5d8eaae9`

The budgets remain open work. Next investigation should separately profile retained native vector objects, Hermes allocations and Media3 buffers on the target physical phone. A strict 80 MB idle requirement may require moving more of the interface and page drawing into native platform code; this run cannot establish that such a rewrite would meet the limit.

## GitHub iOS profiling

The `iOS native build` workflow also runs a `performance` suite on its release iPhone simulator app. Each stage gets a fresh installation: cold Home idle, Al-Fatiha reading, Al-Fatiha playback, longer Al-Imran playback with the page open, and Home after stopping playback. Sourced local recordings keep network download work out of the measured windows. Each measurement has a five-second settling interval and three recorded five-second windows, plus XCTest's warm-up iteration. UI polling and screenshots stay outside the timed blocks.

The `ios-performance` artifact contains raw `xcresulttool` JSON for `XCTMemoryMetric(application:)`, `XCTCPUMetric(application:)` and the elapsed clock metric. CPU time divided by elapsed time and multiplied by 100 gives average usage as a percentage of one simulator-host CPU core. Keep metric units from Xcode when interpreting the memory values. These are application metrics; they are not claimed to include every separately hosted WebKit service and must not be presented as proof of the whole-app 150 MB budget. Apple simulator results are also not physical-iPhone measurements. A successful UI test alone does not imply the memory budget passes.

### Verified simulator results — 2026-11-10

[GitHub run 42809589821](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/42809589821) passed its release build and all 12 native UI/performance tests at commit `3540fde240d4ed7914cb59f80c3156347ad21763`. The performance destination was an ARM64 iPhone 17 Pro simulator running iOS 26.5, built with Xcode 26.6. The iPad Pro 13-inch (M5) portrait/landscape test also passed.

| State | Application peak physical memory | Average application CPU | CPU range across windows |
| --- | ---: | ---: | ---: |
| Cold Home idle | 67.9 MB | reported 0.00% | reported zero in all three windows |
| Al-Fatiha page open | 109.6 MB | 0.012% | 0.002–0.020% |
| Al-Fatiha page open + audio | 107.3 MB | 1.66% | 1.60–1.73% |
| Al-Imran page open + audio | 116.5 MB | 1.79% | 1.64–2.05% |
| Home after Stop | 103.3 MB | 0.34% | 0.32–0.35% |

Memory is the maximum of the three `physical_peak` values; Xcode's decimal kB values are divided by 1,000 for MB. CPU is computed for each matched CPU-time/clock-time pair, then averaged. Idle's zero means the metric recorded no CPU time in these windows, not proof of zero CPU consumption. The lower short-playback value than reading reflects separate fresh-process runs and sampling variation; it does not mean audio uses negative memory. Neither an isolated audio allocation nor the whole app plus WebKit is measured here. Launch/page-transition peaks outside the steady measurement windows are not included.

These figures establish **67.9 MB cold idle and a 116.5 MB sampled playback peak for the application metric only**. They do not validate the requested 150 MB whole-app ceiling, the 70 MB audio allocation or physical-iPhone limits. Raw reports, test summaries, build log and the calculated `summary.json` are saved under `/home/saad/.t3/scratch/quran-ios-profile-2026-11-10/`.

The Xcode compilation step took 16 minutes 13 seconds. Its log contains ARM64 and x86_64 compilation although both tested simulators were ARM64. The subsequent workflow update uses `ONLY_ACTIVE_ARCH=YES` and prints a build timing summary to remove that redundant architecture work and make future delays diagnosable. That CI adjustment has not yet been timed on GitHub. Expo modules still build from source to preserve the pinned audio patch; changing to selective source builds is separate work.
