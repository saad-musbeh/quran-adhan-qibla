//! NOAA World Magnetic Model declination for correcting magnetic compass data.
//!
//! The selected location is supplied by the caller; this calculation never
//! requests or watches location. WMM2025 is strictly limited to calendar years
//! 2025–2029. Declination is east-positive, so true heading = magnetic heading
//! + declination, normalized to [0, 360).

use world_magnetic_model::{
    time::{Date, Month},
    uom::si::{angle::degree, f32::Angle, f32::Length, length::meter},
    GeomagneticField, WarningZone,
};

pub fn magnetic_declination(
    latitude: f64,
    longitude: f64,
    year: i32,
    month: i32,
    day: i32,
) -> Option<f64> {
    if !latitude.is_finite()
        || !(-90.0..=90.0).contains(&latitude)
        || !longitude.is_finite()
        || !(-180.0..=180.0).contains(&longitude)
        || !(2025..2030).contains(&year)
    {
        return None;
    }

    let month = Month::try_from(u8::try_from(month).ok()?).ok()?;
    let date = Date::from_calendar_date(year, month, u8::try_from(day).ok()?).ok()?;
    let field = GeomagneticField::new(
        Length::new::<meter>(0.0),
        Angle::new::<degree>(latitude as f32),
        Angle::new::<degree>(longitude as f32),
        date,
    )
    .ok()?;

    if field.declination_warning() == Some(WarningZone::BlackoutZone) {
        return None;
    }
    let declination = f64::from(field.declination().get::<degree>());
    declination.is_finite().then_some(declination)
}

#[cfg(test)]
mod tests {
    use super::*;

    // NOAA WMM2025 official test vectors, 0 km WGS84 ellipsoid height.
    #[test]
    fn matches_noaa_wmm2025_reference_declinations() {
        let cases = [
            ((2025, 1, 1), 80.0, 0.0, 1.28),
            ((2025, 1, 1), 0.0, 120.0, -0.16),
            ((2025, 1, 1), -80.0, -120.0, 68.78),
            ((2027, 7, 2), 80.0, 0.0, 2.59),
            ((2027, 7, 2), 0.0, 120.0, -0.24),
            ((2027, 7, 2), -80.0, -120.0, 68.49),
        ];
        for ((year, month, day), latitude, longitude, expected) in cases {
            let actual = magnetic_declination(latitude, longitude, year, month, day).unwrap();
            assert!((actual - expected).abs() < 0.02, "{actual} vs {expected}");
        }
    }

    #[test]
    fn rejects_dates_outside_wmm2025_validity_and_invalid_input() {
        for (year, month, day) in [(2024, 12, 31), (2030, 1, 1), (2025, 2, 29), (2025, 13, 1)] {
            assert_eq!(magnetic_declination(24.7, 46.7, year, month, day), None);
        }
        assert_eq!(magnetic_declination(f64::NAN, 0.0, 2026, 1, 1), None);
        assert_eq!(magnetic_declination(91.0, 0.0, 2026, 1, 1), None);
        assert_eq!(magnetic_declination(0.0, 181.0, 2026, 1, 1), None);
    }

    #[test]
    fn returns_none_in_wmm_compass_blackout_zone() {
        assert_eq!(magnetic_declination(86.0, -135.0, 2026, 1, 1), None);
    }
}
