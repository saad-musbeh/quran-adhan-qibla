/** Hafs verse recordings, verified against EveryAyah's recitations.js catalogue. */
export const RECITERS = [
  { id: 'alafasy', name: 'Mishary Rashid Alafasy', arabicName: 'مشاري راشد العفاسي', directory: 'Alafasy_128kbps' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', arabicName: 'محمود خليل الحصري', directory: 'Husary_128kbps' },
  { id: 'sudais', name: 'Abdurrahmaan As-Sudais', arabicName: 'عبدالرحمن السديس', directory: 'Abdurrahmaan_As-Sudais_64kbps' },
  { id: 'abdulbasit', name: 'Abdul Basit Abdus Samad', arabicName: 'عبد الباسط عبد الصمد', directory: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'minshawi', name: 'Muhammad Siddiq Al-Minshawi', arabicName: 'محمد صديق المنشاوي', directory: 'Minshawy_Murattal_128kbps' },
  { id: 'shuraym', name: 'Saud Ash-Shuraym', arabicName: 'سعود الشريم', directory: 'Saood_ash-Shuraym_128kbps' },
  { id: 'maher', name: 'Maher Al-Muaiqly', arabicName: 'ماهر المعيقلي', directory: 'MaherAlMuaiqly128kbps' },
  { id: 'ajamy', name: 'Ahmed Al-Ajamy', arabicName: 'أحمد العجمي', directory: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net' },
  { id: 'hudhaify', name: 'Ali Al-Hudhaify', arabicName: 'علي الحذيفي', directory: 'Hudhaify_128kbps' },
  { id: 'basfar', name: 'Abdullah Basfar', arabicName: 'عبدالله بصفر', directory: 'Abdullah_Basfar_192kbps' },
] as const;

export type ReciterId = typeof RECITERS[number]['id'];

export function emptyReciterDownloads(): Record<ReciterId, number[]> {
  return Object.fromEntries(RECITERS.map(reciter => [reciter.id, [] as number[]])) as Record<ReciterId, number[]>;
}
