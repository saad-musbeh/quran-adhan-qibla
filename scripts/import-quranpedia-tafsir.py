#!/usr/bin/env python3
"""Build small, attributed offline editions from pinned Quranpedia source dumps.

Usage: python3 scripts/import-quranpedia-tafsir.py SOURCE.json INPUT_DIR OUTPUT_DIR
SOURCE.json lists original dump names/hashes/row counts (see docs/TAFSIR.md).
Inputs are downloaded separately; book text is never placed in this repository.
"""
import gzip
import functools
import hashlib
import html
import json
import pathlib
import re
import sys


@functools.lru_cache(maxsize=25000)
def plain_text(value):
    value = re.sub(r'<(script|style)\b[^>]*>[\s\S]*?</\1\s*>', '', value, flags=re.I)
    value = re.sub(r'<br\s*/?\s*>|</(?:p|div|li|h[1-6]|tr)>', '\n', value, flags=re.I)
    value = html.unescape(re.sub(r'<[^>]*>', '', value))
    value = re.sub(r'[ \t]+', ' ', value)
    value = re.sub(r'\n[ \t]+', '\n', value)
    return re.sub(r'\n{3,}', '\n\n', value).strip()


def main():
    metadata, inputs, output = map(pathlib.Path, sys.argv[1:])
    sources = json.loads(metadata.read_text())
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for source in sources:
        raw = (inputs / source['name']).read_bytes()
        if len(raw) != source['bytes'] or hashlib.sha256(raw).hexdigest() != source['sha256']:
            raise ValueError('Original dump checksum mismatch')
        dump = json.loads(gzip.decompress(raw))
        if dump['book']['id'] != source['book_id'] or dump['license']['version'] != source['source_version']:
            raise ValueError('Source identity/version mismatch')
        texts, indices, verses, seen = [], {}, [], set()
        for row in dump['ayahs']:
            key = row['surah'], row['ayah']
            if key in seen:
                raise ValueError('Duplicate ayah')
            seen.add(key)
            content = []
            for paragraph in row['content']:
                text = plain_text(paragraph['text'])
                if text not in indices:
                    indices[text] = len(texts)
                    texts.append(text)
                content.append({'textIndex': indices[text], **{k: paragraph[k] for k in ['part', 'page'] if k in paragraph}})
            verses.append({'surah': row['surah'], 'ayah': row['ayah'], 'content': content})
        if len(verses) != source['rows']:
            raise ValueError('Source coverage mismatch')
        edition = {'schema': 'quranpedia-text-v1', 'license': dump['license'], 'book': dump['book'],
                   'source': {'url': 'https://api.quranpedia.net/dumps/' + source['name'], 'sha256': source['sha256'], 'version': source['source_version']},
                   'texts': texts, 'ayahs': verses}
        encoded = json.dumps(edition, ensure_ascii=False, separators=(',', ':')).encode()
        packed = gzip.compress(encoded, mtime=0)
        filename = 'tafsir-' + str(source['book_id']) + '.json.gz'
        (output / filename).write_bytes(packed)
        result = {**source, 'asset': filename, 'asset_sha256': hashlib.sha256(packed).hexdigest(), 'asset_bytes': len(packed), 'asset_decoded_bytes': len(encoded)}
        results.append(result)
        print(source['book_id'], 'rows', len(verses), 'unique paragraphs', len(texts), 'unpacked bytes', len(encoded), flush=True)
    (output / 'sources.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
