#!/usr/bin/env python3
"""Rebuild the bundled Tanzil Uthmani catalogue from its official downloads."""
from __future__ import annotations

import json
import hashlib
from datetime import datetime, timezone
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_URL = "https://tanzil.net/pub/download/index.php?" + urllib.parse.urlencode({
    "quranType": "uthmani", "outType": "xml", "agree": "true",
    "marks": "true", "sajdah": "true", "rub": "false",
    "tatweel": "true", "stanween": "false",
})
META_URL = "https://tanzil.net/res/text/metadata/quran-data.xml"


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "quran-adhan-qibla-data-import/1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main() -> None:
    # Keep raw downloads in memory only; they are not checked into the repository.
    text_bytes = fetch(TEXT_URL)
    metadata_bytes = fetch(META_URL)
    text_root = ET.fromstring(text_bytes)
    metadata_root = ET.fromstring(metadata_bytes)
    meta_suras = metadata_root.find("suras")
    if meta_suras is None:
        raise RuntimeError("Tanzil metadata has no suras section")

    def starts(section: str, item: str) -> list[tuple[int, int, int]]:
        found = metadata_root.find(section)
        if found is None:
            raise RuntimeError(f"Tanzil metadata has no {section} section")
        return [(int(x.attrib["sura"]), int(x.attrib["aya"]), int(x.attrib["index"])) for x in found.findall(item)]

    pages = starts("pages", "page")
    juzs = starts("juzs", "juz")
    data_suras = {int(x.attrib["index"]): x for x in meta_suras.findall("sura")}
    text_suras = {int(x.attrib["index"]): x for x in text_root.findall("sura")}
    if len(data_suras) != 114 or len(text_suras) != 114:
        raise RuntimeError("Expected all 114 surahs in Tanzil text and metadata")

    def partition(surah: int, verse: int, boundaries: list[tuple[int, int, int]]) -> int:
        value = 1
        for start_sura, start_verse, index in boundaries:
            if (start_sura, start_verse) <= (surah, verse):
                value = index
            else:
                break
        return value

    output_suras = []
    output_verses = []
    global_number = 0
    for surah_no in range(1, 115):
        smeta = data_suras[surah_no]
        aya_nodes = text_suras[surah_no].findall("aya")
        expected = int(smeta.attrib["ayas"])
        if len(aya_nodes) != expected:
            raise RuntimeError(f"Surah {surah_no}: expected {expected} verses, got {len(aya_nodes)}")
        output_suras.append({
            "number": surah_no,
            "arabicName": smeta.attrib["name"],
            "transliteration": smeta.attrib["tname"],
            "englishName": smeta.attrib["ename"],
            "verseCount": expected,
            "startPage": partition(surah_no, 1, pages),
        })
        for aya in aya_nodes:
            verse_no = int(aya.attrib["index"])
            global_number += 1
            output_verses.append({
                "surah": surah_no,
                "number": verse_no,
                "globalNumber": global_number,
                "text": aya.attrib["text"],
                "page": partition(surah_no, verse_no, pages),
                "juz": partition(surah_no, verse_no, juzs),
            })
    if global_number != 6236:
        raise RuntimeError(f"Expected 6236 verses, got {global_number}")
    copyright_notice = "Tanzil Quran Text\nCopyright (C) 2007-2021 Tanzil Project\nLicense: Creative Commons Attribution 3.0\n\nThis copy of the Quran text is carefully produced, highly verified and continuously monitored by a group of specialists in Tanzil Project.\n\nTERMS OF USE:\n\n- Permission is granted to copy and distribute verbatim copies of this text, but CHANGING IT IS NOT ALLOWED.\n\n- This Quran text can be used in any website or application, provided that its source (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to keep track of changes.\n\n- This copyright notice shall be included in all verbatim copies of the text, and shall be reproduced appropriately in all files derived from or containing substantial portion of this text.\n\nPlease check updates at: http://tanzil.net/updates/"
    manifest = {
        "textSource": "Tanzil Uthmani Quran text 1.1 (published February 2021)",
        "metadataSource": "Tanzil Quran metadata 1.0",
        "retrieved": datetime.now(timezone.utc).date().isoformat(),
        "textUrl": TEXT_URL,
        "metadataUrl": META_URL,
        "textSha256": hashlib.sha256(text_bytes).hexdigest(),
        "metadataSha256": hashlib.sha256(metadata_bytes).hexdigest(),
        "surahCount": len(output_suras),
        "verseCount": len(output_verses),
        "copyright": copyright_notice,
        "licenseNotice": copyright_notice,
    }
    destination = ROOT / "src/data/quran.json"
    destination.write_text(json.dumps({"attribution": copyright_notice, "surahs": output_suras, "verses": output_verses}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (ROOT / "src/data/quran-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(output_suras)} surahs and {len(output_verses)} verses to {destination}")
    print(f"Text SHA-256: {manifest['textSha256']}\nMetadata SHA-256: {manifest['metadataSha256']}")


if __name__ == "__main__":
    main()
