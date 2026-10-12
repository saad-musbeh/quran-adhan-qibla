# Tafsir library provenance

The optional in-app catalogue contains two Arabic QuranEnc editions:

| Edition | Publisher | QuranEnc release | Source |
| --- | --- | --- | --- |
| **التفسير الميسر** (`arabic_moyassar`) | مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة | V1.0.0, 15 February 2017 | [Browse source](https://quranenc.com/ar/browse/arabic_moyassar) |
| **المختصر في تفسير القرآن الكريم** (`arabic_mokhtasar`) | مركز تفسير للدراسات القرآنية | V1.0.0, 15 February 2017 | [Browse source](https://quranenc.com/ar/browse/arabic_mokhtasar) |

QuranEnc's [Arabic homepage](https://quranenc.com/ar/home/) lists each source title, publisher, version, and release date. The corresponding source API is `https://quranenc.com/api/v1/translation/sura/{translation_key}/{surah_number}`. The catalogue preserves the source key and edition metadata; before downloading a book, the app verifies that the current QuranEnc card still matches its pinned version and date.

The app fetches one book only after the user requests it. It validates each surah’s exact ayah count and order against the bundled canonical Tanzil catalogue, then commits the private app-storage file only after all 6,236 ayahs pass. Cancellation, incomplete responses, and validation failures leave no usable partial edition. A downloaded book remains available offline until removed.

`src/data/tafsir.json` is a development-time provenance fixture for **Moyassar V1.0.0** only. It is not imported by the app runtime, is not the Mokhtasar download, and is not included as runtime tafsir content. `manifest.json` records its UTC retrieval time, the official homepage response hash, raw API response SHA-256 by surah, and a SHA-256 of the ordered content projection. `scripts/import-tafsir.py` rebuilds this fixture and aborts if the official Moyassar card no longer matches the pinned release. Tests use the fixture to check canonical coverage, source metadata, and integrity; they do not use it as an offline app catalogue.

QuranEnc's conditional reuse wording is transcribed in [TERMS.md](TERMS.md). It is a source-specific permission and does not change the MIT license for application code.
