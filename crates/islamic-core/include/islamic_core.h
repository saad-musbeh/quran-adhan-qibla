#ifndef ISLAMIC_CORE_H
#define ISLAMIC_CORE_H

#ifdef __cplusplus
extern "C" {
#endif

/* Degrees clockwise from true north. NaN means no valid unique bearing. */
double islamic_core_qibla_bearing(double latitude, double longitude);

#ifdef __cplusplus
}
#endif

#endif
