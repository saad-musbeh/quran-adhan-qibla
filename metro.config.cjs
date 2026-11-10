const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Shared core files use explicit .ts imports for Node. Select the native
// catalogue loader without eagerly evaluating every testing language.
const upstreamResolve=config.resolver.resolveRequest;
config.resolver.resolveRequest=(context,name,platform)=>{
  if((platform==='android'||platform==='ios')&&/(^|\/)localization\.ts$/.test(name))name=name.slice(0,-3)+'.native.ts';
  return upstreamResolve?upstreamResolve(context,name,platform):context.resolveRequest(context,name,platform);
};
for (const extension of ['gz', 'zst', 'ogg', 'db']) {
  if (!config.resolver.assetExts.includes(extension)) config.resolver.assetExts.push(extension);
}

module.exports = config;
