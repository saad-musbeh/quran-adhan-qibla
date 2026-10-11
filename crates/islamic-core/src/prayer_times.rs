//! Prayer times from adhaan 0.3.0 (Adhan / Batoul Apps algorithms).
//! All output is Unix seconds in UTC; the UI formats it in the phone's timezone.

use adhaan::{
    prominent_methods, Coordinates, HighLatitudeRule, Method, Parameters, Prayer, PrayerTimes,
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
        || flags & !0x3f != 0
    {
        return Err(PrayerError::InvalidInput);
    }
    // Do not silently use the engine's nearest-city polar fallback.
    if latitude.abs() >= 65.0 {
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
    let mut parameters =
        Parameters::new(method).with_high_latitude_rule(HighLatitudeRule::MiddleOfTheNight);
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
    fn abi_rejects_bad_inputs_and_polar_locations_without_panicking() {
        for (lat, lon, year, month, day, flags, prayer) in [
            (f64::NAN, 0.0, 2026, 10, 11, 0, 0),
            (0.0, 181.0, 2026, 10, 11, 0, 0),
            (0.0, 0.0, 2026, 2, 30, 0, 0),
            (0.0, 0.0, 9999, 1, 1, 0, 0),
            (69.65, 18.96, 2026, 6, 21, 0, 0),
            (0.0, 0.0, 2026, 10, 11, 6, 0),
            (0.0, 0.0, 2026, 10, 11, 64, 0),
            (0.0, 0.0, 2026, 10, 11, 0, 6),
        ] {
            assert!(islamic_core_prayer_time(lat, lon, year, month, day, flags, prayer).is_nan());
        }
        assert!(islamic_core_prayer_time(24.7136, 46.6753, 2026, 10, 11, 0, 0).is_finite());
    }
}
