const { withAndroidManifest, createRunOncePlugin } = require('expo/config-plugins');
const pkg = require('../package.json');

function withPrayerExactAlarm(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    if (!permissions.some(item => item.$?.['android:name'] === 'android.permission.SCHEDULE_EXACT_ALARM')) {
      permissions.push({ $: { 'android:name': 'android.permission.SCHEDULE_EXACT_ALARM' } });
    }
    manifest['uses-permission'] = permissions;
    return config;
  });
}

module.exports = createRunOncePlugin(withPrayerExactAlarm, 'with-prayer-exact-alarm', pkg.version);
