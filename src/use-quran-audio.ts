import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlaylist, useAudioPlaylistStatus, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getSurah, getVerse, surahs } from './domain/quran';
import {
  audioCacheKey, isValidAudioDownloadResponse, nextVersePosition, previousPositionInRange, verseKey,
  type AudioRange as DomainAudioRange,
} from './domain/quran-audio';
import { findQuranQueuePosition, initialQuranQueue, nextQuranQueueChapter, type QuranQueuePosition } from './domain/quran-audio-queue';
import { summarizeAudioDownload, type AudioDownload } from './domain/audio-downloads';
import { quranAudioControls } from './quran-audio-controls';

import { DEFAULT_RECITER_ID, RECITERS, emptyReciterDownloads, type ReciterId } from './data/reciters';
export { RECITERS, type ReciterId } from './data/reciters';

export type AudioRange = DomainAudioRange;
export type QuranAudioController = {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  currentVerseKey: string | null;
  reciter: ReciterId;
  playbackRate: number;
  repeatRange: AudioRange | null;
  error: string | null;
  downloadError: string | null;
  downloadedSurahs: number[];
  isDownloading: number | null;
  downloadingReciter: ReciterId | null;
  savedAudio: AudioDownload[];
  refreshDownloads(): Promise<void>;
  removeSavedAudio(items: readonly AudioDownload[]): Promise<void>;
  downloadProgress: number;
  downloadScope: 'surah' | 'quran' | null;
  downloadOverallProgress: number;
  downloadCompletedSurahs: number;
  isCurrentSurahDownloaded: boolean;
  isOnline: boolean;
  playVerse(surah: number, verse: number): Promise<void>;
  playRange(surah: number, start: number, end: number): Promise<void>;
  togglePlayback(): Promise<void>;
  pause(): void;
  stop(): void;
  nextVerse(): Promise<void>;
  previousVerse(): Promise<void>;
  seekBy(seconds: number): void;
  replayVerse(): Promise<void>;
  setReciter(id: ReciterId): void;
  setPlaybackRate(rate: number): void;
  setRepeatRange(range: AudioRange | null): void;
  downloadSurah(surah: number, reciter?: ReciterId): Promise<void>;
  downloadQuran(reciter?: ReciterId): Promise<void>;
  cancelDownload(): void;
  deleteSurahDownload(surah: number): Promise<void>;
  retry(): Promise<void>;
  retryPlayback(): Promise<void>;
  retryDownload(): Promise<void>;
};

const PREFERENCES_KEY = 'quran-audio-preferences-v1';
const DOWNLOADS_KEY = 'quran-audio-downloads-v1';
const AUDIO_ROOT = `${FileSystem.documentDirectory ?? ''}quran-audio/`;
const reciterById = new Map(RECITERS.map((entry) => [entry.id, entry]));
const audioUri = (reciter: ReciterId, surah: number, verse: number) => {
  const reciterData = reciterById.get(reciter) ?? RECITERS[0];
  const filename = audioCacheKey(reciter, surah, verse).split('/').at(-1)!;
  return `https://everyayah.com/data/${reciterData.directory}/${filename}`;
};
const localUri = (reciter: ReciterId, surah: number, verse: number) => `${AUDIO_ROOT}${reciter}/${String(surah).padStart(3, '0')}/${audioCacheKey(reciter, surah, verse).split('/').at(-1)}`;
const surahUri = (reciter: ReciterId, surah: number) => `${AUDIO_ROOT}${reciter}/${String(surah).padStart(3, '0')}/`;
const DOWNLOAD_FILE_TIMEOUT_MS = 60_000;

function validAudioRange(value: unknown): value is AudioRange {
  if (!value || typeof value !== 'object') return false;
  const range = value as Partial<AudioRange>;
  const chapter = typeof range.surah === 'number' ? getSurah(range.surah) : undefined;
  return Boolean(chapter && Number.isInteger(range.start) && Number.isInteger(range.end)
    && (range.start ?? 0) >= 1 && (range.end ?? 0) >= (range.start ?? 0)
    && (range.end ?? Number.MAX_SAFE_INTEGER) <= chapter.verseCount);
}

function cleanDownloadedSurahs(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((number): number is number => typeof number === 'number' && Number.isInteger(number) && Boolean(getSurah(number))))].sort((a, b) => a - b);
}

async function cancelDownloadTask(task: FileSystem.DownloadResumable): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5_000);
    void task.cancelAsync().catch(() => undefined).finally(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

export type QuranAudioTiming = { currentTime: number; duration: number };

export function useQuranAudio(): QuranAudioController & QuranAudioTiming {
  const playlist = useAudioPlaylist({ sources: [], updateInterval: 250 });
  const playerStatus = useAudioPlaylistStatus(playlist);
  const [reciter, setReciterState] = useState<ReciterId>(DEFAULT_RECITER_ID);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeatRange, setRepeatRangeState] = useState<AudioRange | null>(null);
  const [current, setCurrent] = useState<{ surah: number; verse: number } | null>(null);
  const [status, setStatus] = useState<QuranAudioController['status']>('idle');
  const statusRef = useRef<QuranAudioController['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadsByReciter, setDownloadsByReciter] = useState<Record<ReciterId, number[]>>(emptyReciterDownloads);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [downloadingReciter, setDownloadingReciter] = useState<ReciterId | null>(null);
  const [savedAudio, setSavedAudio] = useState<AudioDownload[]>([]);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadScope, setDownloadScope] = useState<'surah' | 'quran' | null>(null);
  const [downloadOverallProgress, setDownloadOverallProgress] = useState(0);
  const [downloadCompletedSurahs, setDownloadCompletedSurahs] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const currentRef = useRef(current);
  const reciterRef = useRef(reciter);
  const repeatRef = useRef(repeatRange);
  const rateRef = useRef(playbackRate);
  const downloadTaskRef = useRef<FileSystem.DownloadResumable | null>(null);
  const temporaryDownloadRef = useRef<string | null>(null);
  const downloadCanceledRef = useRef(false);
  const failedDownloadRef = useRef<number | null>(null);
  const failedDownloadReciter = useRef<ReciterId | null>(null);
  const failedDownloadScope = useRef<'surah' | 'quran'>('surah');
  const generationRef = useRef(0);
  const mountedRef = useRef(false);
  const onlineRef = useRef(true);
  const downloadingRef = useRef(false);
  const downloadGenerationRef = useRef(0);
  const inventoryRevision = useRef(0);
  const queuePositionsRef = useRef<QuranQueuePosition[]>([]);
  const queueTitlesRef = useRef<string[]>([]);
  const queueLoadingRef = useRef(false);
  const refillForRef = useRef<string | null>(null);
  const attachedPlaylistRef = useRef(false);
  const wantsPlayback = useRef(false);
  const recoverOnConnection = useRef(false);
  const resumeTime = useRef(0);
  const timingRef = useRef(playerStatus);
  timingRef.current = playerStatus;
  const currentTimeRef = useRef(0);
  currentTimeRef.current = playerStatus.currentTime;
  const stopRequest = useRef(() => {});
  const playRequest = useRef<(position: QuranQueuePosition, autoplay?: boolean, resumeAt?: number) => Promise<void>>(async () => {});
  currentRef.current = current;
  statusRef.current = status;
  reciterRef.current = reciter;
  repeatRef.current = repeatRange;
  rateRef.current = playbackRate;

  const refreshOnline = useCallback(async (allowRecovery = false) => {
    try {
      const network = await getNetworkStateAsync();
      const reachable = network.isConnected !== false && network.isInternetReachable !== false;
      const reconnected = !onlineRef.current && reachable;
      onlineRef.current = reachable;
      if (mountedRef.current) setIsOnline(reachable);
      if (allowRecovery && reconnected && recoverOnConnection.current && wantsPlayback.current && currentRef.current) {
        recoverOnConnection.current = false;
        void playRequest.current(currentRef.current, true, resumeTime.current);
      }
      return reachable;
    } catch {
      return onlineRef.current;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      queueLoadingRef.current = false;
      quranAudioControls.detach();
      downloadCanceledRef.current = true;
      if (downloadTaskRef.current) void cancelDownloadTask(downloadTaskRef.current);
      downloadTaskRef.current = null;
    };
  }, []);

  useEffect(() => {
    void refreshOnline(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshOnline(true);
    });
    const networkSubscription = addNetworkStateListener((network) => {
      const reachable = network.isConnected !== false && network.isInternetReachable !== false;
      const reconnected = !onlineRef.current && reachable;
      onlineRef.current = reachable;
      if (mountedRef.current) setIsOnline(reachable);
      if (reconnected && recoverOnConnection.current && wantsPlayback.current && currentRef.current) {
        recoverOnConnection.current = false;
        void playRequest.current(currentRef.current, true, resumeTime.current);
      }
    });
    return () => {
      subscription.remove();
      networkSubscription.remove();
    };
  }, [refreshOnline]);

  useEffect(() => {
    void AsyncStorage.multiGet([PREFERENCES_KEY, DOWNLOADS_KEY]).then(([preferences, downloads]) => {
      try {
        if (preferences[1]) {
          const stored = JSON.parse(preferences[1]) as { reciter?: ReciterId; playbackRate?: number; repeatRange?: AudioRange | null };
          if (stored.reciter && reciterById.has(stored.reciter)) setReciterState(stored.reciter);
          if (stored.playbackRate && [0.75, 1, 1.25, 1.5, 2].includes(stored.playbackRate)) setPlaybackRateState(stored.playbackRate);
          if (stored.repeatRange === null) setRepeatRangeState(null);
          else if (validAudioRange(stored.repeatRange)) setRepeatRangeState(stored.repeatRange);
        }
        if (downloads[1]) {
          const saved = JSON.parse(downloads[1]) as unknown;
          if (Array.isArray(saved)) setDownloadsByReciter((state) => ({ ...state, alafasy: cleanDownloadedSurahs(saved) }));
          else if (saved && typeof saved === 'object') {
            const byReciter = saved as Record<string, unknown>;
            setDownloadsByReciter(Object.fromEntries(RECITERS.map(reciter => [reciter.id, cleanDownloadedSurahs(byReciter[reciter.id])])) as Record<ReciterId, number[]>);
          }
        }
      } catch {
        // Discard malformed local settings and continue with safe defaults.
      }
      if (mountedRef.current) setPreferencesLoaded(true);
    }).catch(() => { if (mountedRef.current) setPreferencesLoaded(true); });
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify({ reciter, playbackRate, repeatRange })).catch(() => undefined);
  }, [preferencesLoaded, reciter, playbackRate, repeatRange]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    void AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloadsByReciter)).catch(() => undefined);
  }, [preferencesLoaded, downloadsByReciter]);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => undefined);
  }, []);

  const titleFor = useCallback((position: QuranQueuePosition) => {
    return `${getSurah(position.surah)?.arabicName ?? `سورة ${position.surah}`} · ${position.verse}`;
  }, []);
  const updateNativeTitles = useCallback(() => {
    const current = currentRef.current;
    const index = current ? findQuranQueuePosition(queuePositionsRef.current, current) : 0;
    quranAudioControls.updateTitles(queueTitlesRef.current, reciterRef.current, Math.max(0, index));
  }, []);
  const resolveSources = useCallback(async (positions: readonly QuranQueuePosition[], activeReciter: ReciterId, generation: number) => {
    const sources: string[] = [];
    for (let offset = 0; offset < positions.length; offset += 8) {
      const batch = positions.slice(offset, offset + 8);
      const resolved = await Promise.all(batch.map(async position => {
        const local = localUri(activeReciter, position.surah, position.verse);
        const info = await FileSystem.getInfoAsync(local).catch(() => null);
        if (info?.exists && typeof info.size === 'number' && Number.isFinite(info.size) && info.size > 0) return local;
        if (info?.exists) void FileSystem.deleteAsync(local, { idempotent: true }).catch(() => undefined);
        return audioUri(activeReciter, position.surah, position.verse);
      }));
      if (generation !== generationRef.current || !mountedRef.current) return null;
      sources.push(...resolved);
    }
    return sources;
  }, []);

  const playPosition = useCallback(async (position: QuranQueuePosition, autoplay = true, resumeAt = 0) => {
    if (!getVerse(position.surah, position.verse)) return;
    const generation = ++generationRef.current;
    wantsPlayback.current = autoplay;
    resumeTime.current = resumeAt;
    recoverOnConnection.current = false;
    const activeReciter = reciterRef.current;
    const requestedLocal = localUri(activeReciter, position.surah, position.verse);
    currentRef.current = position;
    setCurrent(position);
    setError(null);
    setStatus('loading');
    queueLoadingRef.current = true;
    refillForRef.current = null;
    playlist.pause();
    playlist.loop = 'none';
    playlist.clear();
    queuePositionsRef.current = [];
    queueTitlesRef.current = [];
    quranAudioControls.detach();
    attachedPlaylistRef.current = false;
    try {
      const requestedInfo = await FileSystem.getInfoAsync(requestedLocal).catch(() => null);
      const requestedLocalAvailable = Boolean(requestedInfo?.exists && typeof requestedInfo.size === 'number' && Number.isFinite(requestedInfo.size) && requestedInfo.size > 0);
      if (!requestedLocalAvailable && !onlineRef.current) throw new Error('Audio is unavailable offline. Download this surah while connected to the internet.');

      const positions = initialQuranQueue(position, repeatRef.current);
      const sources = await resolveSources(positions, activeReciter, generation);
      if (!sources || generation !== generationRef.current || !mountedRef.current) return;
      if (requestedInfo?.exists && !requestedLocalAvailable) await FileSystem.deleteAsync(requestedLocal, { idempotent: true }).catch(() => undefined);
      playlist.playbackRate = rateRef.current;
      queuePositionsRef.current = positions;
      queueTitlesRef.current = positions.map(titleFor);
      for (const source of sources) playlist.add({ uri: source });
      playlist.loop = repeatRef.current ? 'all' : 'none';
      quranAudioControls.attach(playlist, queueTitlesRef.current, activeReciter);
      attachedPlaylistRef.current = quranAudioControls.available;
      const startIndex = findQuranQueuePosition(positions, position);
      if (startIndex >= 0) playlist.skipTo(startIndex);
      quranAudioControls.updatePlaybackRate(rateRef.current);
      quranAudioControls.updateMetadata(titleFor(position), activeReciter);
      if (resumeAt > 0) await playlist.seekTo(resumeAt);
      if (generation !== generationRef.current || !mountedRef.current) return;
      queueLoadingRef.current = false;
      if (autoplay) {
        playlist.play();
        setStatus('loading');
      } else setStatus('paused');
    } catch (cause) {
      if (generation !== generationRef.current || !mountedRef.current) return;
      queueLoadingRef.current = false;
      const message = cause instanceof Error ? cause.message : 'Unable to play this recitation.';
      recoverOnConnection.current = autoplay && (!onlineRef.current || /offline|connection|network|timed out/i.test(message));
      setError(message);
      setStatus('error');
    }
  }, [playlist, resolveSources, titleFor]);

  playRequest.current = playPosition;

  useEffect(() => {
    const subscription = quranAudioControls.addPlaybackErrorListener((message, uri, time) => {
      if (!currentRef.current || !mountedRef.current) return;
      const match = /\/(\d{3})(\d{3})\.mp3(?:\?|$)/.exec(uri ?? '');
      if (match) {
        const position={surah:Number(match[1]),verse:Number(match[2])};
        if (findQuranQueuePosition(queuePositionsRef.current,position)>=0) { currentRef.current=position;setCurrent(position); }
      }
      resumeTime.current = Math.max(0, typeof time === 'number' && Number.isFinite(time) ? time : currentTimeRef.current);
      generationRef.current += 1;
      queueLoadingRef.current = false;
      refillForRef.current = null;
      recoverOnConnection.current = wantsPlayback.current && (!onlineRef.current || /network|connection|timed out|offline/i.test(message));
      playlist.pause();
      setError(message);
      setStatus('error');
    });
    return () => subscription.remove();
  }, [playlist]);

  useEffect(() => {
    if (!currentRef.current || queueLoadingRef.current || playerStatus.trackCount !== queuePositionsRef.current.length) return;
    const index = playerStatus.currentIndex;
    const position = queuePositionsRef.current[index];
    if (position && (position.surah !== currentRef.current.surah || position.verse !== currentRef.current.verse)) {
      currentRef.current = position;
      setCurrent(position);
      quranAudioControls.updateMetadata(titleFor(position), reciterRef.current);
    }
  }, [playerStatus.currentIndex, playerStatus.trackCount, titleFor]);

  useEffect(() => {
    const statusError = (playerStatus as typeof playerStatus & { error?: { message?: string } | string }).error;
    if (statusError && currentRef.current) {
      setError(typeof statusError === 'string' ? statusError : statusError.message ?? 'The audio player could not load this ayah.');
      setStatus('error');
      return;
    }
    if (!currentRef.current || queueLoadingRef.current) return;
    const reachedQueueEnd = repeatRef.current === null && playerStatus.currentIndex >= playerStatus.trackCount - 1
      && (playerStatus.didJustFinish || (!playerStatus.playing && playerStatus.isLoaded
        && playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration - 0.1));
    if (playerStatus.trackCount > 0 && reachedQueueEnd) {
      playlist.pause();
      setStatus('idle');
      return;
    }
    if (playerStatus.isBuffering) setStatus(previous => previous === 'paused' || previous === 'idle' || previous === 'error' ? previous : 'loading');
    else if (playerStatus.playing && wantsPlayback.current) setStatus(previous => previous === 'idle' || previous === 'error' ? previous : 'playing');
    else if (playerStatus.isLoaded && statusRef.current === 'playing') setStatus('paused');
  }, [playerStatus, playlist]);

  const refillQueue = useCallback(async () => {
    if (repeatRef.current || queueLoadingRef.current || statusRef.current === 'paused' || statusRef.current === 'idle' || statusRef.current === 'error') return;
    const positions = queuePositionsRef.current;
    const index = playerStatus.currentIndex;
    if (positions.length - index > 10 || !positions.length) return;
    const nextChapter = nextQuranQueueChapter(positions);
    if (!nextChapter.length) return;
    const marker = `${nextChapter[0].surah}:1`;
    if (refillForRef.current === marker) return;
    refillForRef.current = marker;
    const generation = generationRef.current;
    const sources = await resolveSources(nextChapter, reciterRef.current, generation);
    if (!sources || generation !== generationRef.current || repeatRef.current || !mountedRef.current) return;
    if (queuePositionsRef.current !== positions) return;
    for (const source of sources) playlist.add({ uri: source });
    queuePositionsRef.current = [...positions, ...nextChapter];
    queueTitlesRef.current = queuePositionsRef.current.map(titleFor);
    updateNativeTitles();
    // Drop consumed queue metadata/native slots after the next chapter has been safely queued.
    const consumed = playerStatus.currentIndex;
    if (consumed > 0 && consumed < queuePositionsRef.current.length - 1) {
      for (let removed = 0; removed < consumed; removed += 1) playlist.remove(0);
      queuePositionsRef.current = queuePositionsRef.current.slice(consumed);
      queueTitlesRef.current = queueTitlesRef.current.slice(consumed);
      updateNativeTitles();
    }
  }, [playerStatus.currentIndex, playlist, resolveSources, titleFor, updateNativeTitles]);

  useEffect(() => { void refillQueue(); }, [playerStatus.currentIndex, playerStatus.trackCount, playerStatus.playing, refillQueue]);

  useEffect(() => {
    const subscription = quranAudioControls.addRemoteCommandListener((command, nativeHandled) => {
      if (command === 'play') {
        wantsPlayback.current = true;
        if (statusRef.current === 'error' && currentRef.current) { void playRequest.current(currentRef.current,true,resumeTime.current); return; }
        if (nativeHandled) setStatus('playing');
        else if (queuePositionsRef.current.length) playlist.play();
        else void playPosition(currentRef.current ?? { surah: 1, verse: 1 });
      } else if (command === 'pause') {
        wantsPlayback.current = false;
        recoverOnConnection.current = false;
        generationRef.current++;
        queueLoadingRef.current=false;
        refillForRef.current=null;
        if (nativeHandled) setStatus('paused');
        else playlist.pause();
      }
      else if (command === 'stop') stopRequest.current();
      else if (command === 'next') playlist.next();
      else if (command === 'previous') playlist.previous();
    });
    return () => subscription.remove();
  }, [playPosition, playlist]);

  useEffect(() => {
    if (!quranAudioControls.available) return;
    return () => quranAudioControls.detach();
  }, []);

  useEffect(() => {
    if (status !== 'loading') return;
    const timeout = setTimeout(() => {
      generationRef.current += 1;
      queueLoadingRef.current = false;
      resumeTime.current = Math.max(0, currentTimeRef.current);
      recoverOnConnection.current = wantsPlayback.current;
      setError('Audio did not load. Check your connection and retry.');
      setStatus('error');
      playlist.pause();
    }, 25000);
    return () => clearTimeout(timeout);
  }, [playlist, status]);

  const playVerse = useCallback(async (surah: number, verse: number) => {
    setRepeatRangeState(null);
    repeatRef.current = null;
    await playPosition({ surah, verse });
  }, [playPosition]);

  const playRange = useCallback(async (surah: number, start: number, end: number) => {
    const chapter = getSurah(surah);
    if (!chapter || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > chapter.verseCount) {
      setError('Choose a valid verse range.');
      setStatus('error');
      return;
    }
    const range = { surah, start, end };
    setRepeatRangeState(range);
    repeatRef.current = range;
    await playPosition({ surah, verse: start });
  }, [playPosition]);

  const pause = useCallback(() => {
    wantsPlayback.current = false;
    recoverOnConnection.current = false;
    generationRef.current += 1;
    queueLoadingRef.current = false;
    refillForRef.current = null;
    playlist.pause();
    setStatus('paused');
  }, [playlist]);

  const stop = useCallback(() => {
    wantsPlayback.current = false;
    recoverOnConnection.current = false;
    resumeTime.current = 0;
    generationRef.current += 1;
    queueLoadingRef.current = false;
    refillForRef.current = null;
    playlist.pause();
    playlist.loop = 'none';
    playlist.clear();
    quranAudioControls.detach();
    attachedPlaylistRef.current = false;
    currentRef.current = null;
    queuePositionsRef.current = [];
    queueTitlesRef.current = [];
    setCurrent(null);
    setStatus('idle');
    setError(null);
  }, [playlist]);

  stopRequest.current = stop;

  const togglePlayback = useCallback(async () => {
    if (status === 'playing' || status === 'loading') {
      pause();
      return;
    }
    if (currentRef.current && queuePositionsRef.current.length && playerStatus.isLoaded) {
      wantsPlayback.current = true;
      setError(null);
      playlist.play();
      setStatus('loading');
    } else if (currentRef.current) await playPosition(currentRef.current);
    else await playPosition({ surah: 1, verse: 1 });
  }, [pause, playPosition, playlist, playerStatus.isLoaded, status]);

  const seekToPosition = useCallback(async (position: QuranQueuePosition) => {
    wantsPlayback.current = true;
    recoverOnConnection.current = false;
    const index = findQuranQueuePosition(queuePositionsRef.current, position);
    if (index >= 0 && queuePositionsRef.current.length > index) {
      generationRef.current += 1;
      queueLoadingRef.current = false;
      refillForRef.current = null;
      playlist.skipTo(index);
      currentRef.current = position;
      setCurrent(position);
      quranAudioControls.updateMetadata(titleFor(position), reciterRef.current);
      playlist.play();
      setStatus('loading');
    } else await playPosition(position);
  }, [playlist, playPosition, titleFor]);

  const replayVerse = useCallback(async () => {
    wantsPlayback.current = true;
    recoverOnConnection.current = false;
    const position = currentRef.current;
    if (!position) return;
    if (queuePositionsRef.current.length && playerStatus.isLoaded) {
      const generation=++generationRef.current;
      queueLoadingRef.current=false;
      refillForRef.current=null;
      setError(null);
      await playlist.seekTo(0);
      if(generation!==generationRef.current)return;
      playlist.play();
      setStatus('loading');
    } else await playPosition(position);
  }, [playlist, playerStatus.isLoaded, playPosition]);

  const nextVerse = useCallback(async () => {
    const position = currentRef.current;
    if (!position) return;
    const next = nextVersePosition(position, repeatRef.current);
    if (next) await seekToPosition(next);
    else stop();
  }, [seekToPosition, stop]);

  const previousVerse = useCallback(async () => {
    const position = currentRef.current;
    if (!position) return;
    const previous = previousPositionInRange(position, repeatRef.current);
    if (previous) await seekToPosition(previous);
  }, [seekToPosition]);

  const seekBy = useCallback((seconds: number) => {
    const { duration, currentTime } = timingRef.current;
    void playlist.seekTo(Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, currentTime + seconds))).catch(() => undefined);
  }, [playlist]);

  const setReciter = useCallback((id: ReciterId) => {
    if (!reciterById.has(id)) return;
    setReciterState(id);
    reciterRef.current = id;
    if (currentRef.current) void playPosition(currentRef.current, statusRef.current === 'playing' || statusRef.current === 'loading');
  }, [playPosition]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (![0.75, 1, 1.25, 1.5, 2].includes(rate)) return;
    setPlaybackRateState(rate);
    rateRef.current = rate;
    playlist.playbackRate = rate;
    quranAudioControls.updatePlaybackRate(rate);
  }, [playlist]);

  const setRepeatRange = useCallback((range: AudioRange | null) => {
    if (range && !validAudioRange(range)) return;
    setRepeatRangeState(range);
    repeatRef.current = range;
    const current = currentRef.current;
    if (range) {
      const within = current?.surah === range.surah && current.verse >= range.start && current.verse <= range.end;
      const wasPlaying = statusRef.current === 'playing' || statusRef.current === 'loading';
      void playPosition({ surah: range.surah, verse: range.start }, !within || wasPlaying);
    } else if (current) void playPosition(current, statusRef.current === 'playing' || statusRef.current === 'loading');
  }, [playPosition]);

  const downloadChapters = useCallback(async (numbers: readonly number[], activeReciter: ReciterId, scope: 'surah' | 'quran') => {
    const chapters = numbers.map(getSurah).filter(chapter => chapter !== undefined);
    if (!chapters.length || !reciterById.has(activeReciter) || downloadingRef.current || !mountedRef.current) return;
    // One lock and cancellation flag cover the entire job, including chapter boundaries.
    downloadingRef.current = true;
    const job = ++downloadGenerationRef.current;
    inventoryRevision.current++;
    downloadCanceledRef.current = false;
    failedDownloadRef.current = chapters[0].number;
    failedDownloadReciter.current = activeReciter;
    failedDownloadScope.current = scope;
    setDownloadError(null);
    setIsDownloading(chapters[0].number);
    setDownloadScope(scope);
    setDownloadProgress(0);
    setDownloadOverallProgress(0);
    setDownloadCompletedSurahs(0);
    setDownloadingReciter(activeReciter);
    const totalVerses = chapters.reduce((sum, chapter) => sum + chapter.verseCount, 0);
    let completedVerses = 0;
    let completedSurahs = 0;
    try {
      for (const chapter of chapters) {
        if (downloadCanceledRef.current) break;
        const surah = chapter.number;
        failedDownloadRef.current = surah;
        if (mountedRef.current) { setIsDownloading(surah); setDownloadProgress(0); }
        const progress = (position: number) => {
          if (!mountedRef.current || downloadCanceledRef.current || job !== downloadGenerationRef.current) return;
          setDownloadProgress(Math.floor(100 * position / chapter.verseCount));
          setDownloadOverallProgress(Math.floor(100 * (completedVerses + position) / totalVerses));
        };
        await FileSystem.makeDirectoryAsync(surahUri(activeReciter, surah), { intermediates: true });
        for (let verse = 1; verse <= chapter.verseCount; verse += 1) {
          if (downloadCanceledRef.current) break;
          const destination = localUri(activeReciter, surah, verse);
          const existingInfo = await FileSystem.getInfoAsync(destination);
          if (downloadCanceledRef.current) break;
          if (existingInfo.exists && typeof existingInfo.size === 'number' && Number.isFinite(existingInfo.size) && existingInfo.size > 0) {
            progress(verse);
            continue;
          }
          if (existingInfo.exists) await FileSystem.deleteAsync(destination, { idempotent: true });
          const temporary = `${destination}.${job}.part`;
          await FileSystem.deleteAsync(`${destination}.part`, { idempotent: true });
          temporaryDownloadRef.current = temporary;
          if ((await FileSystem.getInfoAsync(temporary)).exists) await FileSystem.deleteAsync(temporary, { idempotent: true });
          if (downloadCanceledRef.current) break;
          const task = FileSystem.createDownloadResumable(audioUri(activeReciter, surah, verse), temporary, {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
            if (totalBytesExpectedToWrite > 0) progress(verse - 1 + Math.min(1, Math.max(0, totalBytesWritten / totalBytesExpectedToWrite)));
          });
          downloadTaskRef.current = task;
          let deadline: ReturnType<typeof setTimeout> | undefined;
          const downloadPromise = task.downloadAsync();
          const timeoutPromise = new Promise<never>((_resolve, reject) => {
            deadline = setTimeout(() => {
              void cancelDownloadTask(task);
              reject(new Error(`Download timed out at verse ${verse}. Retry to continue.`));
            }, DOWNLOAD_FILE_TIMEOUT_MS);
          });
          let result: FileSystem.FileSystemDownloadResult | undefined;
          try {
            result = await Promise.race([downloadPromise, timeoutPromise]);
          } finally {
            if (deadline) clearTimeout(deadline);
          }
          downloadTaskRef.current = null;
          if (downloadCanceledRef.current) break;
          if (!result?.uri || !isValidAudioDownloadResponse(result.status, result.mimeType, result.headers)) {
            throw new Error(`The audio server returned an unexpected file at verse ${verse}.`);
          }
          const temporaryInfo = await FileSystem.getInfoAsync(temporary);
          if (!temporaryInfo.exists || !temporaryInfo.size || temporaryInfo.size <= 0) throw new Error(`Empty audio file at verse ${verse}.`);
          if (downloadCanceledRef.current) break;
          await FileSystem.moveAsync({ from: temporary, to: destination });
          temporaryDownloadRef.current = null;
          progress(verse);
        }
        if (downloadCanceledRef.current) break;
        completedVerses += chapter.verseCount;
        completedSurahs++;
        if (mountedRef.current) {
          setDownloadsByReciter(existing => ({ ...existing, [activeReciter]: existing[activeReciter].includes(surah) ? existing[activeReciter] : [...existing[activeReciter], surah].sort((a, b) => a - b) }));
          setDownloadCompletedSurahs(completedSurahs);
        }
      }
      if (!downloadCanceledRef.current) {
        failedDownloadRef.current = null;
        failedDownloadReciter.current = null;
        if (mountedRef.current) { setDownloadProgress(100); setDownloadOverallProgress(100); }
      }
    } catch (cause) {
      if (!downloadCanceledRef.current && mountedRef.current) {
        setDownloadError(cause instanceof Error ? cause.message : 'Download failed. Retry to continue from saved verses.');
      }
    } finally {
      // Finish native cancellation before allowing a new job to reuse its .part path.
      const pendingTask = downloadTaskRef.current;
      if (pendingTask) await cancelDownloadTask(pendingTask);
      downloadTaskRef.current = null;
      if (temporaryDownloadRef.current) await FileSystem.deleteAsync(temporaryDownloadRef.current, { idempotent: true }).catch(() => undefined);
      temporaryDownloadRef.current = null;
      if (downloadCanceledRef.current) { failedDownloadRef.current = null; failedDownloadReciter.current = null; }
      downloadingRef.current = false;
      if (mountedRef.current) { setIsDownloading(null); setDownloadingReciter(null); setDownloadScope(null); }
    }
  }, []);

  const downloadSurah = useCallback(async (surah: number, selectedReciter?: ReciterId) => {
    await downloadChapters([surah], selectedReciter ?? reciterRef.current, 'surah');
  }, [downloadChapters]);

  const downloadQuran = useCallback(async (selectedReciter?: ReciterId) => {
    await downloadChapters(surahs.map(chapter => chapter.number), selectedReciter ?? reciterRef.current, 'quran');
  }, [downloadChapters]);

  const cancelDownload = useCallback(() => {
    downloadCanceledRef.current = true;
    if (downloadTaskRef.current) void cancelDownloadTask(downloadTaskRef.current);
    setDownloadError(null);
  }, []);

  const removeSavedAudio = useCallback(async (items: readonly AudioDownload[]) => {
    if (downloadingRef.current) throw new Error('Wait for the active download or cancel it first.');
    inventoryRevision.current++;
    const known = items.filter(item => reciterById.has(item.reciter as ReciterId) && Boolean(getSurah(item.surah)));
    if (known.some(item => item.reciter === reciterRef.current && queuePositionsRef.current.some(position => position.surah === item.surah))) stop();
    for (const item of known) {
      await FileSystem.deleteAsync(surahUri(item.reciter as ReciterId, item.surah), {idempotent:true});
      setDownloadsByReciter(existing => ({...existing,[item.reciter]:existing[item.reciter as ReciterId].filter(surah => surah !== item.surah)}));
      setSavedAudio(existing => existing.filter(saved => saved.reciter !== item.reciter || saved.surah !== item.surah));
    }
  }, [stop]);
  const deleteSurahDownload = useCallback(async (surah: number) => {
    await removeSavedAudio([{reciter:reciterRef.current,surah,bytes:0,verses:0,total:0,complete:false}]);
  }, [removeSavedAudio]);
  const refreshDownloads = useCallback(async () => {
    if (downloadingRef.current) return;
    const revision = ++inventoryRevision.current;
    const inventory: AudioDownload[] = [];
    for (const voice of RECITERS) {
      const directories = await FileSystem.readDirectoryAsync(`${AUDIO_ROOT}${voice.id}/`).catch(() => [] as string[]);
      for (const directory of directories) {
        if (!/^\d{3}$/.test(directory)) continue;
        const chapter = getSurah(Number(directory));
        if (!chapter) continue;
        const base = surahUri(voice.id, chapter.number);
        const names = await FileSystem.readDirectoryAsync(base);
        const files = await Promise.all(names.filter(name => /^\d{6}\.mp3$/.test(name)).map(async name => {
          const info = await FileSystem.getInfoAsync(base + name);
          return {name,size:info.exists ? info.size : 0};
        }));
        const entry = summarizeAudioDownload(voice.id, chapter.number, chapter.verseCount, files);
        if (entry.verses) inventory.push(entry);
      }
    }
    if (revision !== inventoryRevision.current || downloadingRef.current || !mountedRef.current) return;
    setSavedAudio(inventory);
    setDownloadsByReciter(Object.fromEntries(RECITERS.map(voice => [voice.id,inventory.filter(item => item.reciter === voice.id && item.complete).map(item => item.surah).sort((a,b)=>a-b)])) as Record<ReciterId,number[]>);
  }, []);

  const retryPlayback = useCallback(async () => {
    await refreshOnline();
    const position = currentRef.current;
    if (position) await playPosition(position, true, resumeTime.current);
  }, [playPosition, refreshOnline]);
  const retryDownload = useCallback(async () => {
    const target = failedDownloadRef.current;
    if (target === null || !await refreshOnline()) return;
    const voice = failedDownloadReciter.current ?? reciterRef.current;
    if (failedDownloadScope.current === 'quran') await downloadQuran(voice);
    else await downloadSurah(target, voice);
  }, [downloadSurah, downloadQuran, refreshOnline]);
  const retry = useCallback(async () => {
    if (error) await retryPlayback();
    else if (downloadError) await retryDownload();
    else await refreshOnline();
  }, [error, downloadError, retryPlayback, retryDownload, refreshOnline]);

  const downloadedSurahs = downloadsByReciter[reciter];
  const activeSurahDownloaded = useMemo(() => current ? downloadedSurahs.includes(current.surah) : false, [current, downloadedSurahs]);
  return {
    status,
    currentVerseKey: current ? verseKey(current.surah, current.verse) : null,
    currentTime: playerStatus.currentTime,
    duration: playerStatus.duration,
    reciter,
    playbackRate,
    repeatRange,
    error,
    downloadError,
    downloadedSurahs,
    isDownloading,
    downloadingReciter,
    savedAudio,
    refreshDownloads,
    removeSavedAudio,
    downloadProgress,
    downloadScope,
    downloadOverallProgress,
    downloadCompletedSurahs,
    isCurrentSurahDownloaded: activeSurahDownloaded,
    isOnline,
    playVerse,
    playRange,
    togglePlayback,
    pause,
    stop,
    nextVerse,
    previousVerse,
    seekBy,
    replayVerse,
    setReciter,
    setPlaybackRate,
    setRepeatRange,
    downloadSurah,
    downloadQuran,
    cancelDownload,
    deleteSurahDownload,
    retry,
    retryPlayback,
    retryDownload,
  };
}
