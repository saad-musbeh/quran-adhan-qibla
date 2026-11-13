# Dependency security follow-up — 13 November 2026

The current dependency set stays on **Expo SDK 57**. A fresh `npm ci` and `npm audit` report **zero known npm advisories**. This is an inventory result, not a guarantee that all dependencies are secure. The source-verified `braces` nesting guard and Expo Audio patch remain enabled.

## Current fixes

- **Expo 57.0.33 / CLI 57.0.34:** update within the existing SDK. Its updated tooling removes the affected `zod` and `deepmerge` copies and uses `glob` 14.0.6. React Native and the exact Expo Audio version remain unchanged.
- **node-forge 1.4.3:** use the published upstream security release through Expo's existing compatible dependency range. Remove our former `lib/rsa.js` backport; retain the valid and malformed RSA DigestInfo regressions. See [Forge's changelog](https://github.com/digitalbazaar/forge/blob/main/CHANGELOG.md).
- **Xcode 4.0.0:** Expo config plugins now use the upstream parser that generates project identifiers through Node's `crypto.randomUUID()`. Remove the old `xcode → uuid` override. The regression still creates a native target and verifies identifier generation, serialization and reparsing.
- **minimatch 11.0.8:** scope an override to `@expo/fingerprint`, whose current release still requests major 10. Its only runtime consumer is the fingerprint path helper, using `Minimatch`, `pattern`, `negate` and `match()`. It does not use the APIs removed in [minimatch 11](https://github.com/isaacs/minimatch/blob/main/changelog.md). Compatibility checks exercise actual fingerprint path/directory filters, ordered excludes and included children, dotfiles, parent-relative node_modules paths and brace patterns. Other packages use their own supported dependency ranges; this is not a global major-version override.
- **braces 3.0.3:** retain the local 128-level nesting limit in parser and recursive compile/expand/stringify walkers. Both brace and parenthesis blocks, unclosed patterns and direct AST entry points are covered. Exact package-version and source-hash checks prevent an unexpected release/source from being patched silently. Ordinary globs/ranges retain behavioral coverage. This local guard was introduced for [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); the current registry audit does not report it, and the latest published braces version checked for this follow-up remains 3.0.3. Do not remove the guard solely because the registry result is clean.

These changes concern Node build/development tooling, not Quran source data or the app's prayer calculations. No framework SDK migration or audio-engine version change is included.

## Installation and checks

```sh
npm ci
npm run check
npm run export:mobile
npm audit
```

Install scripts apply the remaining `braces` source guard followed by the existing iOS Expo Audio patch. Do not use `--ignore-scripts` for the final installation. The security patch validates every source before writing, accepts an already-patched installation and rejects changed versions/hashes for review. `npm run test:security` runs the security/compatibility regressions separately.

Verification for this follow-up includes a clean install, nine security checks, the full project checks and both mobile exports. Native project generation and available native-build results are recorded in [the audit follow-up](AUDIT-2026-11-13.md). Linux host Swift checks cannot establish an Apple SDK app build or physical-device behavior.

## Earlier mitigation and removal conditions

The 21 October follow-up overrode Xcode's old UUID dependency and patched `braces` and Forge locally. The November audit found additional advisories beyond those covered by the old patches. The SDK 57 patch update now supplies the upstream Forge/Xcode replacements, so their temporary patch/override have been removed.

Remove the fingerprint override when its compatible upstream dependency range includes a fixed minimatch release. Remove the `braces` source patch only after the upstream code has equivalent protection against the covered malicious inputs. For either change, keep the relevant behavioral tests, inspect every lockfile copy, perform a fresh install/audit, run the full checks and exports, regenerate native projects and build the platforms available to the verification host. Avoid the audit command's suggested framework downgrade as a substitute for checking compatibility.
