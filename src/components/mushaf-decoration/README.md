# Mushaf page ornaments

These SVGs are reusable decoration layers with empty text slots. They contain no Arabic verse, surah, or number glyphs; Quranic text and verse numbering must remain sourced from the app's verified Quran data/font pipeline.

- `surah-banner.svg` is a manually authored vector banner modeled on the green-and-gold floral band visible in the user-provided screenshots of Mushaf pages 599–600. It has a transparent-to-content cream center slot, symmetric floral side panels, and a double gold border.

`surah-banner.ts` embeds the same blank SVG for the offline WebView renderer. The banner is placed behind the original calligraphic surah title, above the following Basmala; it does not replace Quran text.

This frame is original project artwork under the repository's MIT license. It recreates the reference's green-and-gold style and is not claimed to be the reference application's exact decorative asset. No third-party scan was incorporated.

## Opening pages (0.4.1)

`opening-frame.ts` is original vector artwork inspired by the user's floral Mushaf references: green garden borders, rose rosettes, gilt rules, an oval paper field and an empty heading cartouche. The renderer moves the original verified surah-title glyph group into that slot. Verse glyphs, basmala, number outlines and verse hit polygons remain together; no source SVG file is changed. The footer contains floral decoration only, with no added Quran text. Day/night palettes maintain contrast, and cached pages inherit night mode before they are shown.
