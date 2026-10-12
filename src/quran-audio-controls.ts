import { requireOptionalNativeModule } from 'expo';
import type { AudioPlaylist } from 'expo-audio';
import { RECITERS, type ReciterId } from './data/reciters';

type NativeQuranAudioControls = {
  attach(playlist: AudioPlaylist, titles: string[], artist: string): void;
  updateTitles(titles: string[], artist: string, currentIndex: number): void;
  updateMetadata(title: string, artist: string): void;
  updatePlaybackRate(rate: number): void;
  detach(): void;
  addListener(eventName: 'remoteCommand' | 'playbackError', listener: (event: { command?: string; nativeHandled?: boolean; message?: string; uri?: string; time?: number }) => void): { remove(): void };
};

const native = requireOptionalNativeModule<NativeQuranAudioControls>('QuranAudioControls');
const reciterNames = Object.fromEntries(RECITERS.map(reciter => [reciter.id, reciter.name])) as Record<ReciterId, string>;

export const quranAudioControls = {
  get available() { return native !== null; },
  attach(playlist: AudioPlaylist, titles: string[], reciter: ReciterId) { native?.attach(playlist, titles, reciterNames[reciter]); },
  updateTitles(titles: string[], reciter: ReciterId, currentIndex: number) { native?.updateTitles(titles, reciterNames[reciter], currentIndex); },
  updateMetadata(title: string, reciter: ReciterId) { native?.updateMetadata(title, reciterNames[reciter]); },
  updatePlaybackRate(rate: number) { native?.updatePlaybackRate(rate); },
  detach() { native?.detach(); },
  addRemoteCommandListener(listener: (command: string, nativeHandled: boolean) => void) {
    return native?.addListener('remoteCommand', event => { if (event.command) listener(event.command, event.nativeHandled === true); }) ?? { remove() {} };
  },
  addPlaybackErrorListener(listener: (message: string, uri?: string, time?: number) => void) {
    return native?.addListener('playbackError', event => listener(event.message ?? 'Audio playback failed.', event.uri, event.time)) ?? { remove() {} };
  },
};
