#!/usr/bin/env python3
"""Rebuild all eligible offline towns/cities from GeoNames, without country quotas."""
import hashlib
import io
import json
import subprocess
import tempfile
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEONAMES = "https://download.geonames.org/export/dump/"
FEATURES = {"PPLC", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPL", "PPLS"}
CITY_CHUNK_SIZE = 4096


def fetch(url, path):
    with urllib.request.urlopen(url, timeout=120) as response, path.open("wb") as output:
        modified = response.headers.get("Last-Modified", "unknown")
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    print(f"{path.name}: sha256 {digest}; Last-Modified {modified}", flush=True)


def main():
    with tempfile.TemporaryDirectory(prefix="city-catalogue-") as td:
        tmp = Path(td)
        for name in ("cities500.zip", "countryInfo.txt", "alternateNamesV2.zip"):
            fetch(GEONAMES + name, tmp / name)

        country_names = {}
        for line in (tmp / "countryInfo.txt").read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                fields = line.split("\t")
                country_names[fields[0]] = fields[4].strip()

        # Cities500 covers population >500 plus administrative seats. Exclude
        # neighborhoods, historical and abandoned records; retain every eligible
        # independent populated place regardless of religion or country population.
        selected = defaultdict(list)
        with zipfile.ZipFile(tmp / "cities500.zip") as archive:
            with io.TextIOWrapper(archive.open("cities500.txt"), encoding="utf-8") as rows:
                for line in rows:
                    fields = line.rstrip("\n").split("\t")
                    code = fields[8]
                    if code not in country_names or fields[6] != "P" or fields[7] not in FEATURES:
                        continue
                    try:
                        lat, lon, population = float(fields[4]), float(fields[5]), int(fields[14] or "0")
                    except ValueError:
                        continue
                    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                        continue
                    place = {"id": int(fields[0]), "name": fields[1], "countryCode": code,
                             "latitude": lat, "longitude": lon, "timeZone": fields[17],
                             "population": population}
                    if fields[2] and fields[2] != fields[1]:
                        place["asciiName"] = fields[2]
                    selected[code].append(place)
        for places in selected.values():
            places.sort(key=lambda place: (-place["population"], place["id"]))

        arabic = {}
        needed = {place["id"] for places in selected.values() for place in places}
        with zipfile.ZipFile(tmp / "alternateNamesV2.zip") as archive:
            with io.TextIOWrapper(archive.open("alternateNamesV2.txt"), encoding="utf-8") as rows:
                for line in rows:
                    fields = line.rstrip("\n").split("\t")
                    if len(fields) < 4 or fields[2] != "ar":
                        continue
                    try:
                        gid = int(fields[1])
                    except ValueError:
                        continue
                    if gid not in needed or not fields[3].strip() or (len(fields) > 7 and fields[7] == "1"):
                        continue
                    preferred = len(fields) > 4 and fields[4] == "1"
                    # First preferred alias wins; ordinary aliases cannot replace it.
                    if gid not in arabic or (preferred and not arabic[gid][1]):
                        arabic[gid] = (fields[3].strip(), preferred)

        out_countries, out_cities = [], []
        for code in sorted(selected, key=lambda item: country_names[item].casefold()):
            places = selected[code]
            out_countries.append({"code": code, "name": country_names[code], "cityCount": len(places)})
            for place in places:
                city = {key: value for key, value in place.items() if key != "population"}
                if place["id"] in arabic and arabic[place["id"]][0] != place["name"]:
                    city["arabicName"] = arabic[place["id"]][0]
                out_cities.append(city)

        # Bundle CLDR Arabic territory names; no native Intl.DisplayNames polyfill.
        label_script = "const fs=require('node:fs');const rows=JSON.parse(fs.readFileSync(0,'utf8'));const names=new Intl.DisplayNames(['ar'],{type:'region'});process.stdout.write(JSON.stringify(rows.map(row=>({...row,arabicName:names.of(row.code)||row.name}))));"
        out_countries = json.loads(subprocess.check_output(
            ["node", "-e", label_script], input=json.dumps(out_countries).encode("utf-8")))
        data_dir = ROOT / "src" / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        # Bound compiled array literals: a flat 224k-element literal crossed
        # Hermes' 65,535 dense-array boundary and crashed the release at launch.
        city_chunks = [out_cities[offset:offset + CITY_CHUNK_SIZE]
                       for offset in range(0, len(out_cities), CITY_CHUNK_SIZE)]
        for name, rows in (("cities.json", city_chunks), ("countries.json", out_countries)):
            (data_dir / name).write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"Generated {len(out_cities):,} cities across {len(out_countries)} countries/territories; {len(arabic):,} Arabic aliases", flush=True)


if __name__ == "__main__":
    main()
