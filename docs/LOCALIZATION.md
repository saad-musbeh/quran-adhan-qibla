# Interface localization

The app exposes 40 language choices. Arabic copy is authored in the UI source; English supplies stable message IDs in `src/locales/en.json`. Each of the 38 other locale catalogues supplies the same messages, with interpolation placeholders preserved.

New controls, the home menu, downloads, Credits, tafsir controls, country labels, language names and iOS prayer-alert text use the shared catalogue. Text direction decides layout rather than selecting Arabic copy for other RTL languages. Country names in saved city selections update when the interface language changes. City proper names retain their source spelling except available Arabic names.

New appearance, next-Adhan, Add Quran and silent-notification labels, plus the expanded country names, follow the same catalogue workflow. The 0.4.5 additions use Node 22 ICU/Unicode CLDR for supported country/language display names and Google Translate drafts for missing UI copy. Existing catalogue values are retained. These translations await native-speaker review, especially smaller language/script variants. The sources are acknowledged in Settings → Credits.

The maintenance scripts inspect UI source only. Quran verses, recitations, published tafsir passages, original book/author names and licence notices are not generated, rewritten or translated by this process. The app bundles all interface catalogues and does not send user text to a translation service at runtime.

- `node scripts/localization-audit.mjs` reports uncovered UI strings, catalogue gaps and placeholder mismatches.
- `node scripts/localization-audit.mjs --write-en` appends IDs for newly discovered interface messages without changing existing IDs.
- `node scripts/localization-fill-drafts.mjs` explicitly requests draft translations for missing catalogue entries; it preserves existing translations and uses placeholder/source-name tokens.

After adding UI text, review catalogue additions and their context before publishing. Maintenance automation reports completeness, not translation quality.

## Additional language drafts

Saraiki (`skr`, Arabic script), Oromo (`om`, Latin), Northern Kurdish/Kurmanji (`ku`, Latin), Uyghur (`ug`, Arabic script) and Wolof (`wo`, Latin) have complete bundled interface and prayer-notification catalogues. Saraiki and Uyghur use RTL layout; Kurmanji remains separate from Sorani. Language search includes English, native and localized names.

The Oromo, Kurmanji, Uyghur and Wolof catalogues use the existing Google Translate/ICU maintenance workflow, with AI-assisted corrections for untranslated short labels. Saraiki is an AI-authored draft because that translation provider does not support it. Its country/language proper names share the existing regional Arabic-script spellings from the Urdu catalogue; its interface sentences are maintained separately. The maintenance script skips Saraiki rather than substituting another language; the audit still checks its coverage and placeholders. All five need native-speaker review.

Current ICU runtimes may lack Saraiki date/number data. In that case formatting uses the regional Urdu locale with an explicitly Gregorian calendar; interface copy remains Saraiki. Quran verses, tafsir content and reciter names are unchanged.
