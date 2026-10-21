# Dependency security follow-up — 21 October 2026

The fresh npm audit reported three underlying advisories, propagated through 22 package entries (15 high, seven moderate). These packages are inherited from Expo/Metro and Xcode project tooling. This follow-up fixes `uuid` with a published release and applies local mitigations for the other two advisories, which have no patched npm release as of this review.

## Fixes

- **uuid:** Scope an npm override to `xcode`'s dependency, changing 7.0.3 to **11.1.1**, the patched CommonJS-compatible release for [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Xcode uses the supported `uuid.v4()` API. The regression generates project identifiers, adds a native target, writes and reparses the project, and checks rejection of an undersized UUID output buffer.
- **braces 3.0.3:** [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) concerns stack exhaustion from deeply nested patterns. Add a fixed nesting limit of 128 in the parser and recursive compile/expand/stringify walkers. Guard both parentheses and braces before pushing parser blocks, including unclosed patterns. Walker guards also cover callers that supply an AST directly. These are local guards based on the failure described in [upstream issue 70](https://github.com/micromatch/braces/issues/70), not a published upstream fix. Ordinary globs, ranges, escaped literals and nested patterns retain regression coverage; unusually deep inputs now throw a controlled `RangeError`.
- **node-forge 1.4.0:** [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) concerns extra elements in the nested RSA DigestAlgorithm sequence. Backport the element-count condition proposed in [upstream pull request 1152](https://github.com/digitalbazaar/forge/pull/1152), retaining the existing outer sequence check. Valid SHA-256 signatures with present or omitted NULL parameters pass. Correctly signed malformed DigestInfo structures containing extra nested elements are rejected, including with a low-exponent RSA key. This is a local backport of an upstream proposal, not a released upstream security update.

## Installation and checks

`npm ci` runs `scripts/patch-security-dependencies.mjs` before the existing Expo Audio patch. The security script checks exact package versions and SHA-256 hashes of the original source, validates all files before writing, and accepts an already-patched installation. Changed versions or unexpected source fail installation for review. Do not use `--ignore-scripts`; `npm run check` includes the security behavior checks and fails against unpatched dependencies.

The regression suite is also available separately:

```sh
npm run test:security
npm audit
```

After the UUID update, npm audit reports **15 high package entries**, all propagated from the two upstream advisories without published fixes. Package versions and advisory reporting are deliberately preserved: the local patches do not produce a clean npm audit or prove the entire dependency tree secure. The audit's suggested Expo 44 / React Native 0.72 downgrades are not compatible fixes for this SDK 57 application.

The patches affect Node build/development tooling, not the app's prayer calculations or Quran content. Their safety checks and regression suite must remain enabled in CI. Recheck the dependency inventory when updating Expo or Metro so an additional nested copy cannot bypass the patches.

## Verification

- Fresh `npm ci` applied both the security patches and the existing Expo Audio patch.
- All eight security checks pass, including lockfile copy inventory, normal behavior, malicious inputs, repeat application and rejection of unexpected source/version changes. The nesting and nested RSA element regressions failed against the original dependencies before patching.
- `npm run check` passed: TypeScript, localization, 213 application tests, seven iOS harness tests, Rust formatting/Clippy and 20 Rust tests. The final added lockfile-inventory check also passed in `npm run test:security`.
- `npm run export:mobile` exported Android and iOS bundles.
- Expo prebuild generated both native projects in an isolated ignored directory using the actual app configuration and plugins; the root generated projects were not regenerated. Native app binaries and physical-device behavior were not revalidated in this tooling-only follow-up.
- A repeated npm audit still reports only the two locally mitigated root advisories through 15 high entries, with no moderate or critical entries. It remains an upstream follow-up, not a clean audit.

## Removing the temporary fixes

When patched upstream releases become available, update the compatible parent dependencies or override to the fixed release, remove the corresponding local source patch after review, and retain its behavioral regressions. Remove the Xcode UUID override when its upstream dependency range includes a patched version. Run a fresh audit, `npm run check`, mobile exports and native project generation before claiming the roadmap's upstream replacement item complete.
