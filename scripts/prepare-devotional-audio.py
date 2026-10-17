#!/usr/bin/env python3
"""Prepare licensed short Adhan excerpts and local reminder sounds, without paid services."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/adhan'
MALMO_SHA = 'a3224cbf6707b0b2fe51d4f70e22d113c4693d3812f1b1b6dc27985193d477f9'
AAQIB_SHA = 'a222dab72cec6fce0483ec445a1d6c4c3a450bfd46cdbfc72d19c257b2759e4d'
AAQIB_URL = 'https://raw.githubusercontent.com/saad-musbeh/quran-adhan-qibla/v0.5.2/assets/adhan/adhan_aaqib.ogg'
MALMO_URL = 'https://raw.githubusercontent.com/saad-musbeh/quran-adhan-qibla/v0.5.2/assets/adhan/adhan_fajr_malmo.ogg'

def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def clip(source, start, duration, output):
    filters = f'highpass=f=80,lowpass=f=8500,afftdn=nr=12:nf=-45:tn=1,afade=t=in:d=0.02,afade=t=out:st={duration-0.08}:d=0.08'
    measure = run('ffmpeg','-hide_banner','-ss',str(start),'-t',str(duration),'-i',str(source),'-ac','1','-af',filters+',loudnorm=I=-18:TP=-2:LRA=7:print_format=json','-f','null','-')
    stats, _ = json.JSONDecoder().raw_decode(measure.stderr[measure.stderr.rfind('{'):])
    norm = ',loudnorm=I=-18:TP=-2:LRA=7:' + ':'.join(f'{key}={stats[value]}' for key,value in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')]) + ':linear=true'
    run('ffmpeg','-y','-ss',str(start),'-t',str(duration),'-i',str(source),'-ac','1','-ar','48000','-af',filters+norm,'-c:a','pcm_s16le',str(output))

def outputs(source, stem):
    paths=[]
    for extension,args in [('ogg',['-ar','48000','-c:a','libvorbis','-q:a','4']),('wav',['-ar','22050','-c:a','pcm_s16le'])]:
        path=ASSETS/f'{stem}.{extension}'
        run('ffmpeg','-y','-i',str(source),'-map_metadata','-1','-ac','1',*args,str(path))
        info=json.loads(run('ffprobe','-v','error','-show_format','-of','json',str(path)).stdout)
        duration=float(info['format']['duration'])
        if extension=='wav' and duration>=30:raise RuntimeError('iOS sounds must remain shorter than 30 seconds')
        paths.append({'file':path.name,'sha256':digest(path),'bytes':path.stat().st_size,'duration':duration})
    return paths

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--fajr-source',type=Path);parser.add_argument('--takbir-source',type=Path);args=parser.parse_args()
    with tempfile.TemporaryDirectory() as directory:
        tmp=Path(directory)
        source=args.fajr_source or tmp/'malmo.ogg'
        if not args.fajr_source:urllib.request.urlretrieve(MALMO_URL,source)
        if digest(source)!=MALMO_SHA:raise RuntimeError('Fajr source checksum does not match the licensed 0.5.2 asset')
        takbir=args.takbir_source or tmp/'aaqib.ogg'
        if not args.takbir_source:urllib.request.urlretrieve(AAQIB_URL,takbir)
        if digest(takbir)!=AAQIB_SHA:raise RuntimeError('Takbir source checksum mismatch')
        # Retain complete recorded phrases, with small margins outside their voiced boundaries.
        clip(takbir,0.4,10.7,tmp/'takbir.wav')
        clip(source,188.1,8.1,tmp/'fajr.wav')
        run('ffmpeg','-y','-i',str(tmp/'takbir.wav'),'-i',str(tmp/'fajr.wav'),'-filter_complex','[0:a]apad=pad_dur=0.2[a];[a][1:a]concat=n=2:v=0:a=1','-c:a','pcm_s16le',str(tmp/'short-fajr.wav'))
        files=outputs(tmp/'takbir.wav','adhan_brief')+outputs(tmp/'short-fajr.wav','adhan_brief_fajr')
        run('ffmpeg','-y','-f','lavfi','-i','sine=frequency=880:duration=0.3','-f','lavfi','-i','sine=frequency=1100:duration=0.3','-filter_complex','[0:a]afade=t=out:st=0.12:d=0.18,apad=pad_dur=0.08[a];[1:a]afade=t=out:st=0.1:d=0.2[b];[a][b]concat=n=2:v=0:a=1,volume=0.5','-ar','22050','-ac','1',str(tmp/'chime.wav'))
        files+=outputs(tmp/'chime.wav','reminder_chime')
        manifest={'sources':[{'file':'v0.5.2/adhan_aaqib.ogg','sha256':AAQIB_SHA,'rangeSeconds':[0.4,11.1],'credit':'Atcovi / Aaqib Azeez','license':'CC BY-SA 4.0','url':'https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3'},{'file':'v0.5.2/adhan_fajr_malmo.ogg','sha256':MALMO_SHA,'rangeSeconds':[188.1,196.2],'credit':'Islamic Center Malmö / Besim Azemi','license':'CC BY 3.0','url':'https://commons.wikimedia.org/wiki/File:Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm'}],'adaptationLicense':'CC BY-SA 4.0 for Short Adhan and Fajr; generated chime dedicated to CC0 1.0 by this project; recorded Salawat clips have separate provenance','processing':'Excerpt, mono, high/low-pass, noise reduction, boundary fades, matched loudness; Fajr joins two sourced voices with 0.2 seconds between excerpts. No pitch or speed changes.','files':files}
        (ASSETS/'devotional-audio-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(files,indent=2))

if __name__=='__main__':main()
