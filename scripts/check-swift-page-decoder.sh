#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$repo_root/target/swift-port/resource-check/compact-page-check"
mkdir -p "$(dirname "$output")"
swiftc -swift-version 5 -parse-as-library \
  "$repo_root/native-ios/QuranAdhanQibla.swiftpm/Sources/App/CompactPageData.swift" \
  "$repo_root/native-ios/Verification/CompactPageChecks.swift" -o "$output"
"$output" "$repo_root/native-ios/QuranAdhanQibla.swiftpm/Sources/App/OfflineContent/Pages"
