#!/usr/bin/env python3
"""Import the three Arabic Hisn al-Muslim collections from a pinned MIT source."""
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SHA = '872764ca013116c905f7fc9c3dc972c27cd37d4a'
BASE = f'https://raw.githubusercontent.com/asellam/HisnElMuslim/{SHA}'
EXPECTED = 'b30a448ef40184b0422c40bd3c372bf2b25bfb5b0539fd3699e6b4fba9459d80'
COLLECTIONS = {
    'morning': 'أَذْكَارُ الصَّبَاحِ',
    'evening': 'أَذْكَارُ المَسَاءِ',
    'after-prayer': 'الأَذْكَارُ بَعْدَ السَّلَامِ مِنَ الصَّلَاةِ',
}
source = urllib.request.urlopen(BASE + '/hisn.json', timeout=30).read()
if hashlib.sha256(source).hexdigest() != EXPECTED:
    raise RuntimeError('Hisn source checksum mismatch')
book = json.loads(source)
collections = {}
for collection, title in COLLECTIONS.items():
    entries = book[title]['Adhkar']
    collections[collection] = [
        {'id': f'{collection}-{index+1}', 'text': entry['Text'].replace('\\r\\n', '\n'),
         'count': entry['Count'], 'reference': entry['Reference']}
        for index, entry in enumerate(entries)
    ]
    for entry in collections[collection]:
        if not entry['text'] or not entry['reference'] or not isinstance(entry['count'], int) or entry['count'] < 1:
            raise RuntimeError('Invalid Hisn entry')
path = ROOT / 'src/data/adhkar.json'
path.write_text(json.dumps(collections, ensure_ascii=False, indent=2) + '\n')
license_text = urllib.request.urlopen(BASE + '/LICENSE.md', timeout=30).read().decode()
(ROOT / 'assets/licenses/HisnElMuslim-MIT.txt').write_text(license_text)
(ROOT / 'src/data/adhkar-license.ts').write_text('export const HISN_LICENSE = ' + json.dumps(license_text) + ';\n')
manifest = {'repository': 'https://github.com/asellam/HisnElMuslim', 'commit': SHA,
            'sourceSha256': EXPECTED, 'outputSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'license': 'MIT', 'counts': {key: len(value) for key, value in collections.items()}}
(ROOT / 'src/data/adhkar-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(manifest)
