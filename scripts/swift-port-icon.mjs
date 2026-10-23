import fs from 'node:fs/promises';
import path from 'node:path';
import { generateImageAsync } from '@expo/image-utils';

// Use the same image utility as the existing mobile build to export the
// configured artwork at Apple's required app-icon dimensions, without redrawing.
export async function swiftPortIcon(root) {
  const { expo } = JSON.parse(await fs.readFile(path.join(root, 'app.json'), 'utf8'));
  const source = expo.ios?.icon ?? expo.icon;
  if (typeof source !== 'string') throw new Error('No configured iOS launcher icon');
  const { source: png } = await generateImageAsync(
    { projectRoot: root, cacheType: 'swift-ios-icon' },
    { src: path.resolve(root, source), width: 1024, height: 1024, resizeMode: 'contain', removeTransparency: true, backgroundColor: '#17382B' },
  );
  return { png, source };
}
