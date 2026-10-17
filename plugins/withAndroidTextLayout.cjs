const { withMainApplication } = require('expo/config-plugins');

const registration = 'add(0, expo.modules.islamiccore.TextLayoutPackage())';
const anchor = 'PackageList(this).packages.apply {';

module.exports = function withAndroidTextLayout(config) {
  return withMainApplication(config, config => {
    if (config.modResults.language !== 'kt') throw new Error('Text layout correction requires the Kotlin application template');
    const source = config.modResults.contents;
    if (source.includes(registration)) return config;
    if (!source.includes(anchor)) throw new Error('Could not register text layout correction before MainReactPackage');
    config.modResults.contents = source.replace(anchor, `${anchor}\n          ${registration}`);
    return config;
  });
};
