import type { ReciterId } from './reciters';

/** MP3Quran v3: complete Hafs murattal editions, verified 2026-10-17. */
export const SURAH_RECITATIONS = {
  husary: { read: 118, server: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r1/', timed: true },
  ghamdi: { read: 30, server: 'https://cdn.mp3quran.net/audio/saad-ghamdi/r1/', timed: true },
  alafasy: { read: 123, server: 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/', timed: true },
  sudais: { read: 54, server: 'https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/', timed: true },
  abdulbasit: { read: 53, server: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/', timed: true },
  minshawi: { read: 112, server: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/', timed: true },
  shuraym: { read: 31, server: 'https://cdn.mp3quran.net/audio/saud-shuraim/r1/', timed: true },
  maher: { read: 102, server: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/', timed: false },
  ajamy: { read: 5, server: 'https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/', timed: true },
  hudhaify: { read: 74, server: 'https://cdn.mp3quran.net/audio/ali-hudhaifi/r1/', timed: true },
  basfar: { read: 60, server: 'https://cdn.mp3quran.net/audio/abdullah-basfar/r1/', timed: true },
  fares: { read: 81, server: 'https://cdn.mp3quran.net/audio/fares-abbad/r1/', timed: true },
  dossary: { read: 92, server: 'https://cdn.mp3quran.net/audio/yasser-dosari/r1/', timed: true },
  qatami: { read: 86, server: 'https://cdn.mp3quran.net/audio/nasser-qatami/r1/', timed: true },
  qasim: { read: 67, server: 'https://cdn.mp3quran.net/audio/abdulmohsen-qasim/r1/', timed: true },
  budair: { read: 43, server: 'https://cdn.mp3quran.net/audio/salah-budair/r1/', timed: true },
  rifai: { read: 89, server: 'https://cdn.mp3quran.net/audio/hani-rifai/r1/', timed: true },
  jibreel: { read: 111, server: 'https://cdn.mp3quran.net/audio/muhammad-jibreel/r1/', timed: false },
  jaber: { read: 76, server: 'https://cdn.mp3quran.net/audio/ali-jaber/r1/', timed: true },
  shaatree: { read: 4, server: 'https://cdn.mp3quran.net/audio/abubakr-shatri/r1/', timed: true },
} as const satisfies Record<ReciterId, { read: number; server: string; timed: boolean }>;
