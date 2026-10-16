import { bilingual, type Language } from './i18n';
import type { AdhkarCollection } from './domain/adhkar';

export function collectionTitle(language: Language, id: AdhkarCollection): string {
  return ({ morning: bilingual(language, 'أذكار الصباح', 'Morning adhkar'), evening: bilingual(language, 'أذكار المساء', 'Evening adhkar'), 'after-prayer': bilingual(language, 'أدعية بعد الصلاة', 'After prayer') })[id];
}

export const adhkarTitle = (language: Language) => bilingual(language, 'أذكار وأدعية', 'Adhkar & dua');
