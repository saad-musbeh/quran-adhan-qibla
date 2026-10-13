# Interface localization

The app exposes 35 language choices. Arabic copy is authored in the UI source; English supplies stable message IDs in `src/locales/en.json`. Each of the 33 other locale catalogues supplies the same messages, with interpolation placeholders preserved.

New controls, the home menu, downloads, Credits, tafsir controls, country labels, language names and iOS prayer-alert text use the shared catalogue. Text direction decides layout rather than selecting Arabic copy for other RTL languages. Country names in saved city selections update when the interface language changes. City proper names retain their source spelling except available Arabic names.

The 0.4.5 additions use Node 22 ICU/Unicode CLDR for supported country/language display names and Google Translate drafts for missing UI copy. Existing catalogue values are retained. These translations await native-speaker review, especially smaller language/script variants. The sources are acknowledged in Settings → Credits.

The maintenance scripts inspect UI source only. Quran verses, recitations, published tafsir passages, original book/author names and licence notices are not generated, rewritten or translated by this process. The app bundles all interface catalogues and does not send user text to a translation service at runtime.

- `node scripts/localization-audit.mjs` reports uncovered UI strings, catalogue gaps and placeholder mismatches.
- `node scripts/localization-audit.mjs --write-en` appends IDs for newly discovered interface messages without changing existing IDs.
- `node scripts/localization-fill-drafts.mjs` explicitly requests draft translations for missing catalogue entries; it preserves existing translations and uses placeholder/source-name tokens.

After adding UI text, review catalogue additions and their context before publishing. Maintenance automation reports completeness, not translation quality.
