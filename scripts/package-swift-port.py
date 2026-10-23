"""Package the ready-to-open app playground, with every offline resource."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

root = Path(__file__).resolve().parents[1]
project = root / 'native-ios/QuranAdhanQibla.swiftpm'
resources = project / 'Sources/App/OfflineContent'
assert len(list((resources / 'Pages').glob('*.svgz'))) == 606, 'Run npm run swift:prepare first'
destination = root / 'dist/swift-ios'
destination.mkdir(parents=True, exist_ok=True)
archive = destination / 'QuranAdhanQibla-iPad-build3-compact.zip'
excluded = {'.build', '.swiftpm', '.DS_Store'}
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for path in sorted(project.rglob('*')):
        relative = path.relative_to(project)
        if not path.is_file() or any(part in excluded for part in relative.parts) or path.suffix == '.sha256':
            continue
        bundle.write(path, 'QuranAdhanQibla.swiftpm/' + relative.as_posix(), compress_type=zipfile.ZIP_STORED if path.suffix == '.svgz' else zipfile.ZIP_DEFLATED)
    for path, label in [(root / 'native-ios/IPAD-START-HERE.md', 'START-HERE.md'), (root / 'native-ios/README.md', 'DEVELOPER-README.md'), (root / 'native-ios/ADHAN-LICENSE', 'ADHAN-LICENSE.txt')]:
        bundle.write(path, label)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    names = bundle.namelist()
    assert sum(name.endswith('.svgz') for name in names) == 606
    assert not any('/.build/' in name or '/.swiftpm/' in name or name.endswith('.partial') for name in names)
package_text = (project / 'Package.swift').read_text()
manifest = {'archive': archive.name, 'version': re.search(r'displayVersion:\s*"([^"]+)"', package_text)[1], 'build': re.search(r'bundleVersion:\s*"([^"]+)"', package_text)[1], 'bytes': archive.stat().st_size, 'sha256': digest, 'quranPages': 604, 'appendixPages': 2}
(destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
(destination / (archive.name + '.sha256')).write_text(digest + '  ' + archive.name + '\n')
print(f'{archive}\n{archive.stat().st_size / 1024 / 1024:.1f} MiB · SHA-256 {digest}')
