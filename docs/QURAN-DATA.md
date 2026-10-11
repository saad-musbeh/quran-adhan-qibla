# Quran text data

The reader bundles the Uthmani Quran text from the official Tanzil Project download and its surah/page/juz structure from Tanzil metadata. The importer is `scripts/import-quran.py`; it downloads the source files into memory, writes the compact `src/data/quran.json` catalogue, and records a source manifest in `src/data/quran-manifest.json`. It does not retain raw downloads in the repository. The imported text is taken from each XML `aya` text attribute without normalization or editorial changes.

The checked-in catalogue contains 114 surahs and 6,236 ayahs. Verse counts and surah names come from Tanzil metadata 1.0; Medina Mushaf page (1–604) and juz (1–30) are assigned using the source's boundary records. Page and juz values identify the page/section in which each ayah begins.

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
