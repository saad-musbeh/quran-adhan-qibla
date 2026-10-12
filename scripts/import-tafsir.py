#!/usr/bin/env python3
"""Import QuranEnc's Arabic al-Tafsir al-Muyassar as a verified offline catalogue.

The QuranEnc API strings are copied verbatim. The bundled Arabic ayah text is
retained with each entry as required by the source's republication terms.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import html
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_KEY = "arabic_moyassar"
API_TEMPLATE = "https://quranenc.com/api/v1/translation/sura/{}/{}"
SOURCE_URL = "https://quranenc.com/ar/browse/arabic_moyassar"
METADATA_URL = "https://quranenc.com/ar/home/"
VERSION = "V1.0.0"
VERSION_DATE = "2017-02-15"
PUBLISHER = "مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة"
PUBLISHER_ENGLISH = "King Fahd Complex for the Printing of the Holy Qur’an in Madinah"


def fetch(surah: int) -> tuple[int, bytes]:
    url = API_TEMPLATE.format(SOURCE_KEY, surah)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "quran-adhan-qibla-tafsir-import/1.0 (+https://quranenc.com)",
        },
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return surah, response.read()
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == 4:
                raise RuntimeError(f"Could not fetch surah {surah} after 5 attempts: {error}") from error
            time.sleep(1.5 * (2**attempt))
    raise AssertionError("unreachable")


def fetch_metadata_page() -> bytes:
    request = urllib.request.Request(
        METADATA_URL,
        headers={"Accept": "text/html", "User-Agent": "quran-adhan-qibla-tafsir-import/1.0 (+https://quranenc.com)"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def verify_source_metadata(page: bytes) -> tuple[str, str, str]:
    """Read the release card and refuse to label an unreviewed release as V1.0.0."""
    source_html = page.decode("utf-8")
    cards = re.split(r'(?=<div class="tab_card\b)', source_html)
    card = next((part for part in cards if f"/browse/{SOURCE_KEY}\"" in part), None)
    if card is None:
        raise RuntimeError(f"Could not find QuranEnc homepage card for {SOURCE_KEY}")
    title_match = re.search(r"<h2\b[^>]*>(.*?)</h2>", card, flags=re.S)
    publisher_match = re.search(r"<small>(.*?)</small>", card, flags=re.S)
    version_match = re.search(r">\s*(\d{2}/\d{2}/\d{4})\s*-\s*(V[\d.]+)\s*<img", card)
    if not title_match or not publisher_match or not version_match:
        raise RuntimeError("QuranEnc release card metadata could not be parsed")

    def plain(value: str) -> str:
        return " ".join(html.unescape(re.sub(r"<[^>]*>", " ", value)).split())

    title = plain(title_match.group(1))
    publisher = plain(publisher_match.group(1))
    version_date, version = version_match.groups()
    version_date = datetime.strptime(version_date, "%d/%m/%Y").date().isoformat()
    expected_title = "اللغة العربية - التفسير الميسر"
    if title != expected_title or publisher.rstrip(".") != "صادر عن مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة":
        raise RuntimeError(f"Unexpected source card identity: title={title!r}, publisher={publisher!r}")
    if version != VERSION or version_date != VERSION_DATE:
        raise RuntimeError(
            f"QuranEnc release changed to {version} ({version_date}); review it before updating pinned {VERSION} ({VERSION_DATE})"
        )
    return title, publisher, f"{version} ({version_date})"


def main() -> None:
    quran = json.loads((ROOT / "src/data/quran.json").read_text(encoding="utf-8"))
    counts = {int(item["number"]): int(item["verseCount"]) for item in quran["surahs"]}
    if len(counts) != 114 or sum(counts.values()) != 6236:
        raise RuntimeError("Canonical Tanzil catalogue must contain 114 surahs and 6236 ayahs")

    raw_by_surah: dict[int, bytes] = {}
    # Five workers keeps the source load modest while allowing a complete import
    # in a reasonable time. Output order is validated below, independent of finish order.
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(fetch, surah) for surah in range(1, 115)]
        for future in concurrent.futures.as_completed(futures):
            surah, body = future.result()
            raw_by_surah[surah] = body

    metadata_body = fetch_metadata_page()
    source_title, source_publisher, source_version = verify_source_metadata(metadata_body)

    verses: dict[str, dict[str, str | None]] = {}
    raw_hashes: dict[str, str] = {}
    for surah in range(1, 115):
        body = raw_by_surah[surah]
        raw_hashes[str(surah)] = hashlib.sha256(body).hexdigest()
        payload = json.loads(body.decode("utf-8"))
        records = payload.get("result")
        if not isinstance(records, list) or len(records) != counts[surah]:
            actual = len(records) if isinstance(records, list) else "missing result list"
            raise RuntimeError(f"Surah {surah}: expected {counts[surah]} records, got {actual}")
        for expected_ayah, record in enumerate(records, 1):
            if int(record.get("sura", -1)) != surah or int(record.get("aya", -1)) != expected_ayah:
                raise RuntimeError(f"Unexpected/out-of-order key at surah {surah}, ayah {expected_ayah}")
            original_arabic = record.get("arabic_text")
            text = record.get("translation")
            footnotes = record.get("footnotes")
            if not isinstance(original_arabic, str) or not original_arabic:
                raise RuntimeError(f"Missing original Arabic text at {surah}:{expected_ayah}")
            if not isinstance(text, str) or not text:
                raise RuntimeError(f"Missing tafsir text at {surah}:{expected_ayah}")
            if footnotes is not None and not isinstance(footnotes, str):
                raise RuntimeError(f"Unexpected footnotes type at {surah}:{expected_ayah}")
            key = f"{surah}:{expected_ayah}"
            verses[key] = {"arabicText": original_arabic, "text": text, "footnotes": footnotes}

    expected_keys = {
        f"{surah}:{ayah}"
        for surah in range(1, 115)
        for ayah in range(1, counts[surah] + 1)
    }
    if set(verses) != expected_keys or len(verses) != 6236:
        raise RuntimeError("Tafsir keys do not exactly match the canonical Quran ayah catalogue")

    content_bytes = json.dumps(verses, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    retrieved = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    manifest = {
        "work": "التفسير الميسر",
        "translationKey": SOURCE_KEY,
        "source": "QuranEnc.com",
        "sourceUrl": SOURCE_URL,
        "metadataSourceUrl": METADATA_URL,
        "metadataPageSha256": hashlib.sha256(metadata_body).hexdigest(),
        "metadataPageSha256Meaning": "Exact UTF-8 response body from the official QuranEnc Arabic homepage containing the release card and publisher text",
        "apiUrlTemplate": "https://quranenc.com/api/v1/translation/sura/arabic_moyassar/{surah}",
        "publisher": PUBLISHER,
        "version": VERSION,
        "versionDate": VERSION_DATE,
        "verifiedHomepageCard": {
            "title": source_title,
            "publisher": source_publisher,
            "version": source_version,
        },
        "retrievedUtc": retrieved,
        "surahCount": 114,
        "ayahCount": 6236,
        "recordFields": ["arabicText", "text", "footnotes"],
        "rawResponseSha256BySurah": raw_hashes,
        "sourceBodySha256": hashlib.sha256(content_bytes).hexdigest(),
        "sourceBodySha256Input": "UTF-8 compact JSON of the ordered verses projection: arabic_text mapped to arabicText, translation mapped to text, and footnotes unchanged, keyed by surah:ayah",
        "retainedSourceMetadata": ["source translation key", "release version and date", "publisher", "source URL", "original Arabic ayah text", "footnotes"],
    }
    output = ROOT / "src/data/tafsir.json"
    bundled = {
        "edition": {
            "title": "التفسير الميسر",
            "translationKey": SOURCE_KEY,
            "publisher": PUBLISHER,
            "publisherEnglish": PUBLISHER_ENGLISH,
            "source": "QuranEnc.com",
            "sourceUrl": SOURCE_URL,
            "version": VERSION,
            "versionDate": VERSION_DATE,
        },
        "verses": verses,
    }
    output.write_text(json.dumps(bundled, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    assets_dir = ROOT / "assets/tafsir"
    assets_dir.mkdir(parents=True, exist_ok=True)
    (assets_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(verses)} ayah records to {output}")
    print(f"Source body SHA-256: {manifest['sourceBodySha256']}")


if __name__ == "__main__":
    main()
