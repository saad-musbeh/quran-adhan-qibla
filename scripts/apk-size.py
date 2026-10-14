#!/usr/bin/env python3
"""Measure packaged APK bytes and ensure every offline page/sound survived R8."""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('apk', type=Path)
parser.add_argument('--baseline', type=Path)
args = parser.parse_args()
manifest = json.loads((ROOT / 'src/data/mushaf-manifest.json').read_text())
with zipfile.ZipFile(args.apk) as apk:
    groups = defaultdict(int)
    hashes = set()
    abis = set()
    for item in apk.infolist():
        name = item.filename
        if name.startswith('lib/'):
            abis.add(name.split('/')[1])
            category = 'native libraries'
        elif name.endswith('.zst'):
            category = 'offline Quran pages'
        elif name.endswith('.dex'):
            category = 'Android code'
        elif name.endswith('index.android.bundle'):
            category = 'JavaScript bundle'
        elif name.endswith('.ogg'):
            category = 'Adhan recordings'
        else:
            category = 'other'
        groups[category] += item.compress_size
        if name.startswith('res/'):
            hashes.add(hashlib.sha256(apk.read(item)).hexdigest())
            if name.endswith('.wav'):
                raise SystemExit('Android APK unexpectedly includes iOS WAV excerpts')
    for name, expected in manifest['bundledZstdSha256'].items():
        if expected not in hashes:
            raise SystemExit(f'Missing or altered offline Quran page: {name}')
    for sound in (ROOT / 'assets/adhan').glob('*.ogg'):
        if hashlib.sha256(sound.read_bytes()).hexdigest() not in hashes:
            raise SystemExit(f'Missing or altered Adhan recording: {sound.name}')
    if not abis or not abis.issubset({'arm64-v8a', 'x86_64'}):
        raise SystemExit(f'Unexpected or missing Android architectures: {sorted(abis)}')
    for abi in abis:
        if f'lib/{abi}/libislamic_core.so' not in apk.namelist():
            raise SystemExit(f'Missing Rust calculation library for {abi}')
size = args.apk.stat().st_size
report = {'apk': str(args.apk), 'bytes': size, 'MiB': round(size / 1024**2, 2),
          'architectures': sorted(abis), 'packagedBytes': dict(groups),
          'verifiedOfflinePages': len(manifest['bundledZstdSha256']), 'verifiedAdhanRecordings': 6}
if args.baseline:
    baseline = args.baseline.stat().st_size
    report.update(baselineBytes=baseline, savedBytes=baseline-size, reductionPercent=round((baseline-size) / baseline * 100, 1))
print(json.dumps(report, indent=2))
