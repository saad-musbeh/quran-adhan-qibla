#!/usr/bin/env python3
"""Build private-download tafsir assets from a pinned, attributable data mirror.

Book text must not be committed to the app source tree. The cache and output
directories are explicit arguments. Generated files keep the original MIT
notice, publisher permissions, source identity, and per-chapter hashes.
"""
import argparse
import concurrent.futures
import gzip
import hashlib
import html
import json
from pathlib import Path
import re
from html.parser import HTMLParser
from urllib.request import Request, urlopen

COMMIT = '9ae590abdaaa38462f4f91cc141903aa6f72cc23'
REPO = 'https://github.com/spa5k/tafsir_api'
RAW = f'https://raw.githubusercontent.com/spa5k/tafsir_api/{COMMIT}'
BOOKS = [
    dict(id='qurtubi', slug='ar-tafseer-al-qurtubi', bookId=23, language='ar',
         title='الجامع لأحكام القرآن — تفسير القرطبي',
         publisher='أبو عبد الله محمد بن أحمد الأنصاري القرطبي',
         sourceUrl='https://qul.tarteel.ai/resources/tafsir/23',
         publicationSource=None, firstPublicationGregorian=None,
         permission='Classical tafsir by al-Qurtubi; digital mirror published under MIT license at spa5k/tafsir_api. QUL identifies the original resource as Tafseer Al Qurtubi.'),
    dict(id='tazkirul', slug='tazkirul-quran-en', bookId=42, language='en',
         title='Tazkirul Quran — Quran Commentary',
         publisher='Maulana Wahiduddin Khan · Farida Khanam · Goodword Books / CPS',
         sourceUrl='https://cpsglobal.org',
         publicationSource='https://cpsglobal.org/sites/default/files/2025-01/Quran-Commentary.pdf',
         firstPublicationGregorian=2011,
         permission='Publisher states translation and commentary are copyright free. First published by Goodword Books 2011, reprinted 2024. Digital mirror published under MIT license at spa5k/tafsir_api.'),
]

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('p', 'div', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.parts.append('\n')

    def handle_data(self, data):
        self.parts.append(data)

def plain_text(text):
    if not re.search(r'</?(?:p|div|span|b|strong|i|em|br|h[1-6]|sup|ul|ol|li)\b', text, re.I):
        return html.unescape(text)
    parser = PlainText()
    parser.feed(text)
    parser.close()
    return ''.join(parser.parts)

def canonical(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def fetch(url):
    request = Request(url, headers={'User-Agent': 'QuranAdhanQibla/0.4.3 SourceImport'})
    with urlopen(request, timeout=60) as response:
        return response.read()

def build(book, cache, output, counts, license_text):
    folder = cache / book['slug']
    if not folder.is_dir():
        raise ValueError(f'Missing source directory: {folder}')
    manifest = [dict(filename=f'{s}.json', sha256=sha256((folder / f'{s}.json').read_bytes()))
                for s in range(1, 115)]
    manifest.sort(key=lambda row: row['filename'])
    manifest_bytes = canonical(manifest)
    manifest_path = output / f"tafsir-{book['id']}-original-manifest.json"
    manifest_path.write_bytes(manifest_bytes)
    source_url = f"{REPO}/tree/{COMMIT}/tafsir/{book['slug']}"
    texts, indexes, ayahs = [], {}, []
    converted = 0
    for s in range(1, 115):
        rows = json.loads((folder / f'{s}.json').read_bytes())
        if not isinstance(rows, list) or len(rows) != counts[s - 1]:
            raise ValueError(f"Invalid coverage for {book['slug']} chapter {s}")
        for number, row in enumerate(rows, 1):
            if row.get('surah') != s or row.get('ayah') != number or not isinstance(row.get('text'), str) or not row['text'].strip():
                raise ValueError(f"Invalid source row {book['slug']} {s}:{number}")
            text = plain_text(row['text'])
            converted += text != row['text']
            if text not in indexes:
                indexes[text] = len(texts)
                texts.append(text)
            ayahs.append(dict(surah=s, ayah=number, content=[dict(textIndex=indexes[text])]))
    payload = dict(schema='tafsir-text-v1',
        license=dict(source=book['sourceUrl'], version=COMMIT, permission=book['permission'],
            mirrorLicense=f'{REPO}/blob/{COMMIT}/LICENSE', mirrorLicenseText=license_text,
            publicationSource=book['publicationSource']),
        book=dict(id=book['bookId'], language=dict(code=book['language']), title=book['title'], publisher=book['publisher']),
        source=dict(url=source_url, sha256=sha256(manifest_bytes), version=COMMIT, manifestFile=manifest_path.name),
        texts=texts, ayahs=ayahs)
    raw = canonical(payload)
    data = gzip.compress(raw, compresslevel=9, mtime=0)
    path = output / f"tafsir-{book['id']}.json.gz"
    path.write_bytes(data)
    return dict(id=book['id'], title=book['title'], publisher=book['publisher'], language=book['language'],
        sourceName='QUL / spa5k', sourceUrl=book['sourceUrl'], originalUrl=source_url,
        originalSha256=sha256(manifest_bytes), sourceVersion=COMMIT, bookId=book['bookId'],
        rows=len(ayahs), texts=len(texts), bytes=len(data), uncompressedBytes=len(raw), sha256=sha256(data),
        path=str(path), manifestPath=str(manifest_path), convertedHtmlTexts=converted,
        firstPublicationHijri=None, publicationSource=book['publicationSource'],
        firstPublicationGregorian=book['firstPublicationGregorian'], permission=book['permission'])

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--quran-json', type=Path, required=True)
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    notice = args.output_dir / 'LICENSE-spa5k-tafsir-api.txt'
    if args.download:
        notice.write_bytes(fetch(f'{RAW}/LICENSE'))
        for book in BOOKS:
            folder = args.cache_dir / book['slug']
            folder.mkdir(parents=True, exist_ok=True)
            def chapter(number):
                (folder / f'{number}.json').write_bytes(fetch(f"{RAW}/tafsir/{book['slug']}/{number}.json"))
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as workers:
                list(workers.map(chapter, range(1, 115)))
    license_text = notice.read_text()
    counts = [s['verseCount'] for s in json.loads(args.quran_json.read_bytes())['surahs']]
    metadata = [build(book, args.cache_dir, args.output_dir, counts, license_text) for book in BOOKS]
    (args.output_dir / 'spa5k-tafsir-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
    for book in metadata:
        print(book['id'], book['rows'], book['bytes'], book['sha256'])

if __name__ == '__main__':
    main()
