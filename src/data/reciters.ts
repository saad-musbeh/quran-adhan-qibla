/** Hafs verse recordings, verified against EveryAyah's recitations.js catalogue. */
export const RECITERS = [
  { id: 'ghamdi', name: 'Saad Al-Ghamdi', arabicName: 'سعد الغامدي', directory: 'Ghamadi_40kbps' },
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
  { id: 'fares', name: 'Fares Abbad', arabicName: 'فارس عباد', directory: 'Fares_Abbad_64kbps' },
  { id: 'dossary', name: 'Yasser Ad-Dossary', arabicName: 'ياسر الدوسري', directory: 'Yasser_Ad-Dussary_128kbps' },
  { id: 'qatami', name: 'Nasser Al-Qatami', arabicName: 'ناصر القطامي', directory: 'Nasser_Alqatami_128kbps' },
  { id: 'qasim', name: 'Muhsin Al-Qasim', arabicName: 'محسن القاسم', directory: 'Muhsin_Al_Qasim_192kbps' },
  { id: 'budair', name: 'Salah Al-Budair', arabicName: 'صلاح البدير', directory: 'Salah_Al_Budair_128kbps' },
  { id: 'rifai', name: 'Hani Ar-Rifai', arabicName: 'هاني الرفاعي', directory: 'Hani_Rifai_192kbps' },
  { id: 'jibreel', name: 'Muhammad Jibreel', arabicName: 'محمد جبريل', directory: 'Muhammad_Jibreel_128kbps' },
  { id: 'jaber', name: 'Ali Jaber', arabicName: 'علي جابر', directory: 'Ali_Jaber_64kbps' },
  { id: 'shaatree', name: 'Abu Bakr Ash-Shatri', arabicName: 'أبو بكر الشاطري', directory: 'Abu_Bakr_Ash-Shaatree_128kbps' },
] as const;

export type ReciterId = typeof RECITERS[number]['id'];
export const DEFAULT_RECITER_ID: ReciterId = 'ghamdi';

export function emptyReciterDownloads(): Record<ReciterId, number[]> {
  return Object.fromEntries(RECITERS.map(reciter => [reciter.id, [] as number[]])) as Record<ReciterId, number[]>;
}
