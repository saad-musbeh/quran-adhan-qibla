import { requireOptionalNativeModule } from 'expo';
import type { AudioPlaylist } from 'expo-audio';
import type { ReciterId } from './use-quran-audio';

type NativeQuranAudioControls = {
  attach(playlist: AudioPlaylist, titles: string[], artist: string): void;
  updateTitles(titles: string[], artist: string, currentIndex: number): void;
  updateMetadata(title: string, artist: string): void;
  updatePlaybackRate(rate: number): void;
  detach(): void;
  addListener(eventName: 'remoteCommand', listener: (event: { command: string; nativeHandled?: boolean }) => void): { remove(): void };
};

const native = requireOptionalNativeModule<NativeQuranAudioControls>('QuranAudioControls');
const reciterNames: Record<ReciterId, string> = {
  alafasy: 'Mishary Rashid Alafasy',
  husary: 'Mahmoud Khalil Al-Husary',
  sudais: 'Abdurrahmaan As-Sudais',
};

export const quranAudioControls = {
  get available() { return native !== null; },
  attach(playlist: AudioPlaylist, titles: string[], reciter: ReciterId) { native?.attach(playlist, titles, reciterNames[reciter]); },
  updateTitles(titles: string[], reciter: ReciterId, currentIndex: number) { native?.updateTitles(titles, reciterNames[reciter], currentIndex); },
  updateMetadata(title: string, reciter: ReciterId) { native?.updateMetadata(title, reciterNames[reciter]); },
  updatePlaybackRate(rate: number) { native?.updatePlaybackRate(rate); },
  detach() { native?.detach(); },
  addRemoteCommandListener(listener: (command: string, nativeHandled: boolean) => void) {
    return native?.addListener('remoteCommand', event => listener(event.command, event.nativeHandled === true)) ?? { remove() {} };
  },
};
