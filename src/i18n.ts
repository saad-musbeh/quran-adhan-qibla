import { LANGUAGES, type Language } from './domain/languages.ts';
import { localizeCopy } from './localization.ts';
export { LANGUAGES, isLanguage, isRTL, localeFor, searchLanguages, type Language } from './domain/languages.ts';
export { bilingual, localizeCopy, message } from './localization.ts';

const en = {
  brand: 'Quran · Adhan · Qibla',
  quran: 'Quran', adhan: 'Adhan', qibla: 'Qibla',
  adhanBody: 'Use your location to calculate today’s prayer times on your device.',
  locationTitle: 'Your location',
  useLocation: 'Use my location', refreshLocation: 'Refresh my location', locating: 'Finding your location…',
  locationPrivacy: 'Qibla and prayer calculations stay on your device. Device location is reused for six hours; refresh it sooner if you travel.',


  updated: 'Location updated', accuracy: 'Approximate accuracy', meters: 'm',

  latitude: 'Latitude', longitude: 'Longitude',
  example: 'Fill in Riyadh example', exampleNote: 'Example only. Press “Use these coordinates” to apply it.',
  denied: 'Location access was denied. Try again, or choose a city, map point, or coordinates.',
  blocked: 'Location permission is off. Enable it in app settings, then try again.',
  servicesDisabled: 'Turn on location services in your phone’s settings, then try again.',
  timeout: 'Finding your location took too long. Move near a window or outside, then try again.',
  locationError: 'Your location could not be found. Please try again.', openSettings: 'Open app settings',
  invalid: 'Enter a latitude from −90 to 90 and a longitude from −180 to 180.',
  unavailable: 'Install the latest native app build to use the calculations.',
  undefined: 'A direction could not be calculated for this location.',
  direction: 'Clockwise from true north',
  prayerError: 'A complete prayer schedule could not be calculated for this location.',
  phoneTimezone: 'Times use your phone’s timezone',
  verifyTimes: 'Calculated times may differ from your local mosque. Check the calculation method and your phone’s timezone.',
  next: 'Next prayer',
  fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
  settings: 'Settings', method: 'Calculation method',
  ummAlQura: 'Umm al-Qura (Makkah)', muslimWorldLeague: 'Muslim World League',
  northAmerica: 'North America (ISNA)', egyptian: 'Egyptian General Authority',
  karachi: 'University of Islamic Sciences, Karachi', moonsighting: 'Moonsighting Committee',
  asrSchool: 'Asr calculation', standardAsr: 'Standard', hanafiAsr: 'Hanafi',
  ramadan: 'Ramadan: Isha 120 minutes after Maghrib',
  normalIsha: 'Otherwise, Umm al-Qura uses 90 minutes after Maghrib.',
  language: 'Language',
};

const ar: typeof en = {
  brand: 'قرآن · أذان · قبلة',
  quran: 'القرآن', adhan: 'الأذان', qibla: 'القبلة',
  adhanBody: 'استخدم موقعك لحساب مواقيت الصلاة اليوم على جهازك.',
  locationTitle: 'موقعك',
  useLocation: 'استخدم موقعي', refreshLocation: 'حدّث موقعي', locating: 'جارٍ تحديد موقعك…',
  locationPrivacy: 'تبقى حسابات القبلة والمواقيت على جهازك. يُعاد استخدام موقع الجهاز لست ساعات؛ حدّثه قبل ذلك إذا سافرت.',


  updated: 'آخر تحديث للموقع', accuracy: 'الدقة التقريبية', meters: 'م',

  latitude: 'خط العرض', longitude: 'خط الطول',
  example: 'املأ مثال الرياض', exampleNote: 'مثال فقط. اضغط «استخدم هذه الإحداثيات» لتطبيقه.',
  denied: 'لم يُسمح بالوصول إلى الموقع. حاول مجددًا، أو اختر مدينة أو نقطة على الخريطة أو إحداثيات.',
  blocked: 'إذن الموقع غير مفعّل. فعّله من إعدادات التطبيق ثم حاول مجددًا.',
  servicesDisabled: 'فعّل خدمات الموقع من إعدادات هاتفك ثم حاول مجددًا.',
  timeout: 'استغرق تحديد الموقع وقتًا طويلًا. اقترب من نافذة أو اخرج إلى مكان مفتوح ثم حاول مجددًا.',
  locationError: 'تعذّر تحديد موقعك. حاول مجددًا.', openSettings: 'افتح إعدادات التطبيق',
  invalid: 'أدخل خط عرض بين −90 و90 وخط طول بين −180 و180.',
  unavailable: 'ثبّت أحدث نسخة أصلية من التطبيق لاستخدام الحسابات.',
  undefined: 'تعذّر حساب اتجاه لهذا الموقع.',
  direction: 'باتجاه عقارب الساعة من الشمال الحقيقي',
  prayerError: 'تعذّر حساب جدول كامل لمواقيت الصلاة لهذا الموقع.',
  phoneTimezone: 'المواقيت حسب المنطقة الزمنية لهاتفك',
  verifyTimes: 'قد تختلف المواقيت المحسوبة عن مسجدك المحلي. تحقّق من طريقة الحساب والمنطقة الزمنية لهاتفك.',
  next: 'الصلاة القادمة',
  fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
  settings: 'الإعدادات', method: 'طريقة الحساب',
  ummAlQura: 'أم القرى (مكة)', muslimWorldLeague: 'رابطة العالم الإسلامي',
  northAmerica: 'أمريكا الشمالية (إسنا)', egyptian: 'الهيئة المصرية العامة للمساحة',
  karachi: 'جامعة العلوم الإسلامية، كراتشي', moonsighting: 'لجنة رؤية الهلال',
  asrSchool: 'حساب العصر', standardAsr: 'الجمهور', hanafiAsr: 'الحنفي',
  ramadan: 'رمضان: العشاء بعد المغرب بـ١٢٠ دقيقة',
  normalIsha: 'في غير رمضان، تعتمد أم القرى ٩٠ دقيقة بعد المغرب.',
  language: 'اللغة',
};

export const translations = Object.fromEntries(LANGUAGES.map(({ id }) => [id, localizeCopy(id, { ar, en })])) as Record<Language, typeof en>;
