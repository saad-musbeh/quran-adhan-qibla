#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_root="$repo_root/target/swift-port"
project_dir="$output_root/ci-project"
spec_path="$project_dir/project.json"
project_path="$project_dir/SwiftPort.xcodeproj"
log_path="$output_root/ios-build.log"
result_path="$output_root/ios-smoke.xcresult"

mkdir -p "$project_dir"
python3 "$repo_root/scripts/generate-swift-ci-project.py" \
  --repo-root "$repo_root" --output "$spec_path"
xcodegen generate --spec "$spec_path" --project "$project_dir"

simulator_id="$(xcrun simctl list devices available --json | python3 -c '
import json, sys
data = json.load(sys.stdin)
devices = [device for runtime in data["devices"].values() for device in runtime
           if device.get("isAvailable") and "iPad" in device.get("name", "")]
if not devices:
    raise SystemExit("No available iPad simulator is installed")
print(devices[0]["udid"])
')"

rm -rf "$result_path"
xcodebuild build-for-testing \
  -project "$project_path" -scheme SwiftPort \
  -destination "id=$simulator_id" \
  -derivedDataPath "$output_root/derived-data" \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$log_path"
app_path="$output_root/derived-data/Build/Products/Debug-iphonesimulator/QuranAdhanQibla.app"
cp "$app_path/Info.plist" "$output_root/built-app-info.plist"
plutil -p "$output_root/built-app-info.plist"
python3 - "$output_root/built-app-info.plist" <<'PYINFO'
import plistlib, sys
with open(sys.argv[1], 'rb') as source:
    info = plistlib.load(source)
assert info.get('CFBundleIdentifier') == 'org.saadmusbeh.quranadhanqibla.swift', info
assert info.get('CFBundleExecutable') == 'QuranAdhanQibla', info
PYINFO
swift - "$app_path" <<'SWIFTINFO'
import Foundation
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let bundle = Bundle(url: url) else { fatalError("Foundation cannot open app bundle") }
guard bundle.bundleIdentifier == "org.saadmusbeh.quranadhanqibla.swift" else {
  fatalError("Foundation cannot read the app identifier: \(bundle.infoDictionary ?? [:])")
}
print("Foundation app identifier:", bundle.bundleIdentifier ?? "nil")
print("Foundation app metadata:", bundle.infoDictionary ?? [:])
SWIFTINFO
xcrun simctl bootstatus "$simulator_id" -b
xcrun simctl install "$simulator_id" "$app_path"
xcrun simctl launch "$simulator_id" org.saadmusbeh.quranadhanqibla.swift
xcodebuild test-without-building \
  -project "$project_path" -scheme SwiftPort \
  -destination "id=$simulator_id" \
  -derivedDataPath "$output_root/derived-data" \
  -resultBundlePath "$result_path" \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tee -a "$log_path"
