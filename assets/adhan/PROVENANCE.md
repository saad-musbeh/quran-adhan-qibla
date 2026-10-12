# Android Adhan sound

`adhan.ogg` is the unmodified “Beautiful adhan” recording by Adam-synagda.

- Source and license: https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg
- Download: https://upload.wikimedia.org/wikipedia/commons/b/b0/Beautiful_adhan.ogg
- Author's own work, dated 29 April 2022; uploaded 1 May 2022.
- License: CC0 1.0 Universal, public-domain dedication.
- SHA-256: `35fe06b08fe80505c550c33fed8a783fa9901ddc81ac884958b4be048f5b2a79`
- 1,229,032 bytes; Vorbis, 44.1 kHz, stereo; duration 154.018 seconds.

Expo copies this recording into Android raw resources. It is a notification-channel sound: Android controls its playback, notification volume, DND policy, and interruptions. The app does not promise that every device plays the complete recording. It is included offline; Quran recitation downloads remain separate.

## iOS alert excerpt

`adhan-short.wav` derives from the same CC0 recording: the first 29 seconds,
with a one-second fade at the end, converted to mono 22,050 Hz signed 16-bit PCM.
It is an explicitly labelled short notification excerpt, not the full Adhan.
The original OGG remains unchanged. The conversion command was:

```sh
ffmpeg -i adhan.ogg -t 29 -af 'afade=t=out:st=28:d=1' -ar 22050 -ac 1 -c:a pcm_s16le adhan-short.wav
```

Apple's [custom notification sound requirements](https://developer.apple.com/documentation/usernotifications/unnotificationsound) require supported audio formats and a duration below 30 seconds. iOS sound permission, silent mode and Focus remain under system control.
