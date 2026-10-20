import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const targetDir = path.resolve(root, process.env.CARGO_TARGET_DIR ?? 'target');
const platform = process.argv[2];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) {
    console.error(`Could not run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (platform === 'android') {
  run('cargo', ['ndk', '-t', 'arm64-v8a', '-t', 'x86_64', '--platform', '24',
    '-o', path.join(root, 'modules/islamic-core/android/src/main/jniLibs'),
    'build', '--release', '--locked', '-p', 'islamic-core', '--target-dir', targetDir]);
} else if (platform === 'ios') {
  if (process.platform !== 'darwin') {
    console.error('Building iOS needs macOS and Xcode. You can run the Rust tests on any host.');
    process.exit(1);
  }
  for (const target of ['aarch64-apple-ios', 'aarch64-apple-ios-sim', 'x86_64-apple-ios']) {
    run('cargo', ['build', '--release', '--locked', '-p', 'islamic-core',
      '--target', target, '--target-dir', targetDir]);
  }
  const simulatorDir = path.join(targetDir, 'ios-simulator');
  mkdirSync(simulatorDir, { recursive: true });
  const simulatorLibrary = path.join(simulatorDir, 'libislamic_core.a');
  run('xcrun', ['lipo', '-create',
    path.join(targetDir, 'aarch64-apple-ios-sim/release/libislamic_core.a'),
    path.join(targetDir, 'x86_64-apple-ios/release/libislamic_core.a'),
    '-output', simulatorLibrary]);

  const output = path.join(root, 'modules/islamic-core/ios/Frameworks/IslamicCoreFFI.xcframework');
  mkdirSync(path.dirname(output), { recursive: true });
  rmSync(output, { recursive: true, force: true });
  const headers = path.join(root, 'crates/islamic-core/include');
  run('xcodebuild', ['-create-xcframework',
    '-library', path.join(targetDir, 'aarch64-apple-ios/release/libislamic_core.a'), '-headers', headers,
    '-library', simulatorLibrary, '-headers', headers, '-output', output]);
} else {
  console.error('Usage: node scripts/build-native.mjs android|ios');
  process.exit(1);
}
