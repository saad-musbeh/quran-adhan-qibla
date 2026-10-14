const { withAppBuildGradle } = require('expo/config-plugins');

const marker = '// Quran Adhan Qibla: architecture APKs';
const endMarker = '// End Quran Adhan Qibla: architecture APKs';
const splits = `
${marker}
android {
    splits {
        abi {
            enable = (findProperty('quranSplitApks') ?: 'false').toBoolean()
            reset()
            include(*(findProperty('reactNativeArchitectures') ?: 'arm64-v8a,x86_64').split(','))
            universalApk false
        }
    }
}
${endMarker}
`;

module.exports = function withAndroidReleaseSize(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') throw new Error('APK splits require the Expo Groovy build template');
    let source = config.modResults.contents;
    const start = source.indexOf(marker);
    if (start !== -1) {
      const end = source.indexOf(endMarker, start);
      if (end === -1) throw new Error('APK split configuration has no end marker');
      source = source.slice(0, start) + source.slice(end + endMarker.length);
    }
    // R8's optimizing default preserves consumer JNI keep rules while removing
    // unreachable release code. Expo's template otherwise uses -dontoptimize.
    source = source.replace('getDefaultProguardFile("proguard-android.txt")', 'getDefaultProguardFile("proguard-android-optimize.txt")');
    config.modResults.contents = source + '\n' + splits;
    return config;
  });
};
