# Hafs Madinah Mushaf vector pages

This app bundles the 604 Hafs/KFGQPC Madinah Mushaf vector pages from the
`quran-ws/quran-svg` project, pinned at commit
`b4155f07e4aea087d2c458069acff9f7c7e749f6`. The source paths are
`mushafs/hafs/kfqc/svg/001.svg` through `604.svg`. Each SVG contains the
original per-page vector calligraphy and ornaments, plus verse polygons with
surah/ayah identifiers. The page renderer uses those polygons to link recited
verses to the printed page. The separate `src/data/mushaf-pages.json` is a
compact index extracted from the verse polygon identifiers.

## Closing dua appendix (reader sheets 605–606)

After the 604 Quran pages, the reader offers **دعاء ختم القرآن** on two
standalone appendix sheets. They contain the complete Arabic wording supplied
by the user in two photos of printed closing dua pages, in the photographed
reading order:

- Printed page 605: attachment `image_f9d1822d-7133-4ee3-a3ba-a55fbf420370`,
  opening «اللهم ارحمني بالقرآن», ending «وتقبل صلاتي واغفر خطيئاتي».
- Printed page 606: attachment `image_478649c5-abf8-456e-ad04-f2fb1f0a034f`,
  continuing «وأسألك العلا من الجنة» and ending with the salawat
  «وصلى الله على نبينا محمد وعلى آله وأصحابه الأخيار وسلم تسليما كثيرا».

The photos were supplied in this project conversation on 2026-10-17; the
publisher and edition are not identified. The wording is transcribed in
[`pages-src/khatm-dua.json`](./pages-src/khatm-dua.json). The app uses the
Arabic words without the photographs' vowel marks; it does not add prayers,
translate the supplication, or attribute the whole compilation to the Prophet.
The shorter draft's attribution to *al-Nashr* has been removed because it did
not document the full compilation requested in these photographs.

The frame and typesetting are original app artwork, using the existing Amiri
Quran font and `345 × 550` viewBox. The Arabic glyphs are converted to vector
paths at build time, so runtime font loading cannot shift the lines. Both
sheets fit the actual ink bounds with at least three SVG units between rows. The source SVGs are
[`pages-src/605.svg`](./pages-src/605.svg) and
[`pages-src/606.svg`](./pages-src/606.svg). Rebuild them and their offline
Zstandard assets with `python3 scripts/build-khatm-pages.py` (PyGObject/PangoCairo, pycairo,
fontconfig and the `zstd` CLI are required). `src/domain/khatm-dua.test.ts` checks
that all transcribed words survive wrapping and compression, including the
continuation boundary and final salawat.

These are supplication appendix sheets rather than additional Quran pages.
The original 604 Quran assets, source checksums, verse index, and verse counts
remain unchanged. The appendix has no ayah polygons or recitation targets.

Page dimensions use SVG viewBox `0 0 345 550`. Page 599 contains verses 98:6
through 100:5; page 600 contains 100:6 through 102:8. The importer validates
all 604 page numbers, all 6,236 verse keys, and these page boundaries. It
stores the original SVG bytes inside independent lossless Zstandard frames so the
offline application can ship them more compactly. The manifest records each
source SVG SHA-256 and its corresponding compressed asset SHA-256.

The `quran-ws/quran-svg` license covers its index and verse-polygon metadata
under CC BY 4.0; it waives attribution for use inside a product. The original
vector calligraphy is third-party KFGQPC artwork, and its separate terms remain
in force. KFGQPC's [official digital Mushaf rights notice](https://dm.qurancomplex.gov.sa/rights/)
grants free use of the complete digital Madinah Mushaf in computer programs
and other listed uses. The notice limits commercial printing/import of
physical Mushaf copies in Saudi Arabia; this project bundles digital vectors.
See the complete upstream license text in [LICENSE.txt](./LICENSE.txt).

The upstream [provenance record](./UPSTREAM-PROVENANCE.md) traces the artwork
to KFGQPC's 1441H Hafs Illustrator master archive and describes which page
elements the SVG export retains. In particular, the SVG preserves the
calligraphic typesetting and ornaments but is a cropped text block rather than
a pixel copy of the entire printed page; running headers, the full decorative
frame, and printed folio are outside the SVG artwork. The reader adds app page
chrome around this preserved artwork.

Primary sources:

- [KFGQPC digital Mushaf rights](https://dm.qurancomplex.gov.sa/rights/)
- [Pinned Quran.ws Hafs SVG edition](https://github.com/quran-ws/quran-svg/tree/b4155f07e4aea087d2c458069acff9f7c7e749f6/mushafs/hafs/kfqc/svg)
- [Quran.ws license](https://github.com/quran-ws/quran-svg/blob/b4155f07e4aea087d2c458069acff9f7c7e749f6/LICENSE)
- [Quran.ws art provenance](https://github.com/quran-ws/quran-svg/blob/b4155f07e4aea087d2c458069acff9f7c7e749f6/docs/PROVENANCE.md)

To reproduce assets, install the `zstd` command-line tool and run
`python3 scripts/import-mushaf.py`. For an offline recompression of the already
verified pages, run `python3 scripts/import-mushaf.py --repack`. Every repacked
page must match its pinned original SVG SHA-256 before it is written. Zstandard
1.5.7 at level 19 reduced the 604-page assets from 95,248,101 to 70,340,492 bytes.
The app decodes one page at a time with the pure-JavaScript `fzstd` decoder;
no native decoder, image rasterization, path rounding or content edits are used. It downloads only
the pinned Hafs/KFGQPC pages and regenerates the compressed asset files, page
verse index, checksums, and static Metro asset map. No source archive or network
connection is required at app runtime.
