const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('gz')) config.resolver.assetExts.push('gz');

module.exports = config;
