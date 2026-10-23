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
set -o pipefail
xcodebuild test \
  -project "$project_path" \
  -scheme SwiftPort \
  -destination "id=$simulator_id" \
  -derivedDataPath "$output_root/derived-data" \
  -resultBundlePath "$result_path" \
  CODE_SIGNING_ALLOWED=NO \
  2>&1 | tee "$log_path"
