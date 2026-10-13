# 0.4.4-test

This patch includes all 0.4.3 tablet, system-location, tafsir and Credits changes.
Android versionCode 14; iOS build 14. Same app package and signing identity;
install over the previous version to retain progress and private downloads.

## Easier page turns

A deliberate drag now turns the page after 18% of its width/height, capped at
64 CSS pixels, with a minimum 24 pixels. Previously it required half the page.
This applies to both horizontal and vertical turns, single pages and tablet
spreads. Shorter drags still return smoothly to the current page. Zoomed reading,
long-press verse actions, cancelled touches and first/last-page boundaries retain
the existing behavior. The iPad simulator check uses a short 90-point drag.

Tafsir archives remain the immutable, checksum-pinned 0.4.3-test release assets;
they are not downloaded again when updating. See [the tafsir catalogue](TAFSIR.md).
Native iOS checks now queue subsequent source updates instead of cancelling an
already-running simulator build.
