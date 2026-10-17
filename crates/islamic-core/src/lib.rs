//! Offline calculations shared by Android and iOS.
//! Bearings are clockwise from true north, not the phone's magnetic heading.

use std::fmt;

pub mod geomagnetic;
pub mod prayer_times;

// Kaaba reference coordinates also used by the Adhan library.
// https://github.com/batoulapps/adhan-js/blob/master/src/Qibla.ts
pub const KAABA_LATITUDE: f64 = 21.422_524_1;
pub const KAABA_LONGITUDE: f64 = 39.826_181_8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QiblaError {
    InvalidLatitude,
    InvalidLongitude,
    UndefinedDirection,
}

impl fmt::Display for QiblaError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::InvalidLatitude => "Latitude must be finite and between -90 and 90",
            Self::InvalidLongitude => "Longitude must be finite and between -180 and 180",
            Self::UndefinedDirection => "A unique bearing is undefined at this location",
        })
    }
}

impl std::error::Error for QiblaError {}

/// Initial great-circle bearing to the Kaaba on a spherical Earth.
/// Returns degrees in [0, 360). At the poles, Kaaba, or its antipode there
/// is no unique compass direction, so this returns an error.
pub fn qibla_bearing(latitude: f64, longitude: f64) -> Result<f64, QiblaError> {
    if !latitude.is_finite() || !(-90.0..=90.0).contains(&latitude) {
        return Err(QiblaError::InvalidLatitude);
    }
    if !longitude.is_finite() || !(-180.0..=180.0).contains(&longitude) {
        return Err(QiblaError::InvalidLongitude);
    }
    if latitude.abs() == 90.0 {
        return Err(QiblaError::UndefinedDirection);
    }

    let origin_latitude = latitude.to_radians();
    let destination_latitude = KAABA_LATITUDE.to_radians();
    let longitude_delta = (KAABA_LONGITUDE - longitude).to_radians();
    let east = longitude_delta.sin() * destination_latitude.cos();
    let north = origin_latitude.cos() * destination_latitude.sin()
        - origin_latitude.sin() * destination_latitude.cos() * longitude_delta.cos();

    if east.hypot(north) < 1e-12 {
        return Err(QiblaError::UndefinedDirection);
    }
    let bearing = east.atan2(north).to_degrees().rem_euclid(360.0);
    // rem_euclid can round a tiny negative value up to 360.
    Ok(if bearing >= 360.0 { 0.0 } else { bearing })
}

/// Allocation-free C ABI for Swift. NaN signals invalid or singular input.
#[no_mangle]
pub extern "C" fn islamic_core_qibla_bearing(latitude: f64, longitude: f64) -> f64 {
    // Guard the ABI from dependency panics; never unwind through Kotlin or Swift.
    std::panic::catch_unwind(|| qibla_bearing(latitude, longitude).unwrap_or(f64::NAN))
        .unwrap_or(f64::NAN)
}

/// Magnetic declination (degrees, east-positive) from NOAA WMM2025.
/// Returns NaN outside the model's 2025–2029 validity dates, for invalid
/// coordinates/dates, or inside the WMM compass blackout zone.
#[no_mangle]
pub extern "C" fn islamic_core_magnetic_declination(
    latitude: f64,
    longitude: f64,
    year: i32,
    month: i32,
    day: i32,
) -> f64 {
    // Guard the ABI from dependency panics; never unwind through Kotlin or Swift.
    std::panic::catch_unwind(|| {
        geomagnetic::magnetic_declination(latitude, longitude, year, month, day).unwrap_or(f64::NAN)
    })
    .unwrap_or(f64::NAN)
}

/// JNI entry point for the Kotlin Expo module. No JNI object access is needed.
#[cfg(target_os = "android")]
#[no_mangle]
pub extern "system" fn Java_expo_modules_islamiccore_IslamicCoreModule_nativeQiblaBearing(
    _env: *mut std::ffi::c_void,
    _receiver: *mut std::ffi::c_void,
    latitude: f64,
    longitude: f64,
) -> f64 {
    islamic_core_qibla_bearing(latitude, longitude)
}

/// JNI entry point for the Kotlin Expo module. NaN signals no reliable WMM value.
#[cfg(target_os = "android")]
#[no_mangle]
pub extern "system" fn Java_expo_modules_islamiccore_IslamicCoreModule_nativeMagneticDeclination(
    _env: *mut std::ffi::c_void,
    _receiver: *mut std::ffi::c_void,
    latitude: f64,
    longitude: f64,
    year: i32,
    month: i32,
    day: i32,
) -> f64 {
    islamic_core_magnetic_declination(latitude, longitude, year, month, day)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bearings_for_cities_in_different_hemispheres() {
        let cities = [
            (24.7136, 46.6753, 243.8),   // Riyadh
            (51.5074, -0.1278, 119.0),   // London
            (40.7128, -74.0060, 58.5),   // New York
            (-33.8688, 151.2093, 277.5), // Sydney
        ];
        for (latitude, longitude, expected) in cities {
            let actual = qibla_bearing(latitude, longitude).unwrap();
            assert!((actual - expected).abs() < 0.2, "{actual} vs {expected}");
        }
    }

    #[test]
    fn points_on_the_kaaba_meridian_face_north_or_south() {
        assert!(qibla_bearing(0.0, KAABA_LONGITUDE).unwrap().abs() < 1e-10);
        assert!((qibla_bearing(40.0, KAABA_LONGITUDE).unwrap() - 180.0).abs() < 1e-10);
    }

    #[test]
    fn rejects_invalid_coordinates_and_nonfinite_values() {
        for latitude in [-90.1, 90.1, f64::NAN, f64::INFINITY] {
            assert_eq!(
                qibla_bearing(latitude, 0.0),
                Err(QiblaError::InvalidLatitude)
            );
        }
        for longitude in [-180.1, 180.1, f64::NAN, f64::NEG_INFINITY] {
            assert_eq!(
                qibla_bearing(0.0, longitude),
                Err(QiblaError::InvalidLongitude)
            );
        }
    }

    #[test]
    fn rejects_locations_without_a_unique_direction() {
        for (latitude, longitude) in [
            (KAABA_LATITUDE, KAABA_LONGITUDE),
            (-KAABA_LATITUDE, KAABA_LONGITUDE - 180.0),
            (90.0, 0.0),
            (-90.0, 0.0),
        ] {
            assert_eq!(
                qibla_bearing(latitude, longitude),
                Err(QiblaError::UndefinedDirection)
            );
        }
    }

    #[test]
    fn international_date_line_is_continuous_and_results_are_normalized() {
        let west = qibla_bearing(10.0, -180.0).unwrap();
        let east = qibla_bearing(10.0, 180.0).unwrap();
        assert!((west - east).abs() < 1e-10);
        for latitude in [-80.0, -20.0, 0.0, 20.0, 80.0] {
            for longitude in [-180.0, -90.0, 0.0, 90.0, 180.0] {
                assert!((0.0..360.0).contains(&qibla_bearing(latitude, longitude).unwrap()));
            }
        }
    }

    #[test]
    fn c_abi_preserves_results_and_uses_nan_for_errors() {
        assert_eq!(islamic_core_qibla_bearing(40.0, KAABA_LONGITUDE), 180.0);
        assert!(islamic_core_qibla_bearing(91.0, 0.0).is_nan());
        assert!(islamic_core_qibla_bearing(KAABA_LATITUDE, KAABA_LONGITUDE).is_nan());

        // Both guarded entry points keep the mirror-and-NaN contract of the
        // underlying Rust functions after the panic guard is added.
        let bearing = islamic_core_qibla_bearing(-33.8688, 151.2093);
        assert_eq!(bearing, qibla_bearing(-33.8688, 151.2093).unwrap());

        // NOAA WMM2025 official test vector surfaced through the C ABI.
        let declination = islamic_core_magnetic_declination(-80.0, -120.0, 2025, 1, 1);
        assert!((declination - 68.78).abs() < 0.02, "{declination}");
    }

    #[test]
    fn c_abi_reports_nan_for_invalid_geomagnetic_requests() {
        for (latitude, longitude, year, month, day) in [
            (f64::NAN, 0.0, 2026, 1, 1),
            (91.0, 0.0, 2026, 1, 1),
            (0.0, 181.0, 2026, 1, 1),
            (0.0, 0.0, 2024, 12, 31),
            (0.0, 0.0, 2030, 1, 1),
            (0.0, 0.0, 2025, 2, 29),
            (86.0, -135.0, 2026, 1, 1),
        ] {
            assert!(
                islamic_core_magnetic_declination(latitude, longitude, year, month, day).is_nan(),
                "{latitude},{longitude},{year}-{month}-{day}"
            );
        }
        assert!(islamic_core_magnetic_declination(-33.4489, -70.6693, 2026, 6, 21).is_finite());
    }
}
