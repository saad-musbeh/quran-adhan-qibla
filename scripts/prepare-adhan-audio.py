#!/usr/bin/env python3
"""Rebuild four licensed alert recordings; see assets/adhan/PROVENANCE.md."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1] / 'assets/adhan'
NAMES = ['adhan', 'adhan_andrewler', 'adhan_makkah', 'adhan_madinah']
CLEAN = 'aformat=channel_layouts=mono,highpass=f=80,lowpass=f=8500,afftdn=nr=6:nf=-45:tn=1'
TARGET_LUFS = -18


def measure(path, filters):
    result = subprocess.run([
        'ffmpeg', '-nostdin', '-hide_banner', '-i', str(path), '-af',
        filters + f',loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11:print_format=json',
        '-f', 'null', '-',
    ], capture_output=True, text=True, check=True)
    return json.JSONDecoder().raw_decode(result.stderr[result.stderr.rindex('{'):])[0]


def convert(name, madinah_source):
    source = madinah_source if name == 'adhan_madinah' else ROOT / (name + '.ogg')
    files = []
    for short in [False, True]:
        preparation = CLEAN
        if short:
            preparation += ',atrim=duration=29,asetpts=PTS-STARTPTS,afade=t=out:st=28:d=1'
        measured = measure(source, preparation)
        filters = preparation + (
            f',loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11'
            f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
            f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
            f":offset={measured['target_offset']}:linear=true"
        )
        destination = ROOT / (name + '_clean' + ('_short.wav' if short else '.ogg'))
        command = [
            'ffmpeg', '-y', '-nostdin', '-v', 'error', '-i', str(source),
            '-af', filters, '-map_metadata', '-1', '-ac', '1',
            '-ar', '22050' if short else '48000',
            '-c:a', 'pcm_s16le' if short else 'libvorbis',
        ]
        if not short:
            command += ['-q:a', '4']
        subprocess.run(command + [str(destination)], check=True)
        probe = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_streams', '-show_format',
            '-of', 'json', str(destination),
        ]))
        stats = measure(destination, 'anull')
        files.append({
            'integratedLufs': float(stats['input_i']),
            'truePeakDbtp': float(stats['input_tp']),
            'file': destination.name,
            'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
            'bytes': destination.stat().st_size,
            'duration': float(probe['format']['duration']),
            'codec': probe['streams'][0]['codec_name'],
            'channels': probe['streams'][0]['channels'],
            'sampleRate': int(probe['streams'][0]['sample_rate']),
            'filter': filters,
        })
    return {
        'source': source.name,
        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'targetLufs': TARGET_LUFS,
        'files': files,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--madinah-source', type=Path, required=True)
    options = parser.parse_args()
    if hashlib.sha1(options.madinah_source.read_bytes()).hexdigest() != '4aa432b9e44804e7d72af4429bd743aa5fa9e3a4':
        parser.error('Madinah source does not match the documented Commons original')
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        records = list(pool.map(lambda name: convert(name, options.madinah_source), NAMES))
    (ROOT / 'clean-audio-manifest.json').write_text(json.dumps({
        'version': 1, 'recordings': records,
    }, indent=2) + '\n')
    print('Prepared four full recordings and four separately normalized 29-second iOS excerpts.')


if __name__ == '__main__':
    main()
