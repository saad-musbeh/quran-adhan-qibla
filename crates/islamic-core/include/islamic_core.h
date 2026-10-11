#ifndef ISLAMIC_CORE_H
#define ISLAMIC_CORE_H

#ifdef __cplusplus
extern "C" {
#endif

/* Degrees clockwise from true north. NaN means no valid unique bearing. */
double islamic_core_qibla_bearing(double latitude, double longitude);

/* UTC Unix seconds, NaN on error. Prayer order: Fajr, sunrise, Dhuhr, Asr,
 * Maghrib, Isha. Flags: method 0..5, 0x10 Hanafi Asr, 0x20 Ramadan Isha. */
double islamic_core_prayer_time(double latitude, double longitude, int year,
                              int month, int day, int flags, int prayer);

#ifdef __cplusplus
}
#endif

#endif
