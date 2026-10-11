import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getSurah, getVerse } from './domain/quran';
import {
  audioCacheKey, isValidAudioDownloadResponse, nextVersePosition, previousPositionInRange, verseKey,
  type AudioRange as DomainAudioRange,
} from './domain/quran-audio';

export type ReciterId = 'alafasy' | 'husary' | 'sudais';
export const RECITERS: { id: ReciterId; name: string; arabicName: string; directory: string }[] = [
  { id: 'alafasy', name: 'Mishary Rashid Alafasy', arabicName: 'مشاري العفاسي', directory: 'Alafasy_128kbps' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', arabicName: 'محمود خليل الحصري', directory: 'Husary_128kbps' },
  { id: 'sudais', name: 'Abdurrahmaan As-Sudais', arabicName: 'عبدالرحمن السديس', directory: 'Abdurrahmaan_As-Sudais_64kbps' },
];

export type AudioRange = DomainAudioRange;
export type QuranAudioController = {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  currentVerseKey: string | null;
  currentTime: number;
  duration: number;
  reciter: ReciterId;
  playbackRate: number;
  repeatRange: AudioRange | null;
  error: string | null;
  downloadError: string | null;
  downloadedSurahs: number[];
  isDownloading: number | null;
  downloadProgress: number;
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
  setReciter(id: ReciterId): void;
  setPlaybackRate(rate: number): void;
  setRepeatRange(range: AudioRange | null): void;
  downloadSurah(surah: number): Promise<void>;
  cancelDownload(): void;
  deleteSurahDownload(surah: number): Promise<void>;
  retry(): Promise<void>;
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

export function useQuranAudio(): QuranAudioController {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);
  const [reciter, setReciterState] = useState<ReciterId>('alafasy');
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeatRange, setRepeatRangeState] = useState<AudioRange | null>(null);
  const [current, setCurrent] = useState<{ surah: number; verse: number } | null>(null);
  const [status, setStatus] = useState<QuranAudioController['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadsByReciter, setDownloadsByReciter] = useState<Record<ReciterId, number[]>>({ alafasy: [], husary: [], sudais: [] });
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
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
  const generationRef = useRef(0);
  const mountedRef = useRef(false);
  const pendingLoadRef = useRef(false);
  const loadIntentRef = useRef<{ generation: number; autoplay: boolean } | null>(null);
  const onlineRef = useRef(true);
  const downloadingRef = useRef(false);
  const wasFinishedRef = useRef(false);
  currentRef.current = current;
  reciterRef.current = reciter;
  repeatRef.current = repeatRange;
  rateRef.current = playbackRate;

  const refreshOnline = useCallback(async () => {
    try {
      const network = await getNetworkStateAsync();
      const reachable = network.isConnected !== false && network.isInternetReachable !== false;
      onlineRef.current = reachable;
      if (mountedRef.current) setIsOnline(reachable);
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
      pendingLoadRef.current = false;
      loadIntentRef.current = null;
      downloadCanceledRef.current = true;
      if (downloadTaskRef.current) void cancelDownloadTask(downloadTaskRef.current);
      downloadTaskRef.current = null;
    };
  }, []);

  useEffect(() => {
    void refreshOnline();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshOnline();
    });
    const networkSubscription = addNetworkStateListener((network) => {
      const reachable = network.isConnected !== false && network.isInternetReachable !== false;
      onlineRef.current = reachable;
      if (mountedRef.current) setIsOnline(reachable);
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
            setDownloadsByReciter({
              alafasy: cleanDownloadedSurahs(byReciter.alafasy),
              husary: cleanDownloadedSurahs(byReciter.husary),
              sudais: cleanDownloadedSurahs(byReciter.sudais),
            });
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

  const playPosition = useCallback(async (position: { surah: number; verse: number }, autoplay = true) => {
    const verse = getVerse(position.surah, position.verse);
    if (!verse) return;
    const generation = ++generationRef.current;
    const activeReciter = reciterRef.current;
    currentRef.current = position;
    setCurrent(position);
    const local = localUri(activeReciter, position.surah, position.verse);
    setError(null);
    pendingLoadRef.current = true;
    loadIntentRef.current = { generation, autoplay };
    setStatus('loading');
    try {
      const available = await FileSystem.getInfoAsync(local);
      if (generation !== generationRef.current || !mountedRef.current) return;
      const useLocalFile = available.exists && typeof available.size === 'number' && Number.isFinite(available.size) && available.size > 0;
      if (available.exists && !useLocalFile) await FileSystem.deleteAsync(local, { idempotent: true }).catch(() => undefined);
      const source = useLocalFile ? local : audioUri(activeReciter, position.surah, position.verse);
      if (!useLocalFile && !onlineRef.current) throw new Error('Audio is unavailable offline. Download this surah while connected to the internet.');
      player.pause();
      player.replace(source);
      player.setPlaybackRate(rateRef.current, 'high');
      // Expo's native replace() prepares asynchronously. Queue play directly
      // after it so ExoPlayer retains playWhenReady while the source buffers.
      // The status handler below retries once loaded if the first command raced.
      if (autoplay) player.play();
      const surah = getSurah(position.surah);
      player.setActiveForLockScreen(true, {
        title: `${surah?.arabicName ?? `سورة ${position.surah}`} · ${position.verse}`,
        artist: reciterById.get(activeReciter)?.name ?? 'Quran recitation',
        albumTitle: 'Quran',
      }, { showSeekBackward: true, showSeekForward: true });
      setStatus(autoplay ? 'loading' : 'paused');
    } catch (cause) {
      if (generation !== generationRef.current || !mountedRef.current) return;
      pendingLoadRef.current = false;
      const message = cause instanceof Error ? cause.message : 'Unable to play this recitation.';
      setError(message);
      setStatus('error');
    }
  }, [player]);

  const advance = useCallback(async () => {
    const position = currentRef.current;
    if (!position) {
      setStatus('idle');
      return;
    }
    const next = nextVersePosition(position, repeatRef.current);
    if (!next) {
      player.pause();
      player.clearLockScreenControls();
      setStatus('idle');
      return;
    }
    await playPosition(next);
  }, [playPosition, player]);

  useEffect(() => {
    if (!playerStatus.didJustFinish) {
      wasFinishedRef.current = false;
      return;
    }
    if (!current || wasFinishedRef.current) return;
    wasFinishedRef.current = true;
    void advance();
  }, [advance, current, playerStatus.didJustFinish]);

  useEffect(() => {
    if (pendingLoadRef.current) {
      if (playerStatus.isLoaded) {
        pendingLoadRef.current = false;
        const intent = loadIntentRef.current;
        loadIntentRef.current = null;
        if (intent && intent.generation === generationRef.current && intent.autoplay) {
          try {
            player.play();
            setStatus('loading');
          } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'Unable to start this recitation.';
            setError(message);
            setStatus('error');
          }
        } else {
          setStatus(playerStatus.isBuffering ? 'loading' : playerStatus.playing ? 'playing' : 'paused');
        }
      }
      return;
    }
    if (playerStatus.isBuffering) setStatus('loading');
    else if (playerStatus.playing) {
      setError(null);
      setStatus('playing');
    }
    else if (status === 'loading' && playerStatus.isLoaded) setStatus('paused');
  }, [playerStatus.isBuffering, playerStatus.isLoaded, playerStatus.playing, status]);

  useEffect(() => {
    if (status !== 'loading') return;
    const timeout = setTimeout(() => {
      generationRef.current += 1;
      pendingLoadRef.current = false;
      loadIntentRef.current = null;
      setError('Audio did not load. Check your connection and retry.');
      setStatus('error');
      player.pause();
    }, 25000);
    return () => clearTimeout(timeout);
  }, [player, status]);

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
    generationRef.current += 1;
    pendingLoadRef.current = false;
    loadIntentRef.current = null;
    player.pause();
    setStatus('paused');
  }, [player]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    pendingLoadRef.current = false;
    loadIntentRef.current = null;
    player.pause();
    void player.seekTo(0).catch(() => undefined);
    player.clearLockScreenControls();
    currentRef.current = null;
    setCurrent(null);
    setStatus('idle');
    setError(null);
  }, [player]);

  const togglePlayback = useCallback(async () => {
    if (playerStatus.playing) {
      pause();
      return;
    }
    if (currentRef.current && playerStatus.isLoaded) {
      setError(null);
      player.play();
      setStatus('loading');
    } else if (currentRef.current) await playPosition(currentRef.current);
    else await playPosition({ surah: 1, verse: 1 });
  }, [pause, playPosition, player, playerStatus.isLoaded, playerStatus.playing]);

  const nextVerse = useCallback(async () => {
    const position = currentRef.current;
    if (!position) return;
    const next = nextVersePosition(position, repeatRef.current);
    if (next) await playPosition(next);
    else stop();
  }, [playPosition, stop]);

  const previousVerse = useCallback(async () => {
    const position = currentRef.current;
    if (!position) return;
    const previous = previousPositionInRange(position, repeatRef.current);
    if (previous) await playPosition(previous);
  }, [playPosition]);

  const seekBy = useCallback((seconds: number) => {
    const duration = playerStatus.duration || 0;
    void player.seekTo(Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, playerStatus.currentTime + seconds))).catch(() => undefined);
  }, [player, playerStatus.currentTime, playerStatus.duration]);

  const setReciter = useCallback((id: ReciterId) => {
    if (!reciterById.has(id)) return;
    setReciterState(id);
    reciterRef.current = id;
    if (currentRef.current) void playPosition(currentRef.current, playerStatus.playing);
  }, [playPosition, playerStatus.playing]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (![0.75, 1, 1.25, 1.5, 2].includes(rate)) return;
    setPlaybackRateState(rate);
    rateRef.current = rate;
    player.setPlaybackRate(rate, 'high');
  }, [player]);

  const setRepeatRange = useCallback((range: AudioRange | null) => {
    if (range && !validAudioRange(range)) return;
    setRepeatRangeState(range);
    repeatRef.current = range;
    if (range) {
      const current = currentRef.current;
      const within = current?.surah === range.surah && current.verse >= range.start && current.verse <= range.end;
      if (!within) void playPosition({ surah: range.surah, verse: range.start });
    }
  }, [playPosition]);

  const downloadSurah = useCallback(async (surah: number) => {
    const chapter = getSurah(surah);
    if (!chapter || downloadingRef.current) return;
    downloadCanceledRef.current = false;
    setDownloadError(null);
    downloadingRef.current = true;
    setIsDownloading(surah);
    setDownloadProgress(0);
    const activeReciter = reciterRef.current;
    const base = surahUri(activeReciter, surah);
    try {
      await FileSystem.makeDirectoryAsync(base, { intermediates: true });
      for (let verse = 1; verse <= chapter.verseCount; verse += 1) {
        if (downloadCanceledRef.current) break;
        const destination = localUri(activeReciter, surah, verse);
        const existingInfo = await FileSystem.getInfoAsync(destination);
        if (existingInfo.exists && typeof existingInfo.size === 'number' && Number.isFinite(existingInfo.size) && existingInfo.size > 0) {
          if (mountedRef.current) setDownloadProgress(Math.floor(100 * verse / chapter.verseCount));
          continue;
        }
        if (existingInfo.exists) await FileSystem.deleteAsync(destination, { idempotent: true });
        const temporary = `${destination}.part`;
        temporaryDownloadRef.current = temporary;
        if ((await FileSystem.getInfoAsync(temporary)).exists) await FileSystem.deleteAsync(temporary, { idempotent: true });
        const task = FileSystem.createDownloadResumable(audioUri(activeReciter, surah, verse), temporary, {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (mountedRef.current && totalBytesExpectedToWrite > 0) setDownloadProgress(Math.floor(100 * (verse - 1 + totalBytesWritten / totalBytesExpectedToWrite) / chapter.verseCount));
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
        await FileSystem.moveAsync({ from: temporary, to: destination });
        temporaryDownloadRef.current = null;
        if (mountedRef.current) setDownloadProgress(Math.floor(100 * verse / chapter.verseCount));
      }
      if (downloadCanceledRef.current) {
        if (downloadTaskRef.current) await cancelDownloadTask(downloadTaskRef.current);
        if (temporaryDownloadRef.current) await FileSystem.deleteAsync(temporaryDownloadRef.current, { idempotent: true }).catch(() => undefined);
        temporaryDownloadRef.current = null;
      }
      if (!downloadCanceledRef.current && mountedRef.current) {
        setDownloadsByReciter((existing) => ({ ...existing, [activeReciter]: existing[activeReciter].includes(surah) ? existing[activeReciter] : [...existing[activeReciter], surah].sort((a, b) => a - b) }));
        setDownloadProgress(100);
      }
    } catch (cause) {
      const pendingTask = downloadTaskRef.current;
      if (pendingTask) await cancelDownloadTask(pendingTask);
      downloadTaskRef.current = null;
      if (temporaryDownloadRef.current) await FileSystem.deleteAsync(temporaryDownloadRef.current, { idempotent: true }).catch(() => undefined);
      temporaryDownloadRef.current = null;
      if (!downloadCanceledRef.current && mountedRef.current) {
        const message = cause instanceof Error ? cause.message : 'Download failed. Retry to continue from saved verses.';
        failedDownloadRef.current = surah;
        setDownloadError(message);
      } else {
        if (temporaryDownloadRef.current) await FileSystem.deleteAsync(temporaryDownloadRef.current, { idempotent: true }).catch(() => undefined);
        temporaryDownloadRef.current = null;
      }
    } finally {
      downloadTaskRef.current = null;
      temporaryDownloadRef.current = null;
      downloadingRef.current = false;
      if (mountedRef.current) setIsDownloading(null);
    }
  }, []);

  const cancelDownload = useCallback(() => {
    downloadCanceledRef.current = true;
    if (downloadTaskRef.current) void cancelDownloadTask(downloadTaskRef.current);
    setDownloadError(null);
  }, []);

  const deleteSurahDownload = useCallback(async (surah: number) => {
    const activeReciter = reciterRef.current;
    const base = surahUri(activeReciter, surah);
    if ((await FileSystem.getInfoAsync(base)).exists) await FileSystem.deleteAsync(base, { idempotent: true });
    if (mountedRef.current) setDownloadsByReciter((existing) => ({ ...existing, [activeReciter]: existing[activeReciter].filter((item) => item !== surah) }));
  }, []);

  const retry = useCallback(async () => {
    setError(null);
    if (downloadError && failedDownloadRef.current !== null) {
      const online = await refreshOnline();
      if (online) {
        const target = failedDownloadRef.current;
        failedDownloadRef.current = null;
        await downloadSurah(target);
      }
    } else if (isDownloading !== null) await downloadSurah(isDownloading);
    else if (currentRef.current) {
      const online = await refreshOnline();
      if (online) await playPosition(currentRef.current);
    } else await refreshOnline();
  }, [downloadError, downloadSurah, isDownloading, playPosition, refreshOnline]);

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
    downloadProgress,
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
    setReciter,
    setPlaybackRate,
    setRepeatRange,
    downloadSurah,
    cancelDownload,
    deleteSurahDownload,
    retry,
  };
}
