#!/usr/bin/env python3
"""Import the pinned Hafs/KFQC Quran.ws vector Mushaf pages without rewriting them."""

from __future__ import annotations

import hashlib
import gzip
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import re
import tempfile
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REVISION = "b4155f07e4aea087d2c458069acff9f7c7e749f6"
RAW_ROOT = f"https://raw.githubusercontent.com/quran-ws/quran-svg/{REVISION}"
SVG_ROOT = "mushafs/hafs/kfqc/svg"
ASSET_DIR = ROOT / "assets/mushaf/pages"
DATA_PATH = ROOT / "src/data/mushaf-pages.json"
MANIFEST_PATH = ROOT / "src/data/mushaf-manifest.json"


def fetch(url: str, timeout: int = 90) -> bytes:
    last_error = None
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "QuranMushafOfflineImporter/1.0"})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if response.status != 200:
                    raise RuntimeError(f"Unexpected HTTP {response.status}: {url}")
                return response.read()
        except (TimeoutError, urllib.error.URLError) as error:
            last_error = error
            if attempt == 4:
                break
            time.sleep(0.5 * (2**attempt))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extract_page(page_number: int, raw: bytes) -> dict:
    root = ET.fromstring(raw)
    if root.tag.rsplit("}", 1)[-1] != "svg":
        raise ValueError(f"Page {page_number} is not an SVG document")
    view_box = root.attrib.get("viewBox", "").split()
    if len(view_box) != 4:
        raise ValueError(f"Page {page_number} has no four-value SVG viewBox")
    width, height = float(view_box[2]), float(view_box[3])
    keys = []
    seen = set()
    for element in root.iter():
        classes = element.attrib.get("class", "").split()
        if "ayahPolygon" not in classes:
            continue
        surah, ayah = element.attrib.get("surah"), element.attrib.get("ayah")
        if not surah or not ayah:
            raise ValueError(f"Page {page_number} has an ayah polygon without verse attributes")
        key = f"{int(surah)}:{int(ayah)}"
        if key not in seen:
            seen.add(key)
            keys.append(key)
    if not keys:
        raise ValueError(f"Page {page_number} contains no ayah polygons")
    keys.sort(key=lambda key: tuple(int(value) for value in key.split(":")))
    return {"page": page_number, "width": width, "height": height, "verseKeys": keys}


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    source_checksums = {}
    gzip_checksums = {}
    total_bytes = 0
    total_gzip_bytes = 0
    with tempfile.TemporaryDirectory(prefix="quran-mushaf-source-") as temporary:
        temp = Path(temporary)

        def download(page_number: int):
            filename = f"{page_number:03d}.svg"
            raw = fetch(f"{RAW_ROOT}/{SVG_ROOT}/{filename}")
            metadata = extract_page(page_number, raw)
            (temp / filename).write_bytes(raw)
            return page_number, filename, digest(raw), len(raw), metadata

        with ThreadPoolExecutor(max_workers=8) as pool:
            pages = list(pool.map(download, range(1, 605)))
        for page_number, filename, source_hash, byte_count, metadata in pages:
            source_checksums[filename] = source_hash
            records.append(metadata)
            total_bytes += byte_count

        if len(records) != 604 or [page["page"] for page in records] != list(range(1, 605)):
            raise ValueError("Expected exactly pages 1 through 604")
        verse_keys = {key for page in records for key in page["verseKeys"]}
        if len(verse_keys) != 6_236:
            raise ValueError(f"Expected all 6,236 Hafs verse keys, found {len(verse_keys)}")
        if records[598]["verseKeys"][0] != "98:6" or records[599]["verseKeys"][0] != "100:6":
            raise ValueError("The pinned pages do not match the verified 599/600 boundary")
        if records[598]["verseKeys"][-1] != "100:5" or records[599]["verseKeys"][-1] != "102:8":
            raise ValueError("The pinned pages do not match the verified 599/600 ending")

        # Deterministic gzip changes only transfer/storage encoding, not SVG bytes.
        for page_number in range(1, 605):
            filename = f"{page_number:03d}.svg"
            original = (temp / filename).read_bytes()
            compressed = gzip.compress(original, compresslevel=9, mtime=0)
            (ASSET_DIR / f"{filename}.gz").write_bytes(compressed)
            gzip_checksums[f"{filename}.gz"] = digest(compressed)
            total_gzip_bytes += len(compressed)

    compact = json.dumps(records, ensure_ascii=False, separators=(",", ":")) + "\n"
    DATA_PATH.write_text(compact, encoding="utf-8")
    manifest = {
        "edition": "KFGQPC Madinah Mushaf, Hafs, 1441H SVG vector edition",
        "upstream": f"quran-ws/quran-svg@{REVISION}/{SVG_ROOT}",
        "generatedAtUTC": datetime.now(timezone.utc).isoformat(),
        "pageCount": len(records),
        "uniqueVerseCount": len(verse_keys),
        "sourceSvgBytes": total_bytes,
        "bundledSvgGzipBytes": total_gzip_bytes,
        "sourceSvgSha256": source_checksums,
        "bundledGzipSha256": gzip_checksums,
        "indexSha256": digest(DATA_PATH.read_bytes()),
        "svgViewBox": "0 0 345 550",
        "layout": "Original per-page vector calligraphy and ornaments preserved; source bytes stored with deterministic gzip (mtime=0). The original SVG hash is retained for every page.",
        "license": "Quran.ws per-page metadata/polygon layer: CC BY 4.0, attribution waived for use inside a product. KFGQPC artwork: use under KFGQPC's official digital Madinah Mushaf rights. See assets/mushaf/LICENSE.txt and PROVENANCE.md.",
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    assets = ["/** Static Metro asset map for the offline Hafs/KFQPC Mushaf SVG pages. */", "export const MUSHAF_PAGE_ASSETS: Record<number, number> = {"]
    assets.extend(f"  {page}: require('../../assets/mushaf/pages/{page:03d}.svg.gz')," for page in range(1, 605))
    assets.extend(["};", ""])
    (ROOT / "src/data/mushaf-assets.ts").write_text("\n".join(assets), encoding="utf-8")
    print(f"Imported {len(records)} page SVGs, {len(verse_keys)} verses, {total_bytes:,} source bytes → {total_gzip_bytes:,} gzipped asset bytes")


if __name__ == "__main__":
    main()
