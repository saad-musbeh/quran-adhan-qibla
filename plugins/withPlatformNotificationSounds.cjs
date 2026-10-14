const { createRunOncePlugin, withDangerousMod } = require('expo/config-plugins');
const { withNotificationsAndroid } = require('expo-notifications/plugin/build/withNotificationsAndroid');
const { withNotificationsIOS } = require('expo-notifications/plugin/build/withNotificationsIOS');
const { mkdirSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// Keep the official Expo permission, icon, channel and Xcode mods, but only
// package the recordings that the corresponding platform actually plays.
function withPlatformNotificationSounds(config, props) {
  const sounds = props.sounds ?? [];
  config = withNotificationsAndroid(config, { ...props, sounds: sounds.filter(sound => sound.endsWith('.ogg')) });
  config = withNotificationsIOS(config, { ...props, sounds: sounds.filter(sound => sound.endsWith('.wav')) });
  // Prebuild can reuse a project generated before this filter existed. Remove
  // only our known iOS excerpts from Android, leaving signing and other files.
  return withDangerousMod(config, ['android', config => {
    const raw = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/raw');
    mkdirSync(raw, { recursive: true });
    for (const sound of sounds.filter(sound => sound.endsWith('.wav'))) {
      rmSync(path.join(raw, path.basename(sound)), { force: true });
    }
    // Expo resolves sound names dynamically from persisted notification channel
    // settings. R8 cannot discover those references in Kotlin/Java bytecode.
    const resources = sounds.filter(sound => sound.endsWith('.ogg')).map(sound => '@raw/' + path.basename(sound, '.ogg'));
    writeFileSync(path.join(raw, 'quran_adhan_keep.xml'), `<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="${resources.join(',')}" />\n`);
    return config;
  }]);
}

module.exports = createRunOncePlugin(withPlatformNotificationSounds, 'expo-notifications', require('expo-notifications/package.json').version);
