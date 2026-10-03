from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent.parent
apk = root / 'dist' / 'WILDFALL-Last-Ember-1.3.1.apk'
with ZipFile(apk) as archive:
    assert archive.testzip() is None, 'APK archive CRC failed'
    names = archive.namelist()
    assert all('\\' not in name for name in names), 'Android assets need forward-slash paths'
    for file in (root / 'web').rglob('*'):
        if file.is_file():
            entry = 'assets/' + file.relative_to(root / 'web').as_posix()
            assert entry in names, f'Missing packaged asset: {entry}'
            assert archive.read(entry) == file.read_bytes(), f'Stale packaged asset: {entry}'
    assert 'classes.dex' in names and 'AndroidManifest.xml' in names
checksum = hashlib.sha256(apk.read_bytes()).hexdigest()
assert (root / 'dist' / 'SHA256.txt').read_text().split()[0] == checksum
git_match = None
if (root / '.git').exists():
    output = subprocess.check_output(['git', 'ls-files', '--stage', 'web'], cwd=root).decode('utf-8')
    indexed = {line.split('\t', 1)[1]: line.split()[1] for line in output.splitlines()}
    for file in (root / 'web').rglob('*'):
        if file.is_file():
            name = file.relative_to(root).as_posix()
            data = file.read_bytes()
            blob = b'blob ' + str(len(data)).encode() + b'\0' + data
            assert name in indexed, f'Runtime file is not tracked: {name}'
            digest = hashlib.sha256(blob) if len(indexed[name]) == 64 else hashlib.sha1(blob)
            assert indexed[name] == digest.hexdigest(), f'Git runtime bytes differ: {name}'
    git_match = True
print(json.dumps({'valid': True, 'apkBytes': apk.stat().st_size, 'sha256': checksum, 'allWebAssetsMatchSource': True, 'gitRuntimeBytesMatchSource': git_match, 'webAssets': len([p for p in (root / 'web').rglob('*') if p.is_file()])}, indent=2))
