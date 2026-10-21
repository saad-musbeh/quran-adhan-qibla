import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { patchSecurityDependencies } from './patch-security-dependencies.mjs';

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const braces = require('braces');
const forge = require('node-forge');
const depthError = { name: 'RangeError', message: 'braces nesting exceeds security limit (128)' };

test('the lockfile has no additional unpatched braces or node-forge copies', async () => {
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  for (const [name, version] of [['braces', '3.0.3'], ['node-forge', '1.4.0']]) {
    const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`);
    assert.deepEqual(copies.map(([path, entry]) => [path, entry.version]), [[`node_modules/${name}`, version]]);
  }
});

test('deep brace and parenthesis patterns are rejected before recursive compilation or expansion', () => {
  for (const [open, close] of [['{', '}'], ['(', ')']]) {
    for (const suffix of [close.repeat(4000), '']) {
      const input = open.repeat(4000) + 'a,b' + suffix;
      for (const method of [braces, braces.compile, braces.expand, braces.stringify, braces.parse]) {
        assert.throws(() => method(input), depthError);
      }
    }
  }
});

test('direct AST entry points also reject excessive nesting', () => {
  for (const method of [braces.compile, braces.expand, braces.stringify]) {
    let ast = { type: 'text', value: 'a' };
    for (let i = 0; i < 5000; i++) ast = { type: 'root', nodes: [ast] };
    assert.throws(() => method(ast), depthError);
  }
});

test('normal Metro globs, escaped literals and nested brace ranges keep their behavior', () => {
  const micromatch = require('micromatch');
  assert.deepEqual(micromatch(['src/a.ts', 'src/b.tsx', 'src/c.js'], 'src/*.{ts,tsx}'), ['src/a.ts', 'src/b.tsx']);
  assert.deepEqual(braces.expand('src/{components,domain}/{a,b}{1..2}.ts'), [
    'src/components/a1.ts', 'src/components/a2.ts', 'src/components/b1.ts', 'src/components/b2.ts',
    'src/domain/a1.ts', 'src/domain/a2.ts', 'src/domain/b1.ts', 'src/domain/b2.ts',
  ]);
  assert.equal(braces.stringify(braces.parse('a/{b,{c,d}}/e')), 'a/{b,{c,d}}/e');
  assert.deepEqual(braces.expand(String.raw`a/\{b,c\}/d`), ['a/{b,c}/d']);
  assert.doesNotThrow(() => braces.compile('{'.repeat(64) + 'a,b' + '}'.repeat(64)));
});

const keys = generateKeyPairSync('rsa', { modulusLength: 1024, publicExponent: 3 });
const privateKey = forge.pki.privateKeyFromPem(keys.privateKey.export({ type: 'pkcs1', format: 'pem' }));
const publicKey = forge.pki.publicKeyFromPem(keys.publicKey.export({ type: 'spki', format: 'pem' }));
const digest = forge.md.sha256.create().update('dependency security regression').digest().getBytes();
const { asn1 } = forge;
const sequence = nodes => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, nodes);
const primitive = (type, value) => asn1.create(asn1.Class.UNIVERSAL, type, false, value);

function signedDigestInfo({ parameters = true, extra = [], outer = [] } = {}) {
  const algorithm = [primitive(asn1.Type.OID, asn1.oidToDer(forge.oids.sha256).getBytes())];
  if (parameters) algorithm.push(primitive(asn1.Type.NULL, ''));
  algorithm.push(...extra);
  const info = sequence([sequence(algorithm), primitive(asn1.Type.OCTETSTRING, digest), ...outer]);
  // Sign a deliberately supplied DigestInfo so padding and RSA are valid; only
  // the verifier's ASN.1 structure checks can reject the malformed signatures.
  return privateKey.sign(asn1.toDer(info).getBytes(), 'NONE');
}

test('RSA verification accepts canonical SHA-256 DigestInfo with present or omitted NULL', () => {
  assert.equal(publicKey.verify(digest, signedDigestInfo()), true);
  assert.equal(publicKey.verify(digest, signedDigestInfo({ parameters: false })), true);
  const md = forge.md.sha256.create().update('normal signed message');
  assert.equal(publicKey.verify(md.digest().getBytes(), privateKey.sign(md)), true);
});

test('RSA verification rejects unconsumed nested DigestAlgorithm elements', () => {
  for (const parameters of [true, false]) {
    for (const extra of [primitive(asn1.Type.OCTETSTRING, 'garbage'), primitive(asn1.Type.NULL, ''), sequence([])]) {
      // With no explicit NULL, an extra NULL is the legitimate optional parameter.
      if (!parameters && extra.type === asn1.Type.NULL) continue;
      assert.throws(() => publicKey.verify(digest, signedDigestInfo({ parameters, extra: [extra] })), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
    }
  }
  assert.throws(() => publicKey.verify(digest, signedDigestInfo({ outer: [primitive(asn1.Type.NULL, '')] })), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
});

test('Xcode project generation and round-trip parsing work with the patched uuid dependency', async () => {
  const xcode = require('xcode');
  const parser = require('xcode/lib/parser/pbxproj');
  const project = xcode.project('security-check.pbxproj');
  project.hash = parser.parse(`// !$*UTF8*$!
{
  archiveVersion = 1;
  objectVersion = 54;
  objects = {
    /* Begin PBXProject section */
    AAAAAAAAAAAAAAAAAAAAAAAA = {isa = PBXProject; mainGroup = BBBBBBBBBBBBBBBBBBBBBBBB; targets = ();};
    /* End PBXProject section */
    /* Begin PBXGroup section */
    BBBBBBBBBBBBBBBBBBBBBBBB = {isa = PBXGroup; children = (); sourceTree = "<group>";};
    /* End PBXGroup section */
    /* Begin PBXBuildFile section */
    /* End PBXBuildFile section */
    /* Begin PBXFileReference section */
    /* End PBXFileReference section */
    /* Begin PBXNativeTarget section */
    /* End PBXNativeTarget section */
    /* Begin XCBuildConfiguration section */
    /* End XCBuildConfiguration section */
    /* Begin XCConfigurationList section */
    /* End XCConfigurationList section */
  };
  rootObject = AAAAAAAAAAAAAAAAAAAAAAAA;
}
`);
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const id = project.generateUuid();
    assert.match(id, /^[0-9A-F]{24}$/);
    assert.ok(!ids.has(id));
    ids.add(id);
  }
  const target = project.addTarget('SecurityCheck', 'application', 'SecurityCheck', 'org.example.security');
  assert.ok(target.uuid);
  const output = project.writeSync();
  const reloaded = xcode.project('round-trip.pbxproj');
  reloaded.hash = parser.parse(output);
  assert.equal(reloaded.pbxNativeTargetSection()[target.uuid].name, '"SecurityCheck"');
  const xcodeRequire = createRequire(require.resolve('xcode'));
  assert.equal(xcodeRequire('uuid/package.json').version, '11.1.1');
  assert.throws(() => xcodeRequire('uuid').v5('test', xcodeRequire('uuid').v5.DNS, new Uint8Array(8)), RangeError);
});

test('patches are idempotent and fail closed on changed source or versions', async t => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'quran-security-'));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  for (const name of ['braces', 'node-forge']) {
    await cp(join(root, 'node_modules', name), join(temporaryRoot, 'node_modules', name), { recursive: true });
  }
  await patchSecurityDependencies(temporaryRoot);
  await patchSecurityDependencies(temporaryRoot);
  const rsa = join(temporaryRoot, 'node_modules/node-forge/lib/rsa.js');
  const source = await readFile(rsa, 'utf8');
  await writeFile(rsa, source + '\n// changed source\n');
  await assert.rejects(patchSecurityDependencies(temporaryRoot), /Unexpected source/);
  await writeFile(rsa, source);
  await writeFile(join(temporaryRoot, 'node_modules/braces/package.json'), '{"version":"3.0.4"}');
  await assert.rejects(patchSecurityDependencies(temporaryRoot), /Re-review security patch/);
});
