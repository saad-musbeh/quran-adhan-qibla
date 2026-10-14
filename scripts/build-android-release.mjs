import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('node', ['scripts/build-native.mjs', 'android']);
run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install']);
const android = path.join(root, 'android');
// Explicitly refresh JSON catalogues as well as code/assets, avoiding a stale
// Hermes bundle from a previous version when Gradle reuses the generated task.
run('./gradlew', [':app:createBundleReleaseJsAndAssets', '--rerun-tasks', '--max-workers=2'], android);
run('./gradlew', [':app:assembleRelease', '-PquranSplitApks=true', '--max-workers=2'], android);
const source = path.join(android, 'app/build/outputs/apk/release');
const destination = path.join(root, 'dist/android');
mkdirSync(destination, { recursive: true });
for (const filename of ['app-arm64-v8a-release.apk', 'app-x86_64-release.apk']) {
  copyFileSync(path.join(source, filename), path.join(destination, filename));
  run('python3', ['scripts/apk-size.py', path.join(destination, filename)]);
  console.log(`APK: ${path.join(destination, filename)}`);
}
// Android's universal split includes every AAR ABI, including 32-bit ones
// without our Rust bridge. A normal build uses React Native's ABI filtering.
run('./gradlew', [':app:assembleRelease', '--max-workers=2'], android);
const universal = path.join(destination, 'app-universal-release.apk');
copyFileSync(path.join(source, 'app-release.apk'), universal);
run('python3', ['scripts/apk-size.py', universal]);
console.log(`APK: ${universal}`);
