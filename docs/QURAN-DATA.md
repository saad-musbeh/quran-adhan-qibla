# Quran text data

Search, accessible verse labels, and audio references use the bundled Uthmani Quran text from the official Tanzil Project download and its surah/page/juz structure from Tanzil metadata. The importer is `scripts/import-quran.py`; it downloads the source files into memory, writes the compact `src/data/quran.json` catalogue, and records a source manifest in `src/data/quran-manifest.json`. It does not retain raw downloads in the repository. The imported text is taken from each XML `aya` text attribute without normalization or editorial changes.

The checked-in catalogue contains 114 surahs and 6,236 ayahs. Verse counts and surah names come from Tanzil metadata 1.0; Legacy Medina Mushaf page (1–604) and juz (1–30) are assigned using the source's boundary records. Page and juz values identify the page/section in which each ayah begins.

## Provenance snapshot

- Tanzil Uthmani text version 1.1, published February 2021; downloaded 2026-10-11 from `https://tanzil.net/pub/download/index.php` as XML with pause marks, sajdah signs, and superscript-alef tatweel enabled; rub-el-hizb signs and sequential tanweens disabled.
- Exact download URL: `https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=xml&agree=true&marks=true&sajdah=true&rub=false&tatweel=true&stanween=false`
- Downloaded text XML SHA-256: `af9311c521b5dadab01ea1ef259c281ffa83cf224bad24ee89469ce1c3c72916`
- Tanzil Quran metadata version 1.0, from `https://tanzil.net/res/text/metadata/quran-data.xml`, downloaded 2026-10-11.
- Metadata XML SHA-256: `8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a`

The hashes cover the exact downloaded XML bytes, including the source copyright block. Re-running the importer refreshes the source snapshot and these values; review any source change carefully before distributing the regenerated text.

## Required attribution and license notice

Tanzil identifies the text license as Creative Commons Attribution 3.0 and requires verbatim distribution, no text changes, attribution to Tanzil Project, a link to `https://tanzil.net`, and retention of this notice in files containing substantial portions of the text. The full notice is embedded in both `src/data/quran.json` and `src/data/quran-manifest.json`:

> Tanzil Quran Text  
> Copyright (C) 2007-2021 Tanzil Project  
> License: Creative Commons Attribution 3.0  
>  
> This copy of the Quran text is carefully produced, highly verified and continuously monitored by a group of specialists in Tanzil Project.  
>  
> TERMS OF USE:  
>  
> - Permission is granted to copy and distribute verbatim copies of this text, but CHANGING IT IS NOT ALLOWED.  
> - This Quran text can be used in any website or application, provided that its source (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to keep track of changes.  
> - This copyright notice shall be included in all verbatim copies of the text, and shall be reproduced appropriately in all files derived from or containing substantial portion of this text.  
>  
> Please check updates at: http://tanzil.net/updates/

References: [Tanzil download page](https://tanzil.net/download/), [Tanzil text license](https://tanzil.net/docs/Text_License), [Tanzil metadata specification](https://tanzil.net/docs/Quran_Metadata).

## Quran font

`assets/quran/AmiriQuran.ttf` is Amiri Quran Regular from the [official Amiri 1.003 release](https://github.com/aliftype/amiri/releases/tag/1.003), included under the SIL Open Font License 1.1. Its license is preserved in `assets/quran/OFL.txt`. Font SHA-256: `e2a47644762d16bdfb6d33e0d8db8c6ff30beae84150ef5a705316bbd829455c`; license SHA-256: `72de68e5954f4fdd24702292ef5a32f003ca960ec9330dc86e5eefb5dffb9b22`. The font is a display aid only; it does not modify or replace the source text.

## Data limitations

This is a text-and-structure dataset; it does not include a translation, tafsir, tajweed color coding, or page-image facsimile. Do not normalize, strip marks, concatenate, or rewrite Quran verse strings in derived distributions. The standalone Basmala used by UI for surahs other than Al-Fatiha and At-Tawbah may be shown by reusing the exact verified text of Al-Fatiha 1:1; it is not numbered as a verse in those chapters.

The full-page reader displays the 604 original vector text blocks from the Hafs/KFGQPC 1441H edition published by Quran.ws, pinned at commit `b4155f07e4aea087d2c458069acff9f7c7e749f6`. Calligraphy and printed line breaks come from the artwork rather than Unicode wrapping. The 0.3.3 redesign preserves all source Quran path data and extracted verse data. Pages 1 and 2 use a tighter SVG `viewBox` crop computed from the painted paths' `getBBox()` plus seven SVG units of padding; this changes the viewBox only, not the source paths or text. Verse polygons drive audio highlighting and long-press playback. Search, surah selection, and audio following use this edition’s extracted verse/page index; the older Tanzil page field is retained as source metadata.

The source SVG export crops the printed text block and omits the outer page frame, running header, and folio. The app centers every page's artwork at equal 12.75% left and right margins and supplies a warm-white page, Arabic running labels, and page number. Reader colors are selectable from **Quran reader color** in the top gear sheet; green, maroon, blue, black, and brown palettes are saved locally. The frame, metadata, and controls follow the selected theme, while night reading keeps its dark background and light text.

The Al-Fatiha and opening Al-Baqarah pages use an original geometric navy-and-gold frame. It leaves the source text clear and uses nested rules, corner stars, and top/bottom medallions. Its primary historical reference is The Met's [Opening Folio of the 26th Volume of the “Anonymous Baghdad Qur'an”](https://www.metmuseum.org/art/collection/search/451015?searchField=All), whose collection record describes distinct geometric schemes prefacing the volumes. This is a design reference only: no museum image or ornament was copied. Later surah headings use the separate sparse banner frame. The Quran calligraphy remains the pinned source artwork. Source SVG assets retain their path data inside lossless gzip assets, with both compressed and original checksums recorded. See [Mushaf artwork provenance](../assets/mushaf/PROVENANCE.md) and the complete upstream license there. All 604 assets are bundled for offline use.

## Optional Arabic tafsir library

The app does not bundle tafsir text in its runtime. The library offers two QuranEnc editions for optional private downloads: **التفسير الميسر** (`arabic_moyassar`), published by مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة, V1.0.0 dated 15 February 2017; and **المختصر في تفسير القرآن الكريم** (`arabic_mokhtasar`), published by مركز تفسير للدراسات القرآنية, V1.0.0 dated 15 February 2017. Each catalog entry links to its [Moyassar](https://quranenc.com/ar/browse/arabic_moyassar) or [Mokhtasar](https://quranenc.com/ar/browse/arabic_mokhtasar) source page and identifies the publisher and pinned release.

Before each download, the app checks the matching QuranEnc homepage card against that title’s pinned version and date. A release mismatch stops the download pending an intentional metadata/source update. The app then downloads all 114 surahs with bounded concurrency and validates the exact ayah order and counts against the canonical Quran catalogue. It writes to a temporary file and makes the edition available only after all 6,236 ayahs pass validation and the complete file is committed. Users can cancel an active download, remove a saved edition, and select any fully downloaded book. Selection is saved locally; installed editions remain readable offline. Failed or cancelled downloads are not made available as partial books.

The loop controls use the existing Quran audio engine and accept endpoints from the same surah only. **Start loop here** on a long-pressed ayah immediately starts that ayah through the surah’s final ayah. A user may tap an ending ayah on the page to open the range editor seeded with that endpoint. In the range sheet, **Choose ayahs on the page** lets the user tap a start and end ayah directly; the editor can also set the range using its surah picker and verse fields. An empty ending-ayah field means the surah’s final ayah. The chosen range is loaded into a native playlist and looped with the native queue's repeat-all mode. Ranges cannot cross surah boundaries.

`src/data/tafsir.json` contains a retained development provenance fixture for the Moyassar source, not a runtime import. Its upstream snapshots and checksum are documented in [tafsir provenance](../assets/tafsir/PROVENANCE.md); [QuranEnc reuse terms](../assets/tafsir/TERMS.md) apply to both books. The fixture is not a substitute for the per-book runtime downloads and no tafsir is generated by the app.
