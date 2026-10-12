# Menu and settings languages

Arabic remains the default. The top language icon opens a searchable menu with Arabic, English, and the 33 requested languages. Search accepts English names, native names, and accents; the selection persists locally. Urdu, Persian, Punjabi (Shahmukhi), Pashto, Kurdish (Sorani), and Sindhi join Arabic in using right-to-left controls and reversed tab swipes. Prayer calculations always use Gregorian dates and the phone's timezone.

The new catalogs are machine-assisted draft translations, with structural and target-script checks and manual corrections to prominent Islamic/UI terms. Native-speaker review is pending. No user data or Quran text was sent for translation. Review `src/locales/*.json` against `en.json` and the separate notification messages in `src/notification-i18n.ts`; retain message IDs, placeholders and numeric limits. Proper names and source credits may stay in their original form. Quran/tafsir source text, Arabic surah names and printed pages are unchanged.

Automated tests cover completeness, nonempty values, placeholder integrity, untranslated sentinel detection, language search, Gregorian calendars, RTL swipes and native digit input. These checks do not establish linguistic accuracy. Android visual checks and native iOS testing are recorded separately in the QA document.
