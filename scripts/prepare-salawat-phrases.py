#!/usr/bin/env python3
"""Extract recorded reminder phrases from the user's supplied 134122.mp4 reference.

Source is not bundled. No public redistribution licence was supplied; see the manifest.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/adhan'
REFERENCE_SHA256 = '4ccf91decd51a7608439b491e5f412e51e3903881f9a4f900011438434df2493'
PHRASES = [
    ('rasul', 'صلِّ على رسول الله', 19.13, 21.15),
    ('sallallahu', 'صلى الله عليه وسلم', 11.03, 13.24),
    ('prophet', 'صلِّ على النبي', 8.52, 10.04),
    ('muhammad', 'اللهم صلِّ على محمد', 13.95, 16.28),
    ('english', 'Peace be upon him', 17.03, 18.41),
]

def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reference', type=Path, required=True)
    args = parser.parse_args()
    digest = hashlib.sha256(args.reference.read_bytes()).hexdigest()
    if digest != REFERENCE_SHA256:
        raise RuntimeError('Reference video checksum does not match the supplied 134122.mp4')
    files = []
    with tempfile.TemporaryDirectory() as directory:
        for phrase, text, start, end in PHRASES:
            source = Path(directory) / f'{phrase}.wav'
            duration = end - start
            filters = f'aformat=channel_layouts=mono,highpass=f=65,afade=t=in:d=0.012,afade=t=out:st={duration-0.04}:d=0.04'
            measure = run('ffmpeg', '-hide_banner', '-ss', str(start), '-t', str(duration), '-i', str(args.reference), '-vn', '-ac', '1', '-af', filters + ',loudnorm=I=-18:TP=-2:LRA=7:print_format=json', '-f', 'null', '-')
            stats, _ = json.JSONDecoder().raw_decode(measure.stderr[measure.stderr.rfind('{'):])
            norm = ',loudnorm=I=-18:TP=-2:LRA=7:' + ':'.join(f'{key}={stats[value]}' for key, value in [('measured_I', 'input_i'), ('measured_TP', 'input_tp'), ('measured_LRA', 'input_lra'), ('measured_thresh', 'input_thresh'), ('offset', 'target_offset')]) + ':linear=true'
            filters += norm
            run('ffmpeg', '-y', '-ss', str(start), '-t', str(duration), '-i', str(args.reference), '-vn', '-map_metadata', '-1', '-af', filters, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', str(source))
            stem = f'reminder_salawat_{phrase}'
            for extension, encoding in [('ogg', ['-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5']), ('wav', ['-ar', '44100', '-c:a', 'pcm_s16le'])]:
                output = ASSETS / f'{stem}.{extension}'
                run('ffmpeg', '-y', '-i', str(source), '-map_metadata', '-1', '-ac', '1', *encoding, str(output))
                info = json.loads(run('ffprobe', '-v', 'error', '-show_format', '-of', 'json', str(output)).stdout)
                duration = float(info['format']['duration'])
                if duration >= 30:
                    raise RuntimeError('Notification sounds must be shorter than 30 seconds')
                files.append({'file': output.name, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size, 'duration': duration})
    manifest = {'source': {'file': '134122.mp4', 'sha256': digest, 'provenance': 'User-provided reference video, 16 October 2026', 'license': 'No public redistribution licence supplied. User requested these reference sounds for the app; do not describe these recordings as CC0 or covered by the code MIT licence.'}, 'phrases': [{'id': phrase, 'text': text, 'rangeSeconds': [start, end]} for phrase, text, start, end in PHRASES], 'processing': 'Complete speech excerpts, mono at source sample rate, 65 Hz high-pass, short boundary fades and two-pass loudness matching (-18 LUFS, -2 dBTP ceiling). No synthesis, pitch changes or speed changes.', 'files': files}
    (ASSETS / 'salawat-phrases-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    config_path = ROOT / 'app.json'
    config = json.loads(config_path.read_text())
    plugin = next(entry for entry in config['expo']['plugins'] if isinstance(entry, list) and entry[0] == './plugins/withPlatformNotificationSounds.cjs')
    plugin[1]['sounds'] = [entry for entry in plugin[1]['sounds'] if 'reminder_salawat' not in entry]
    plugin[1]['sounds'] = list(dict.fromkeys(plugin[1]['sounds'] + [f"./assets/adhan/{entry['file']}" for entry in files]))
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
