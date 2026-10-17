//! Prayer times from adhaan 0.3.0 (Adhan / Batoul Apps algorithms).
//! All output is Unix seconds in UTC; the UI formats it in the phone's timezone.

use adhaan::{
    prominent_methods, Coordinates, HighLatitudeRule, Method, Parameters, PolarCircleResolver,
    Prayer, PrayerTimes,
};
use jiff::civil::Date;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrayerError {
    InvalidInput,
    UnsupportedLocation,
    CalculationFailed,
}

/// Flags: low nibble = method (0 Umm al-Qura, 1 MWL, 2 ISNA, 3 Egyptian,
/// 4 Karachi, 5 Moonsighting Committee); bit 4 = Hanafi Asr; bit 5 = Ramadan.
/// Bits 6–7 = twilight rule (0 middle, 1 seventh, 2 angle; 3 invalid).
/// Bit 8 = explicitly allow nearest-usable-latitude polar approximation.
/// Returned order: Fajr, sunrise, Dhuhr, Asr, Maghrib, Isha.
pub fn prayer_times(
    latitude: f64,
    longitude: f64,
    date: Date,
    flags: u32,
) -> Result<[i64; 6], PrayerError> {
    if !latitude.is_finite()
        || latitude.abs() > 90.0
        || !longitude.is_finite()
        || longitude.abs() > 180.0
        || !(1900..=2100).contains(&date.year())
        || flags & !0x1ff != 0
        || flags & 0xc0 == 0xc0
    {
        return Err(PrayerError::InvalidInput);
    }
    // Do not silently use the engine's nearest-city polar fallback.
    if latitude.abs() >= 65.0 && flags & 0x100 == 0 {
        return Err(PrayerError::UnsupportedLocation);
    }
    let method: &'static dyn Method = match flags & 0xf {
        0 => &prominent_methods::UmmAlQura,
        1 => &prominent_methods::MuslimWorldLeague,
        2 => &prominent_methods::NorthAmerica,
        3 => &prominent_methods::Egyptian,
        4 => &prominent_methods::Karachi,
        5 => &prominent_methods::MOONSIGHTING_COMMITTEE,
        _ => return Err(PrayerError::InvalidInput),
    };
    let coordinates = Coordinates {
        latitude,
        longitude,
    };
    let rule = match flags & 0xc0 {
        0x40 => HighLatitudeRule::SeventhOfTheNight,
        0x80 => HighLatitudeRule::TwilightAngle,
        _ => HighLatitudeRule::MiddleOfTheNight,
    };
    // adhaan keeps the original longitude/date and steps latitude towards the
    // equator only when sunrise/sunset cannot be calculated. Never opt in silently.
    let mut parameters = Parameters::new(method)
        .with_high_latitude_rule(rule)
        .with_polar_circle_resolver(PolarCircleResolver::NearestCity);
    if flags & 0xf == 0 && flags & 0x20 != 0 {
        parameters.isha_interval = Some(120);
    }
    let schedule = PrayerTimes::calculate(date, coordinates, parameters)
        .map_err(|_| PrayerError::CalculationFailed)?;
    let asr = if flags & 0x10 != 0 {
        Prayer::AsrThaani
    } else {
        Prayer::AsrAwwal
    };
    let prayers = [
        Prayer::Fajr,
        Prayer::Sunrise,
        Prayer::Dhuhr,
        asr,
        Prayer::Maghrib,
        Prayer::Isha,
    ];
    let result = prayers.map(|prayer| schedule.time_of(prayer).timestamp().as_second());
    if !result.windows(2).all(|pair| pair[0] < pair[1]) {
        return Err(PrayerError::CalculationFailed);
    }
    Ok(result)
}

/// C ABI shared by Swift and the primitive-only JNI wrapper. NaN signals error.
#[no_mangle]
pub extern "C" fn islamic_core_prayer_time(
    latitude: f64,
    longitude: f64,
    year: i32,
    month: i32,
    day: i32,
    flags: i32,
    prayer: i32,
) -> f64 {
    if !(1900..=2100).contains(&year)
        || !(1..=12).contains(&month)
        || !(1..=31).contains(&day)
        || !(0..6).contains(&prayer)
        || flags < 0
    {
        return f64::NAN;
    }
    let Ok(date) = Date::new(year as i16, month as i8, day as i8) else {
        return f64::NAN;
    };
    // Guard the ABI from dependency panics; never unwind through Kotlin or Swift.
    std::panic::catch_unwind(|| prayer_times(latitude, longitude, date, flags as u32))
        .ok()
        .and_then(Result::ok)
        .map(|times| times[prayer as usize] as f64)
        .unwrap_or(f64::NAN)
}

#[cfg(target_os = "android")]
#[no_mangle]
#[allow(clippy::too_many_arguments)]
pub extern "system" fn Java_expo_modules_islamiccore_IslamicCoreModule_nativePrayerTime(
    _env: *mut std::ffi::c_void,
    _receiver: *mut std::ffi::c_void,
    latitude: f64,
    longitude: f64,
    year: i32,
    month: i32,
    day: i32,
    flags: i32,
    prayer: i32,
) -> f64 {
    islamic_core_prayer_time(latitude, longitude, year, month, day, flags, prayer)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn makkah_matches_adhan_reference_schedule() {
        // Batoul Apps / adhaan reference fixture: Makkah, 2016-01-05.
        let date = Date::new(2016, 1, 5).unwrap();
        let actual = prayer_times(21.427009, 39.828685, date, 0).unwrap();
        let expected = [(5, 38), (7, 0), (12, 26), (15, 31), (17, 52), (19, 22)];
        for (timestamp, (hour, minute)) in actual.into_iter().zip(expected) {
            let reference = date
                .at(hour - 3, minute, 0, 0)
                .in_tz("UTC")
                .unwrap()
                .timestamp()
                .as_second();
            assert!((timestamp - reference).abs() <= 120);
        }
    }

    #[test]
    fn london_matches_adhan_reference_schedule() {
        // Moonsighting Committee + Hanafi reference fixture, 2016-01-01, UTC.
        let date = Date::new(2016, 1, 1).unwrap();
        let actual = prayer_times(51.507194, -0.116711, date, 5 | 0x10).unwrap();
        let expected = [(6, 25), (8, 6), (12, 9), (14, 15), (16, 5), (17, 38)];
        for (timestamp, (hour, minute)) in actual.into_iter().zip(expected) {
            let reference = date
                .at(hour, minute, 0, 0)
                .in_tz("UTC")
                .unwrap()
                .timestamp()
                .as_second();
            assert!((timestamp - reference).abs() <= 120);
        }
    }

    #[test]
    fn sydney_southern_hemisphere_reference_covers_both_dst_states() {
        // Independent MWL (18/17) + Shafi reference for the southern hemisphere,
        // hand-verified with a NOAA/Meeus solar calculation. Fajr coincides with
        // the reported fixture values: 05:30 AEST 2026-06-21, 03:56 AEDT 2026-12-21.
        let check = |date: Date, expected: [(i8, i8); 6]| {
            let actual = prayer_times(-33.8688, 151.2093, date, 1).unwrap();
            for (timestamp, (hour, minute)) in actual.into_iter().zip(expected) {
                let reference = date
                    .at(hour, minute, 0, 0)
                    .in_tz("Australia/Sydney")
                    .unwrap()
                    .timestamp()
                    .as_second();
                assert!(
                    (timestamp - reference).abs() <= 120,
                    "{date} {timestamp} vs {reference}"
                );
            }
        };
        // Winter solstice in standard time (AEST, UTC+10).
        check(
            Date::new(2026, 6, 21).unwrap(),
            [(5, 30), (7, 0), (11, 57), (14, 36), (16, 54), (18, 18)],
        );
        // Summer solstice in daylight time (AEDT, UTC+11).
        check(
            Date::new(2026, 12, 21).unwrap(),
            [(3, 56), (5, 41), (12, 53), (16, 38), (20, 5), (21, 43)],
        );
    }

    #[test]
    fn santiago_dst_transition_moves_local_clocks_but_not_solar_utc() {
        // Chile begins DST on the night of 2025-09-06 (America/Santiago moves
        // from UTC-4 to UTC-3). Fixtures on either side pin the local schedule,
        // while the UTC instant of Dhuhr is unchanged by the clock change.
        let check = |date: Date, expected: [(i8, i8); 6]| {
            let actual = prayer_times(-33.4489, -70.6693, date, 1).unwrap();
            for (timestamp, (hour, minute)) in actual.into_iter().zip(expected) {
                let reference = date
                    .at(hour, minute, 0, 0)
                    .in_tz("America/Santiago")
                    .unwrap()
                    .timestamp()
                    .as_second();
                assert!(
                    (timestamp - reference).abs() <= 120,
                    "{date} {timestamp} vs {reference}"
                );
            }
        };
        check(
            Date::new(2025, 9, 6).unwrap(),
            [(5, 32), (6, 54), (12, 41), (15, 59), (18, 28), (19, 46)],
        );
        check(
            Date::new(2025, 9, 7).unwrap(),
            [(6, 30), (7, 53), (13, 41), (16, 59), (19, 29), (20, 46)],
        );

        let before = prayer_times(-33.4489, -70.6693, Date::new(2025, 9, 6).unwrap(), 1).unwrap();
        let after = prayer_times(-33.4489, -70.6693, Date::new(2025, 9, 7).unwrap(), 1).unwrap();
        // The DST change is a display offset only: consecutive civil dates must
        // stay one solar day (86400 s) apart in UTC, never an hour off.
        for index in 0..6 {
            let delta = after[index] - before[index];
            assert!(
                (delta - 86_400).abs() <= 300,
                "UTC day delta at index {index} was {delta}s, not one solar day"
            );
        }
    }

    #[test]
    fn london_summer_reference_uses_dst_and_seasonal_twilight() {
        // The same published London fixture in British Summer Time (UTC+1).
        let date = Date::new(2016, 6, 1).unwrap();
        let actual = prayer_times(51.507194, -0.116711, date, 5 | 0x10).unwrap();
        let expected = [(2, 55), (4, 49), (13, 3), (18, 31), (21, 12), (22, 23)];
        for (timestamp, (hour, minute)) in actual.into_iter().zip(expected) {
            let reference = date
                .at(hour, minute, 0, 0)
                .in_tz("Europe/London")
                .unwrap()
                .timestamp()
                .as_second();
            assert!((timestamp - reference).abs() <= 120);
        }
    }

    #[test]
    fn asr_school_and_ramadan_only_adjust_the_expected_prayers() {
        let date = Date::new(2026, 3, 1).unwrap();
        let standard = prayer_times(24.7136, 46.6753, date, 0).unwrap();
        let hanafi = prayer_times(24.7136, 46.6753, date, 0x10).unwrap();
        let ramadan = prayer_times(24.7136, 46.6753, date, 0x20).unwrap();
        assert!(hanafi[3] > standard[3]);
        assert_eq!(ramadan[5] - standard[5], 30 * 60);
        for index in [0, 1, 2, 4] {
            assert_eq!(hanafi[index], standard[index]);
        }
        assert_eq!(ramadan[..5], standard[..5]);
    }

    #[test]
    fn stockholm_missing_twilight_obeys_selected_night_portions() {
        let date = Date::new(2026, 6, 21).unwrap();
        let latitude = 59.3293;
        let longitude = 18.0686;
        for (rule, fajr_fraction, isha_fraction) in [
            (0, 0.5, 0.5),
            (0x40, 1.0 / 7.0, 1.0 / 7.0),
            (0x80, 18.0 / 60.0, 17.0 / 60.0),
        ] {
            let times = prayer_times(latitude, longitude, date, 1 | rule).unwrap();
            let yesterday =
                prayer_times(latitude, longitude, date.yesterday().unwrap(), 1).unwrap();
            let tomorrow = prayer_times(latitude, longitude, date.tomorrow().unwrap(), 1).unwrap();
            let expected_fajr = times[1] as f64 - (times[1] - yesterday[4]) as f64 * fajr_fraction;
            let expected_isha = times[4] as f64 + (tomorrow[1] - times[4]) as f64 * isha_fraction;
            assert!((times[0] as f64 - expected_fajr).abs() <= 90.0);
            assert!((times[5] as f64 - expected_isha).abs() <= 90.0);
        }
        let middle = prayer_times(latitude, longitude, date, 1).unwrap();
        let seventh = prayer_times(latitude, longitude, date, 1 | 0x40).unwrap();
        assert!(seventh[0] > middle[0]);
        assert!(seventh[5] < middle[5]);
        assert_eq!(seventh[1..5], middle[1..5]);
    }

    #[test]
    fn polar_approximation_is_opt_in_and_returns_requested_solar_day() {
        for (latitude, longitude, date) in [
            (69.6492, 18.9553, Date::new(2026, 6, 21).unwrap()),
            (69.6492, 18.9553, Date::new(2026, 12, 21).unwrap()),
            (-77.8419, 166.6863, Date::new(2026, 12, 21).unwrap()),
            (90.0, 0.0, Date::new(2026, 6, 21).unwrap()),
            (-90.0, 0.0, Date::new(2026, 12, 21).unwrap()),
        ] {
            assert_eq!(
                prayer_times(latitude, longitude, date, 1),
                Err(PrayerError::UnsupportedLocation)
            );
            for rule in [0, 0x40, 0x80] {
                let times = prayer_times(latitude, longitude, date, 1 | 0x100 | rule).unwrap();
                assert!(times.windows(2).all(|pair| pair[0] < pair[1]));
                // Solar noon remains near 12:00 at this longitude on the requested
                // date, rather than borrowing timestamps from another season/day.
                let noon = date
                    .at(12, 0, 0, 0)
                    .in_tz("UTC")
                    .unwrap()
                    .timestamp()
                    .as_second();
                let solar_noon = noon as f64 - longitude * 240.0;
                assert!((times[2] as f64 - solar_noon).abs() < 30.0 * 60.0);
                for (index, &time) in times.iter().enumerate() {
                    assert_eq!(
                        islamic_core_prayer_time(
                            latitude,
                            longitude,
                            date.year().into(),
                            date.month().into(),
                            date.day().into(),
                            1 | 0x100 | rule as i32,
                            index as i32
                        ),
                        time as f64
                    );
                }
            }
        }
    }

    #[test]
    fn new_rules_preserve_low_latitude_times_and_fixed_isha_interval() {
        let date = Date::new(2026, 3, 1).unwrap();
        let original = prayer_times(24.7136, 46.6753, date, 0).unwrap();
        for rule in [0x40, 0x80] {
            assert_eq!(
                prayer_times(24.7136, 46.6753, date, rule).unwrap(),
                original
            );
            let ramadan = prayer_times(
                59.3293,
                18.0686,
                Date::new(2026, 6, 21).unwrap(),
                rule | 0x20,
            )
            .unwrap();
            assert_eq!(ramadan[5] - ramadan[4], 120 * 60);
        }
    }

    #[test]
    fn abi_rejects_bad_inputs_and_polar_locations_without_panicking() {
        for (lat, lon, year, month, day, flags, prayer) in [
            (f64::NAN, 0.0, 2026, 10, 11, 0, 0),
            (0.0, 181.0, 2026, 10, 11, 0, 0),
            (0.0, 0.0, 2026, 2, 30, 0, 0),
            (0.0, 0.0, 9999, 1, 1, 0, 0),
            (69.65, 18.96, 2026, 6, 21, 0, 0),
            (0.0, 0.0, 2026, 10, 11, 6, 0),
            (0.0, 0.0, 2026, 10, 11, 0xc0, 0),
            (0.0, 0.0, 2026, 10, 11, 0x200, 0),
            (0.0, 0.0, 2026, 10, 11, 0, 6),
        ] {
            assert!(islamic_core_prayer_time(lat, lon, year, month, day, flags, prayer).is_nan());
        }
        assert!(islamic_core_prayer_time(24.7136, 46.6753, 2026, 10, 11, 0, 0).is_finite());
    }
}
