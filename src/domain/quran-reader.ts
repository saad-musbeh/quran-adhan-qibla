import { getSurah, getVerse, type Verse } from './quran.ts';
import { getMushafPageVerses } from '../data/mushaf.ts';

export function printedPageVerses(page:number): Verse[] { return getMushafPageVerses(page).map(key=>{const [surah,ayah]=key.split(':').map(Number);return getVerse(surah,ayah);}).filter((verse):verse is Verse=>Boolean(verse)); }

export function chapterNames(page:readonly Verse[]) {const starts=page.filter(verse=>verse.number===1);return [...new Set((starts.length?starts:page).map(verse=>getSurah(verse.surah)?.arabicName).filter(Boolean))].map(name=>`سورة ${name}`).join('  ');}

export function juzArabic(juz:number) { const names=['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر','السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون','الحادي والعشرون','الثاني والعشرون','الثالث والعشرون','الرابع والعشرون','الخامس والعشرون','السادس والعشرون','السابع والعشرون','الثامن والعشرون','التاسع والعشرون','الثلاثون'];return `الجزء ${names[Math.max(0,Math.min(29,juz-1))]}`; }
