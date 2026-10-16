# Quran audio

In 0.6.0, playback stops at the current surah's end by default. Choose Next surah or Repeat surah in the reader's player to change that saved behavior. A selected ayah range takes precedence. Android's native Media3 player now prepares up to ten seconds of the next media source ahead of a transition; this applies to downloaded and streamed files. Source recordings and natural pauses are unchanged. Physical-device listening remains necessary to verify the reported gap across Android models.

# Quran recitation audio

Playback is implemented in `src/use-quran-audio.ts` with Expo Audio. Audio files are not bundled with the app. Each ayah is streamed from the corresponding official EveryAyah directory and is downloaded to the app-private document directory only when a user explicitly requests an offline surah copy. The files are not exported, shared, or included in app releases.

The twenty selectable Hafs reciters and their source directories are defined in `src/data/reciters.ts`, with Al-Husary as the initial default. The source URLs use EveryAyah’s six-digit ayah filename scheme (three-digit surah + three-digit ayah), followed by `.mp3`; for example `001001.mp3`. Voice metadata comes from [EveryAyah’s catalogue](https://everyayah.com/data/recitations.js), with recordings hosted at [everyayah.com/data](https://everyayah.com/data/).

EveryAyah's directory and index pages identify the reciter and bitrate but do not state a reuse license for the individual recordings. Therefore this app does not claim a redistribution license, bundle the recordings, mirror them, or publish them as app assets. It streams from the source and saves user-requested copies only in that user's private app storage for offline playback. Availability, bitrate, network access, and the source's terms may change; playback and downloads can fail if a source file is missing or the host is unavailable. Users should consult EveryAyah and the rights holder for any redistribution or public reuse.

The hook supports selecting a reciter, playback speeds 0.75×–2× with pitch correction, seek ± seconds, previous/next ayah, automatic ayah advance, a looping single ayah or same-surah range, and Android/iOS background and lock-screen playback. Long-press **Start loop here** starts from that ayah through the end of its surah immediately. The user can tap an ending ayah on the page to open a range editor seeded with that endpoint. **Choose ayahs on the page** in the range sheet lets the user tap the start and end ayahs directly; an empty ending field means the final ayah of the selected surah. The range remains within one surah.

Playback uses the existing native audio bridge and playlist queues, with ExoPlayer on Android and AVQueuePlayer on iOS. A chosen range is queued as a whole and uses native loop-all playback. Normal playback queues the remainder of the current surah and the next surah, appends the following surah before the queue ends, and trims consumed items. The normal queue keeps the current and next surah; during a refill it briefly holds a third surah before removing consumed items. Range loops contain at most 286 source ayahs, with a second prepared cycle on iOS. Native queue transitions avoid reloading each ayah from JavaScript. Background and lock-screen controls use the same platform player session and queue. The iOS integration pins Expo Audio 57.0.5 and uses a postinstall patch to remove consumed queue items without seeking the current item; loop copies are prequeued so the queue does not need to rebuild at the loop boundary.

This queue design avoids per-ayah JavaScript reloads, but it does not promise an absolutely gapless recording. Natural pauses in the source recitations remain, and network buffering can interrupt playback when audio is not cached. The app does not edit silence or crossfade recordings.

Surah downloads are sequential, with progress, cancellation, completed-ayah preservation, and retry that skips already downloaded ayahs. Each ayah request has a 60-second deadline; a timed-out request cancels the native transfer, removes its partial file, and reports a retryable download error. The app only accepts HTTP 200 responses with an `audio/mpeg` or `application/octet-stream` content type and a nonempty downloaded file. A surah is marked complete only after every ayah file has succeeded; partial files are ignored and removed before retry. Reciter, speed, repeat range, and per-reciter completed-download manifests are stored locally. Downloaded files are scoped by reciter, so changing reciters cannot mistake one reciter's local files for another's. Network state is read from Expo Network and does not trigger a network request during app startup.

Expo app configuration must enable `expo-audio` background playback (`enableBackgroundPlayback: true`); lock-screen playback also requires the audio mode to use `interruptionMode: 'doNotMix'`. The Expo Audio setup and API are documented in [Expo SDK 57 Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/).

## 0.3.6 player and voices

The player presents previous ayah, replay the current ayah, play/pause, next ayah and stop, in reading order for the selected UI direction. Replay restarts the current recording. The reciter field opens a ten-voice selector directly in the player; switching retains the selected ayah and the playing/paused state. Offline audio indexes remain separate for each reciter, including the existing three reciters.

The EveryAyah `recitations.js` catalogue and the first (`001001.mp3`) and last (`114006.mp3`) ayah URLs were checked for all ten voices on 12 October 2026: Alafasy, Husary, Sudais, Abdul Basit, Minshawi, Shuraym, Maher Al-Muaiqly, Ahmed Al-Ajamy, Ali Al-Hudhaify, and Abdullah Basfar. All sample URLs returned HTTP 200. These endpoint checks do not certify every recording. No MP3s are bundled or republished as release assets.


## 0.4.0 voices and recovery

Ten more distinct Hafs voices bring the catalogue to twenty. Al-Husary is the initial default; valid saved reciter choices are retained. The other additions are Fares Abbad, Yasser Ad-Dossary, Nasser Al-Qatami, Muhsin Al-Qasim, Salah Al-Budair, Hani Ar-Rifai, Muhammad Jibreel, Ali Jaber and Abu Bakr Ash-Shatri. Settings and the player support searching by Arabic or English name.

The primary EveryAyah catalogue, each new directory's coverage of all 6,236 canonical filenames, and first/last ayah HTTP responses were checked on 12 October 2026. The checked metadata is in `assets/quran/reciter-verification-2026-10-12.json`. This verifies source listing/endpoint availability, not the decoding or contents of every recording. No MP3 is bundled or published. Simulator test downloads are placed only in that simulator's private document directory and excluded from CI artifacts.

Native playback failures include the current recording URI/time so retries resume the failed ayah, independent from download failures. A network reconnection gets one recovery attempt while playback is still requested. Explicit pause/stop, including supported system transport commands, cancels recovery. The download manager measures saved final ayah files across voices, identifies partial surahs, and supports continuation and confirmed removal. Selecting a download voice does not change the current playback voice.

## 0.4.1 full Quran downloads

Settings is now one page. **Manage downloads → Recitations → Download whole Quran** starts one sequential job across all 114 surahs for the selected download voice. A single job lock spans chapter boundaries, so another download or audio removal cannot overlap it. The job keeps its original voice even if playback/download selections change. Total progress counts processed ayahs; current-surah progress and completed surahs are also shown.

Cached nonempty final ayah files are reused. Cancel/failure retains completed files and removes the active partial; retries of a full-Quran job cover the full remaining corpus, rather than stopping after its failed surah. Per-job partial filenames and progress guards isolate late callbacks. Keep the app open; completion after an app kill or automatic background restart is not implemented. Press the full-download button again after reopening to continue from saved files. No recording is added to the repo or release assets.

Playback speed and loop editing remain in the player/reader. Settings uses a compact expandable reciter chooser rather than showing all voices and duplicate player controls at once.
