import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// Temporary fixes for GHSA-vfj7-8cjw-p6xm and GHSA-86w9-cpqp-85rv.
// Keep registry versions intact so npm audit still reports the upstream advisories.
// See docs/DEPENDENCY-SECURITY.md for provenance and removal conditions.
const depthCheck = "    if (depth > 128) {\n      throw new RangeError('braces nesting exceeds security limit (128)');\n    }\n";
const parseCheck = "      if (stack.length > 128) {\n        throw new RangeError('braces nesting exceeds security limit (128)');\n      }\n";
const patches = [
  {
    package: 'braces', version: '3.0.3', file: 'lib/parse.js', hash: 'e572166565f15fa6ad9865ae49d678218e32aabfd1b3720f6d0d43d39800d310',
    replacements: [
      ["    if (value === CHAR_LEFT_PARENTHESES) {\n", "    if (value === CHAR_LEFT_PARENTHESES) {\n" + parseCheck],
      ["    if (value === CHAR_LEFT_CURLY_BRACE) {\n", "    if (value === CHAR_LEFT_CURLY_BRACE) {\n" + parseCheck],
    ],
  },
  {
    package: 'braces', version: '3.0.3', file: 'lib/compile.js', hash: 'dc98f22eee3d511785d92a00758d5f0d48efed5f5813bdecc2de430c529b5c9f',
    replacements: [
      ['  const walk = (node, parent = {}) => {\n', '  const walk = (node, parent = {}, depth = 0) => {\n' + depthCheck],
      ['output += walk(child, node);', 'output += walk(child, node, depth + 1);'],
    ],
  },
  {
    package: 'braces', version: '3.0.3', file: 'lib/expand.js', hash: '41ccc196ebfa7b7781a634e721eb744e4e7bcb54cba427a7e3d6806a1b9e58f7',
    replacements: [
      ['  const walk = (node, parent = {}) => {\n', '  const walk = (node, parent = {}, depth = 0) => {\n' + depthCheck],
      ['walk(child, node);', 'walk(child, node, depth + 1);'],
    ],
  },
  {
    package: 'braces', version: '3.0.3', file: 'lib/stringify.js', hash: '379f22d77bfa1478341ccd49c5e4267464aabcbba03558bab332aac23fc6f23a',
    replacements: [
      ['  const stringify = (node, parent = {}) => {\n', '  const stringify = (node, parent = {}, depth = 0) => {\n' + depthCheck],
      ['output += stringify(child);', 'output += stringify(child, {}, depth + 1);'],
    ],
  },
  {
    package: 'node-forge', version: '1.4.0', file: 'lib/rsa.js', hash: 'fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50',
    replacements: [
      ['            obj.value.length !== 2) {',
        "            obj.value.length !== 2 ||\n            obj.value[0].value.length !==\n              (('parameters' in capture) ? 2 : 1)) {"],
    ],
  },
];

const sha256 = source => createHash('sha256').update(source).digest('hex');

export async function patchSecurityDependencies(root = repoRoot) {
  // Validate all inputs before writing any files. Unexpected updates fail the install.
  const pending = [];
  for (const patch of patches) {
    const packageRoot = join(root, 'node_modules', patch.package);
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    if (manifest.version !== patch.version) {
      throw new Error(`Re-review security patch for ${patch.package}: expected ${patch.version}, found ${manifest.version}`);
    }
    const path = join(packageRoot, patch.file);
    const current = await readFile(path, 'utf8');
    // Reconstruct the original only for an already-patched file, then verify its hash.
    let original = current;
    for (const [before, after] of [...patch.replacements].reverse()) {
      if (original.includes(after)) original = original.replace(after, before);
    }
    if (sha256(original) !== patch.hash) {
      throw new Error(`Unexpected source for ${patch.package}/${patch.file}; re-review the security patch`);
    }
    let patched = original;
    for (const [before, after] of patch.replacements) {
      if (patched.split(before).length !== 2) {
        throw new Error(`Security patch must match exactly once: ${patch.package}/${patch.file}`);
      }
      patched = patched.replace(before, after);
    }
    if (patched !== current) pending.push({ path, patched });
  }
  for (const { path, patched } of pending) await writeFile(path, patched);
  console.log('Verified security patches: braces 3.0.3 and node-forge 1.4.0');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await patchSecurityDependencies();
}
