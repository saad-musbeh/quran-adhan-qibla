# Tafsir library provenance

The optional in-app catalogue contains four Arabic QuranEnc editions:

| Edition | Publisher | QuranEnc release | Source |
| --- | --- | --- | --- |
| **التفسير الميسر** (`arabic_moyassar`) | مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة | V1.0.0, 15 February 2017 | [Browse source](https://quranenc.com/ar/browse/arabic_moyassar) |
| **المختصر في تفسير القرآن الكريم** (`arabic_mokhtasar`) | مركز تفسير للدراسات القرآنية | V1.0.0, 15 February 2017 | [Browse source](https://quranenc.com/ar/browse/arabic_mokhtasar) |

QuranEnc's [Arabic homepage](https://quranenc.com/ar/home/) lists each source title, publisher, version, and release date. The corresponding source API is `https://quranenc.com/api/v1/translation/sura/{translation_key}/{surah_number}`. The catalogue preserves the source key and edition metadata; before downloading a book, the app verifies that the current QuranEnc card still matches its pinned version and date.

The app fetches one book only after the user requests it. It validates each surah’s exact ayah count and order against the bundled canonical Tanzil catalogue, then commits the private app-storage file only after all 6,236 ayahs pass. Cancellation, incomplete responses, and validation failures leave no usable partial edition. A downloaded book remains available offline until removed.

`src/data/tafsir.json` is a development-time provenance fixture for **Moyassar V1.0.0** only. It is not imported by the app runtime, is not the Mokhtasar download, and is not included as runtime tafsir content. `manifest.json` records its UTC retrieval time, the official homepage response hash, raw API response SHA-256 by surah, and a SHA-256 of the ordered content projection. `scripts/import-tafsir.py` rebuilds this fixture and aborts if the official Moyassar card no longer matches the pinned release. Tests use the fixture to check canonical coverage, source metadata, and integrity; they do not use it as an offline app catalogue.

QuranEnc's conditional reuse wording is transcribed in [TERMS.md](TERMS.md). It is a source-specific permission and does not change the MIT license for application code.

## Additional editions verified on 12 October 2026

- `arabic_saadi`: V1.0.0 (27 July 2026). Uses QuranEnc's `/api/v1/tafsir/sura/arabic_saadi/{surah}` endpoint. All 114 surahs were validated against canonical verse counts. Commentary is displayed by source passage with its ayah range; the two passages sharing Al-Kahf 99 both remain accessible. Raw source paragraphs, introductions and conclusions are retained. The private downloaded book stores the original source records without duplicating them for each ayah.
- `arabic_nafahat`: V1.0.0 (17 December 2025). Uses `/api/v1/translation/sura/arabic_nafahat/{surah}`. All 114 surahs and 6,236 ordered entries were validated.

Raw response digests and completeness results are in `catalogue-verification-2026-10-12.json`. No new tafsir text is bundled. The catalogue still checks each official homepage card before permitting a download.

## Publication dates

The original first book publication and the first QuranEnc digital edition are separate fields. Gregorian source dates are displayed with the Umm al-Qura Hijri calendar.

- **Al-Mukhtasar: 1434 AH.** The publisher's [collection catalogue](https://tafsir.net/collection/681) dates its first announcement to 10 Ramadan 1434 / 18 July 2013.
- **Al-Saadi: 1375 AH.** The [printed edition's forewords](https://arabic-books.amuslim.org/التفاسير/Web/42/001.htm), including the testimony of Abdullah ibn Aqil, describe the first printed volume in 1375 AH and the remaining volumes in 1376–1377 AH. This records the beginning of publication, not the composition date or the later 1420 AH edited edition.
- **Al-Moyassar and Al-Nafahat:** the inspected official source pages do not establish an original first-print date. The UI says that it is undocumented, and independently supplies the verified first digital edition date. A date for an unrelated book with a similar title is never substituted.
