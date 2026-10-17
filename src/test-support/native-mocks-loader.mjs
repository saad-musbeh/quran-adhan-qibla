import { fileURLToPath } from 'node:url';

const stubRoot = new URL('./stubs/', import.meta.url);
const stub = name => JSON.stringify(new URL(name, stubRoot).href);
const islamicCoreFileUrl = 'file://' + fileURLToPath(new URL('../../modules/islamic-core/index.ts', import.meta.url));

const payload = {
  'expo': `import * as stub from ${stub('expo.ts')};\nexport default stub;\nexport * from ${stub('expo.ts')};\n`,
  'expo-modules-core': `import * as stub from ${stub('expo.ts')};\nexport default stub;\nexport * from ${stub('expo.ts')};\n`,
  'react-native': `export * from ${stub('react-native.ts')};\n`,
  'expo-location': `export * from ${stub('expo-location.ts')};\n`,
  'expo-constants': `import defaults from ${stub('expo-constants.ts')};\nexport default defaults;\nexport const expoConfig = defaults.expoConfig;\n`,
  'expo-intent-launcher': `export * from ${stub('expo-intent-launcher.ts')};\n`,
  'expo-notifications': `export * from ${stub('expo-notifications.ts')};\n`,
};

const fakePackages = new Set([
  'expo', 'expo-modules-core', 'react-native', 'expo-location',
  'expo-constants', 'expo-intent-launcher', 'expo-notifications',
]);

function fakeSource(url) {
  if (url === islamicCoreFileUrl) {
    return `export * from ${stub('islamic-core.ts')};\n`;
  }
  if (!url.includes('/node_modules/')) return null;
  const after = url.split('/node_modules/')[1];
  const segments = after.split('/');
  const name = segments[0].startsWith('@') && segments[1] ? `${segments[0]}/${segments[1]}` : segments[0];
  if (!fakePackages.has(name)) return null;
  return payload[name] ?? null;
}

export async function load(url, context, nextLoad) {
  const source = fakeSource(url);
  if (source) return { format: 'module', source, shortCircuit: true };
  return nextLoad(url, context);
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (first) {
    if ((first?.code === 'ERR_MODULE_NOT_FOUND' || first?.code === 'ERR_UNSUPPORTED_RESOLVE_REQUEST')
      && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(new URL(specifier, 'file:///').pathname)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    if (first?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      return nextResolve(`${specifier}/index.ts`, context);
    }
    throw first;
  }
}
