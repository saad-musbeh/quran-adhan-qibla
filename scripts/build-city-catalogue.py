#!/usr/bin/env python3
"""Rebuild the compact offline city catalogue from GeoNames and Pew downloads."""
import csv
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
PEW = "https://www.pewresearch.org/wp-content/uploads/sites/20/2025/06/Religious-Composition-2010-2020-dataset.zip"
FEATURES = {"PPLC", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPL", "PPLS"}

def fetch(url, path):
    urllib.request.urlretrieve(url, path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    print(f"{path.name}: sha256 {digest}")
    return digest

def main():
    with tempfile.TemporaryDirectory(prefix="city-catalogue-") as td:
        tmp = Path(td)
        fetch(GEONAMES + "cities500.zip", tmp / "cities500.zip")
        fetch(GEONAMES + "countryInfo.txt", tmp / "countryInfo.txt")
        fetch(GEONAMES + "alternateNamesV2.zip", tmp / "alternateNamesV2.zip")
        fetch(PEW, tmp / "pew.zip")

        country_rows = {}
        alpha_to_numeric = {}
        for line in (tmp / "countryInfo.txt").read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                f = line.split("\t")
                country_rows[f[2].lstrip("0") or "0"] = (f[0], f[4])
                alpha_to_numeric[f[0]] = f[2].lstrip("0") or "0"

        with zipfile.ZipFile(tmp / "pew.zip") as z:
            csv_name = next(n for n in z.namelist() if n.endswith("(percentages).csv"))
            rows = csv.DictReader(io.TextIOWrapper(z.open(csv_name), encoding="utf-8-sig"))
            muslim_share = {r["Countrycode"].lstrip("0") or "0": float(r["Muslims"])
                            for r in rows if r["Year"] == "2020" and r["Level"] == "1"}

        # Cities500 is already population-thresholded; excluding PPLX avoids selecting
        # neighborhood/district records as substitutes for independent towns.
        selected = defaultdict(list)
        with zipfile.ZipFile(tmp / "cities500.zip") as z:
            with io.TextIOWrapper(z.open(z.namelist()[0]), encoding="utf-8") as f:
                for line in f:
                    c = line.rstrip("\n").split("\t")
                    code = c[8]
                    numeric = alpha_to_numeric.get(code)
                    if numeric not in muslim_share or c[6] != "P" or c[7] not in FEATURES:
                        continue
                    try:
                        lat, lon, pop = float(c[4]), float(c[5]), int(c[14] or "0")
                    except ValueError:
                        continue
                    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                        continue
                    selected[code].append({"id": int(c[0]), "name": c[1], "countryCode": code,
                                           "latitude": lat, "longitude": lon, "population": pop,
                                           "timeZone": c[17], "numeric": numeric})

        for places in selected.values():
            places.sort(key=lambda p: (-p["population"], p["id"]))

        arabic = {}
        needed = {p["id"] for places in selected.values() for p in places[:70]}
        with zipfile.ZipFile(tmp / "alternateNamesV2.zip") as z:
            member = next(n for n in z.namelist() if n.endswith("alternateNamesV2.txt"))
            with io.TextIOWrapper(z.open(member), encoding="utf-8") as f:
                for line in f:
                    c = line.rstrip("\n").split("\t")
                    if len(c) < 4 or c[2] != "ar":
                        continue
                    try: gid = int(c[1])
                    except ValueError: continue
                    if gid not in needed or not c[3].strip():
                        continue
                    # First preferred/ordinary name encountered is adequate; avoid historic aliases.
                    historic = len(c) > 7 and c[7] == "1"
                    if historic: continue
                    preferred = len(c) > 4 and c[4] == "1"
                    if gid not in arabic or preferred:
                        arabic[gid] = c[3].strip()

        out_countries, out_cities = [], []
        for code, (alpha, name) in sorted(country_rows.items(), key=lambda item: item[1][1].casefold()):
            if code not in muslim_share:
                continue
            majority = muslim_share[code] >= 50
            target = 70 if majority else 30
            places = selected.get(alpha, [])[:target]
            if not places:
                continue
            out_countries.append({"code": alpha, "name": name,
                                  "cityCount": len(places), "targetCount": target})
            for p in places:
                city = {k: p[k] for k in ("id", "name", "countryCode", "latitude", "longitude", "timeZone")}
                if p["id"] in arabic and arabic[p["id"]] != p["name"]:
                    city["arabicName"] = arabic[p["id"]]
                out_cities.append(city)

        # Use the project’s Node runtime to bundle CLDR Arabic territory labels.
        # Hermes does not need Intl.DisplayNames at app runtime.
        label_script = "const fs=require('node:fs');const rows=JSON.parse(fs.readFileSync(0,'utf8'));const names=new Intl.DisplayNames(['ar'],{type:'region'});process.stdout.write(JSON.stringify(rows.map(row=>({...row,arabicName:names.of(row.code)||row.name}))));"
        out_countries = json.loads(subprocess.check_output(
            ["node", "-e", label_script], input=json.dumps(out_countries).encode("utf-8")))

        data_dir = ROOT / "src" / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        (data_dir / "cities.json").write_text(json.dumps(out_cities, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        (data_dir / "countries.json").write_text(json.dumps(out_countries, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"Generated {len(out_cities)} cities across {len(out_countries)} countries/territories")

if __name__ == "__main__": main()
