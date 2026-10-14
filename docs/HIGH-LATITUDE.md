# High-latitude prayer calculation

**Settings → Prayer times → High-latitude twilight** selects one of the `adhaan` 0.3.0 engine’s existing rules:

- **Middle of the night:** limits Fajr/Isha to half the night. This preserves existing saved preferences.
- **One seventh of the night:** uses the final seventh before sunrise for the Fajr limit and the first seventh after sunset for Isha.
- **Twilight angle:** uses each prayer’s selected method angle divided by 60 as its night fraction.

These rules limit twilight calculations; they do not replace valid solar observations wholesale. Fixed Isha intervals (90/120 minutes for Umm al-Qura) and Moonsighting Committee’s seasonal/seventh-night logic keep their method-specific behavior. The selected rule is displayed on Adhan at |latitude| ≥ 48° and applies to today, tomorrow and all locally scheduled alerts. Settings changes reconcile existing alerts.

## Polar day/night

At |latitude| ≥ 65°, **No approximation** retains the previous explicit unsupported result. Users may opt into **Nearest usable latitude**. The engine first tries the chosen location; if sunrise/sunset on the requested day and its neighboring dates cannot be calculated, it searches towards the equator in 0.5° steps, keeping the original longitude and requested Gregorian date. This is a reference latitude, not a catalogue city. Both hemispheres are supported. The Adhan screen visibly labels polar approximation as enabled; it does not represent these estimates as actual local sunrise/sunset observations. Confirm the rule with the timetable agreed by the local mosque. Failed or non-monotonic schedules still produce an error and do not schedule stale alerts.

The nearest-day resolver is not offered: the pinned engine resolves solar objects on a different date without rebasing their timestamps to the requested day. The app avoids using that path for date-specific countdowns or alerts.

## Bridge and migration

The existing C/JNI/Swift/Kotlin function signatures and names are preserved. Flags retain method bits 0–3, Hanafi bit 4 and Ramadan bit 5; bits 6–7 select middle (`0`), seventh (`0x40`) or angle (`0x80`), and bit 8 (`0x100`) explicitly permits polar approximation. `0xc0` and unknown bits are rejected. Old saved settings normalize to middle/night and no polar approximation. New settings are persisted under the existing preference key.

## Validation

- Existing published Makkah and London winter/summer fixtures still pass.
- Stockholm summer tests independently verify the three night fractions against preceding sunset/following sunrise and confirm only Fajr/Isha change.
- Tromsø summer/winter, McMurdo summer and both geographic poles produce complete, ordered estimates only with opt-in; solar noon stays on the requested solar day/longitude. Every returned prayer is checked through the C ABI.
- Low-latitude schedules, Hanafi behavior and Umm al-Qura’s Ramadan interval remain covered. Invalid flags, dates, coordinates and missing schedules remain rejected.

These are calculation and behavior checks, not certification of a mosque timetable. Native device validation for this new revision is recorded separately from the user-reported 0.5.1 checks.

References: [Adhan calculation parameter guide](https://github.com/batoulapps/adhan-js/blob/develop/METHODS.md), [pinned adhaan parameters](https://github.com/RagibHasin/adhaan/blob/v0.3.0/src/models/parameters.rs), [pinned polar resolver](https://github.com/RagibHasin/adhaan/blob/v0.3.0/src/models/polar_circle_resolution.rs).
