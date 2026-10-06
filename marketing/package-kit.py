"""Package final deliverables with stable relative paths; verify every ZIP CRC."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent


def package(target, base, entries):
    paths = []
    for entry in entries:
        item = base / entry
        paths.extend(sorted(item.rglob('*')) if item.is_dir() else [item])
    with ZipFile(target, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for item in paths:
            if item.is_file():
                archive.writestr(item.relative_to(base).as_posix(), item.read_bytes())
    with ZipFile(target) as archive:
        failure = archive.testzip()
        if failure:
            raise RuntimeError(f'ZIP integrity failure: {failure}')
        print(f'{target.name}: {len(archive.infolist())} files, {target.stat().st_size} bytes; CRC passed')


package(ROOT / 'exports/WILDFALL-Play-Store-Kit.zip', ROOT, [
    'play-store', 'README.md', 'prompts.json',
    'exports/WILDFALL-Last-Ember-Trailer-1080p.mp4',
    'exports/trailer-thumbnail-1920x1080.png',
    'exports/screenshots-contact-sheet.png',
    'exports/trailer-storyboard.png', 'exports/validation.json',
])
package(ROOT / 'exports/WILDFALL-Remotion-Source.zip', ROOT / 'remotion', [
    'src', 'public', 'package.json', 'package-lock.json', 'remotion.config.ts',
    'tsconfig.json', 'eslint.config.mjs', 'README.md',
])
