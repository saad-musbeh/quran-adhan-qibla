#!/usr/bin/env bash
set -euo pipefail
# Optional Apple-SDK typecheck for CI/Mac development. Does not sign or publish.
task_root="$(cd "$(dirname "$0")/.." && pwd)"
task_project="$task_root/native-ios/QuranAdhanQibla.swiftpm"
task_build="$task_root/target/swift-port/apple-typecheck"
mkdir -p "$task_build"
task_sdk="$(xcrun --sdk iphonesimulator --show-sdk-path)"
task_arch="$(uname -m)"
task_target="$task_arch-apple-ios17.0-simulator"
# Arrays through read loops work with macOS's system Bash 3.2 too.
adhan_sources=(); while IFS= read -r -d '' file; do adhan_sources+=("$file"); done < <(find "$task_project/Sources/Adhan" -name '*.swift' -print0)
core_sources=(); while IFS= read -r -d '' file; do core_sources+=("$file"); done < <(find "$task_project/Sources/Core" -name '*.swift' -print0)
app_sources=(); while IFS= read -r -d '' file; do app_sources+=("$file"); done < <(find "$task_project/Sources/App" -maxdepth 1 -name '*.swift' -print0)
xcrun swiftc -swift-version 5 -sdk "$task_sdk" -target "$task_target" -emit-module -parse-as-library -module-name Adhan "${adhan_sources[@]}" -emit-module-path "$task_build/Adhan.swiftmodule"
xcrun swiftc -swift-version 5 -sdk "$task_sdk" -target "$task_target" -I "$task_build" -emit-module -parse-as-library -module-name IslamicCore "${core_sources[@]}" -emit-module-path "$task_build/IslamicCore.swiftmodule"
xcrun swiftc -swift-version 5 -sdk "$task_sdk" -target "$task_target" -I "$task_build" -module-name AppModule -parse-as-library -typecheck "${app_sources[@]}"
echo 'Apple SDK typecheck passed. Build/run the app playground to verify packaging and device behavior.'
