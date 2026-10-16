# 0.6.0 short Adhan and reminder sounds

**Short Adhan** is the fresh default. The four existing full voices and their saved IDs remain available. Preferred Nayef Saleh Faydah / Farooq Hadrawi audition recordings are pending verified redistribution permission and are not bundled. The user approved licensed temporary sources for this release.

- Opening: the released 0.5.2 `adhan_aaqib.ogg`, SHA-256 `a222dab72cec6fce0483ec445a1d6c4c3a450bfd46cdbfc72d19c257b2759e4d`, seconds **0.4–11.1**. Source: [The Adhan — Aaqib Azeez](https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3), recorded/uploaded by **Atcovi**, CC BY-SA 4.0. The complete opening takbirs are retained, with margins outside the detected speech boundaries.
- Fajr addition: the released 0.5.2 `adhan_fajr_malmo.ogg`, SHA-256 `a3224cbf6707b0b2fe51d4f70e22d113c4693d3812f1b1b6dc27985193d477f9`, seconds **188.1–196.2**. Source: [Eid al-Fitr Fajr azan at Malmö Mosque](https://commons.wikimedia.org/wiki/File:Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm), **Islamic Center Malmö / Besim Azemi**, CC BY 3.0. The source identifies this as a Fajr recording.

The regular alert is **10.7 seconds**. The Fajr alert appends the complete recorded “الصلاة خير من النوم” phrase after 0.2 seconds of separation, for **19 seconds** total. These temporary excerpts join two credited voices for Fajr. The adaptations are distributed under **CC BY-SA 4.0**, with both source attributions retained. Neither licensor nor performer endorses this app.

Preparation applies mono mixing, high/low-pass filtering, noise reduction, short fades outside speech, and matched −18 LUFS targets. Words are sourced recordings; pitch and playback speed are unchanged. A local ASR check of the assembled Fajr alert recovered “الله أكبر الله أكبر الصلاة خير من النوم”; this is a crop sanity check, not a claim of human or physical-phone listening verification.

`reminder_salawat_rasul` and its four phrase variants now use **recorded speech from the user-provided `134122.mp4` reference** (16 October 2026). They replace the former synthetic eSpeak voice. The reference provides four Arabic phrases and “Peace be upon him”. `salawat-phrases-manifest.json` records the original video's SHA-256, complete excerpt ranges, output hashes and durations. Processing retains the recorded voice, speed and pitch: mono at the source 44,100 Hz sample rate, 65 Hz high-pass, short boundary fades and −18 LUFS / −2 dBTP loudness matching. The input is a compressed screen recording, so this does not recover studio quality.

The user supplied these recordings for this change; **no public redistribution licence was supplied**. They are not claimed as CC0 or covered by the code's MIT licence. Keep this provenance distinct from the licensed Adhan recordings and generated chime.

`reminder_chime` remains a project-generated two-note tone dedicated to **CC0 1.0**. `devotional-audio-manifest.json` records the short Adhan/chime output hashes, durations and source ranges. Android receives OGG files; iOS receives mono 16-bit PCM WAV files below 30 seconds. Reproduce Adhan/chime with `python3 scripts/prepare-devotional-audio.py` (FFmpeg with Vorbis required). Reproduce the recorded phrases with `python3 scripts/prepare-salawat-phrases.py --reference /path/to/134122.mp4`. The reference video is not included in the repository. OGG container serials can change between runs.

# Retained full-voice sources — 0.5.3


The app exposes exactly **Makkah** (the 0.5.3 default), **Al-Madinah**, **Andrewler**, and **Original**. Aaqib, Shalqar and Malmö Fajr were removed; saved selections migrate to Makkah without changing each prayer’s enabled/muted setting. Existing Original/Andrewler/Makkah selections remain selected.

The current native sound list is in `app.json`; each voice packages one `*_clean.ogg` on Android and one `*_clean_short.wav` on iOS. Original OGG inputs retained here are source fixtures, not additional packaged sounds. The exact source and output SHA-256 hashes, processing filters and measured audio statistics are in [clean-audio-manifest.json](clean-audio-manifest.json).

## Al-Madinah source

- Recording: “33937 ejaz215 call-to-prayer-from-the-prophet-s-mo.ogg”, credited to **ejaz215**; Commons describes it as the call to prayer from the Prophet’s Mosque. No independently verified muezzin name is claimed.
- [Commons description / CC BY 3.0](https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg), checked 15 October 2026.
- [Original Freesound source](https://freesound.org/people/ejaz215/sounds/33937/) (original site unavailable during verification; Commons retains the source attribution and licence).
- [Exact original download](https://upload.wikimedia.org/wikipedia/commons/7/7c/33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg), 2,974,689 bytes, 186.552698 seconds.
- Commons SHA-1 matched the download: `4aa432b9e44804e7d72af4429bd743aa5fa9e3a4`.
- Source SHA-256: `4d0fabe0e0ef52186646a256220f74a972ba698ac269165fed5d52de3202d656`.
- The cleaned full recording and excerpt retain [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), with these processing changes attributed to this project. No performer or licensor endorsement is implied.

## Cleaning and notification preparation

All four voices are downmixed to mono **before** measurement, high-pass filtered at 80 Hz and low-pass filtered at 8.5 kHz, with mild FFmpeg `afftdn` noise reduction (`nr=6:nf=-45:tn=1`). Two-pass loudness normalization targets −18 LUFS and a −2 dBTP ceiling. Android retains the complete source timeline, words, pitch and speed, encoded as 48 kHz Vorbis. iOS separately normalizes the first 29 seconds, with a one-second ending fade, as mono 22,050 Hz 16-bit PCM. This is sound cleanup of sourced recordings, not a newly recorded or synthesized voice. Residual ambience can remain.

Reproduce from the retained original OGG inputs and the verified Madinah download:

```sh
python3 scripts/prepare-adhan-audio.py --madinah-source /path/to/madinah-source.ogg
```

The script checks the Madinah input SHA-1 and writes a fresh manifest with output hashes. Vorbis container serial numbers may vary between encodes. Runtime Credits includes all four source/author/licence links and explains the cleanup/excerpt adaptation. Andrewler’s cleaned adaptations remain **CC BY-SA 4.0**, Makkah and Madinah retain **CC BY 3.0**, and Original remains **CC0**. Notification volume, Silent Mode, Focus and sound duration remain under system control. Technical decoding/measurement and source attribution were checked; physical-phone listening remains part of iOS testing.

# Historical input provenance

The following records describe the original 0.5.2 sound library and conversion inputs. Retired options and old excerpts listed below are not included in the 0.5.3 native sound configuration; retrieve those assets from `v0.5.2` if reproducing the older release.

# Adhan recording provenance

`adhan.ogg` is the unmodified “Beautiful adhan” recording by Adam-synagda.

- Source and license: https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg
- Download: https://upload.wikimedia.org/wikipedia/commons/b/b0/Beautiful_adhan.ogg
- Author's own work, dated 29 April 2022; uploaded 1 May 2022.
- License: CC0 1.0 Universal, public-domain dedication.
- SHA-256: `35fe06b08fe80505c550c33fed8a783fa9901ddc81ac884958b4be048f5b2a79`
- 1,229,032 bytes; Vorbis, 44.1 kHz, stereo; duration 154.018 seconds.

Expo copies this recording into Android raw resources. It is a notification-channel sound: Android controls its playback, notification volume, DND policy, and interruptions. The app does not promise that every device plays the complete recording. It is included offline; Quran recitation downloads remain separate.

## iOS alert excerpt

`adhan_short.wav` derives from the same CC0 recording: the first 29 seconds,
with a one-second fade at the end, converted to mono 22,050 Hz signed 16-bit PCM.
Its SHA-256 is `8af512873bb5380dc2564bfff7d113c2ce3367534d8fa9ce1569e4e88288d085`.
It is an explicitly labelled short notification excerpt, not the full Adhan.
The original OGG remains unchanged. The conversion command was:

```sh
ffmpeg -i adhan.ogg -t 29 -af 'afade=t=out:st=28:d=1' -ar 22050 -ac 1 -c:a pcm_s16le adhan_short.wav
```

Apple's [custom notification sound requirements](https://developer.apple.com/documentation/usernotifications/unnotificationsound) require supported audio formats and a duration below 30 seconds. iOS sound permission, silent mode and Focus remain under system control.

## Five additional recordings

Retrieved and checked against the Commons description pages on **13 October 2026**.
These are five separate recordings, not pitch/speed variants of the original voice.
Each source page explicitly identifies Adhan; the Malmö source specifically names
Besim Azemi and Fajr. Recorder/uploader credits do not establish the identities of
otherwise unnamed muezzins. The recordings are real field/voice recordings and may
include room or outdoor ambience.

The Android OGG files retain the complete source audio timeline, without clipping,
repeating, synthesizing words, or changing pitch or speed. Container/encoder timing
can differ from the source by a few milliseconds. Video is removed, audio is mixed
to mono, loudness is normalized, and audio is encoded as 48 kHz Vorbis. The iOS files
are **the first 29 seconds of those normalized recordings**, with a fade from
second 28 to 29, mono 22,050 Hz signed 16-bit PCM. An iOS excerpt is not a complete
Adhan and does not include the later Fajr-specific phrases.

The regular recordings target -18 LUFS; the Strong Fajr option targets -14 LUFS
with a -1.5 dBTP normalization ceiling. This gives the Fajr option stronger average
loudness without digital clipping. This does not override notification volume,
Silent Mode, Do Not Disturb/Focus, or the operating system's sound-duration behavior,
and does not guarantee waking someone. Physical-device playback remains to be
verified. Documentary source/type/license identification and technical decoding
were checked; this is not a claim of an independent human listening review.

The three CC BY-SA 4.0 audio adaptations and excerpts below are distributed under
**CC BY-SA 4.0**, including this project's audio-processing contribution. The two
CC BY 3.0 adaptations retain the source attribution and license notice. These
asset licenses are separate from the repository's MIT software license. No source
licensor or performer endorses this application.

| App option | Recording credit | Source and license | Source date |
| --- | --- | --- | --- |
| Aaqib Azeez | Atcovi | [Commons source](https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 23 December 2020; current version uploaded 11 December 2025 |
| Adhan · Andrewler recording | Andrewler | [Commons source](https://commons.wikimedia.org/wiki/File:Azan.ogg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 3 September 2022 |
| Shalqar Mosque | Esetok | [Commons source](https://commons.wikimedia.org/wiki/File:Adhan_in_Shalqar_mosque.webm) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 27 December 2014 |
| Makkah · 2013 | Seyfula Islam | [Commons source](https://commons.wikimedia.org/wiki/File:Adhan%2C_Great_Mosque_of_Mecca_-_Jan_21%2C_2013.webm) · [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 21 January 2013 |
| Besim Azemi · Strong Fajr | Islamic Center Malmö | [Commons source](https://commons.wikimedia.org/wiki/File:Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm) · [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 19 August 2012 |

Makkah's Commons page records a license review by MZaplotnik on 19 July 2018;
its original source is [Seyfula Islam's video](https://www.youtube.com/watch?v=KYi-PuOqVnA).
Malmö's Commons page records a YouTubeReviewBot license check on 12 February 2020;
its original source is [Islamic Center Malmö's video](https://www.youtube.com/watch?v=0IHfm4Y82xA).
This automated check confirms the license observed at that date, not a human
review of every possible underlying right.

### Downloaded originals

The original video/MP3 files are conversion inputs, not runtime bundle assets.
Original checksums refer to the exact full downloads; Commons-reported SHA-1
checksums for Andrewler, Shalqar, Makkah, and Malmö match the downloaded originals.

- `The Adhan - Muslim Call to Prayer - Aaqib Azeez.mp3`: [direct original download](https://upload.wikimedia.org/wikipedia/commons/7/7d/The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3), 1,448,294 bytes, 86.512676 seconds.
  SHA-256: `0faa59e2028bbb2f60a670b53ec89ffcf628f3c195b43fb41d9bdbc99000c1b3`.
  SHA-1: `971bced4b0bf6067358afc78cac6e9d219226c19`.
- `Azan.ogg`: [direct original download](https://upload.wikimedia.org/wikipedia/commons/8/86/Azan.ogg), 1,473,809 bytes, 183.484082 seconds.
  SHA-256: `2163ceafb8a05064a5ea5e1e0a7fac5fff958a21fcf830844d557d496b9b23c3`.
  SHA-1: `ada13592b01c12b0128af40035ed7a803e08b563`.
- `Adhan in Shalqar mosque.webm`: [direct original download](https://upload.wikimedia.org/wikipedia/commons/4/4f/Adhan_in_Shalqar_mosque.webm), 31,501,823 bytes, 155.349000 seconds.
  SHA-256: `0e711594149d8b5aef3bfa759b6861fffddb201053febae4d6f20df110f5421c`.
  SHA-1: `5d7301c0c142d8e5d8f281f4dd02846eaf05529b`.
- `Adhan, Great Mosque of Mecca - Jan 21, 2013.webm`: [direct original download](https://upload.wikimedia.org/wikipedia/commons/a/a7/Adhan%2C_Great_Mosque_of_Mecca_-_Jan_21%2C_2013.webm), 9,359,941 bytes, 197.078000 seconds.
  SHA-256: `f4acc1bcc6e7919fce60b21162a3c794952c562a6df7b6aa7971f80d191eb5f0`.
  SHA-1: `818becd553dde887095641bd1c86549db44060bc`.
- `Eid al-Fitr Fajr azan at Malmö Mosque - 19 August 2012.webm`: [direct original download](https://upload.wikimedia.org/wikipedia/commons/b/b1/Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm), 78,385,315 bytes, 247.561000 seconds.
  SHA-256: `899a3325aafb03e09381b3e40149e88d06b00b40ce2b1eeb09d63e594c9c1742`.
  SHA-1: `bc75d5cee271efb67f03d3f35474a9362fce103f`.

### Bundled output verification

All added output files decode successfully. PCM excerpts measure exactly 29 seconds.
`max_volume` is the decoded sample peak measured with FFmpeg `volumedetect`; all
are below 0 dBFS.

| File | Bytes | Duration (s) | Decoded peak (dBFS) |
| --- | ---: | ---: | ---: |
| `adhan_aaqib.ogg` | 766,450 | 86.512688 | -1.7 |
| `adhan_aaqib_short.wav` | 1,278,978 | 29.000000 | -2.6 |
| `adhan_andrewler.ogg` | 1,208,191 | 183.484083 | -7.9 |
| `adhan_andrewler_short.wav` | 1,278,978 | 29.000000 | -8.4 |
| `adhan_shalqar.ogg` | 1,363,079 | 155.369333 | -1.0 |
| `adhan_shalqar_short.wav` | 1,278,978 | 29.000000 | -1.5 |
| `adhan_makkah.ogg` | 1,392,800 | 197.086667 | -3.9 |
| `adhan_makkah_short.wav` | 1,278,978 | 29.000000 | -4.7 |
| `adhan_fajr_malmo.ogg` | 2,238,697 | 247.547938 | -1.1 |
| `adhan_fajr_malmo_short.wav` | 1,278,978 | 29.000000 | -1.5 |

Output SHA-256 checksums:

- `adhan_aaqib.ogg`: `a222dab72cec6fce0483ec445a1d6c4c3a450bfd46cdbfc72d19c257b2759e4d`
- `adhan_aaqib_short.wav`: `8a0cd65bdc1e2db54e948fee50de628ad723a06a2fca3418d566506b1c3cbc43`
- `adhan_andrewler.ogg`: `08f834ac7c18fbc2ab099bd1068f13b002d57eaad08dba9eccb7cff4eab4e2d7`
- `adhan_andrewler_short.wav`: `7fd6e1d6d9c9daee95fef0d10d7ab102b245887b5c43dc369745466bc5bd70b0`
- `adhan_shalqar.ogg`: `7d361d926fd6d6de105435c3fa123a7dac669d58786316ec32abdff8f7841b2a`
- `adhan_shalqar_short.wav`: `08400f74da7fd65140edf8b889be875e84cbc3be06916d779735df497dd1da27`
- `adhan_makkah.ogg`: `6e04779da460e4735da86ceaffb446340ad7c719748c8dcb2a6c10324a330a3c`
- `adhan_makkah_short.wav`: `850c69fca19feebea44d7630433ed0ba19c2d2b7e6d2c14b62a7fcd780b13e36`
- `adhan_fajr_malmo.ogg`: `a3224cbf6707b0b2fe51d4f70e22d113c4693d3812f1b1b6dc27985193d477f9`
- `adhan_fajr_malmo_short.wav`: `bed757a4afa8b4e72ad58835ff78a4c148c4816b3bf1d87870cd8055741b6ecb`

### Conversion commands

Converted on 13 October 2026 with FFmpeg 8.1.3 (`libvorbis`, PCM encoders).
The first pass is run on the source after mono mixing to obtain `loudnorm`
measurement fields. The measured values are fed into the second-pass filters
below. Use `-14` for `fajr_malmo` and `-18` for the other sources:

```sh
ffmpeg -i SOURCE -vn -ac 1 -af 'aformat=channel_layouts=mono,loudnorm=I=TARGET:TP=-1.5:LRA=11:print_format=json' -f null -
```

Exact second-pass filters used:

- `aaqib`: `aformat=channel_layouts=mono,loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=-13.62:measured_TP=2.87:measured_LRA=6.60:measured_thresh=-24.93:offset=-0.10:linear=true`
- `andrewler`: `aformat=channel_layouts=mono,loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=-9.12:measured_TP=0.74:measured_LRA=7.70:measured_thresh=-19.91:offset=0.40:linear=true`
- `shalqar`: `aformat=channel_layouts=mono,loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=-31.22:measured_TP=-2.48:measured_LRA=19.10:measured_thresh=-42.63:offset=0.47:linear=true`
- `makkah`: `aformat=channel_layouts=mono,loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=-13.93:measured_TP=0.03:measured_LRA=8.60:measured_thresh=-24.89:offset=0.14:linear=true`
- `fajr_malmo`: `aformat=channel_layouts=mono,loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=-13.95:measured_TP=0.15:measured_LRA=8.40:measured_thresh=-25.47:offset=-0.13:linear=true`

For each source, using its filter above and corresponding output stem:

```sh
ffmpeg -i SOURCE -map 0:a:0 -vn -ac 1 -af FILTER -ar 48000 -c:a pcm_s24le normalized.wav
ffmpeg -i normalized.wav -map_metadata -1 -c:a libvorbis -q:a 4 adhan_STEM.ogg
ffmpeg -i normalized.wav -t 29 -af 'afade=t=out:st=28:d=1' -ar 22050 -ac 1 -c:a pcm_s16le -map_metadata -1 adhan_STEM_short.wav
ffprobe -v error -show_format -show_streams -of json adhan_STEM.ogg
ffmpeg -i adhan_STEM.ogg -af volumedetect -f null -
```

Ogg stream serials and encoder versions may change checksums when repeating the
conversion; the checksums above identify the bundled outputs from this run.
