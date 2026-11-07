"""Build a video kit from its library manifest without overwriting files."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent

def sha256(path):
    with Path(path).open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def file_manifest(directory):
    """Hash actual regular files; never accept links to mutable library content."""
    result = {}
    for path in sorted(Path(directory).rglob('*')):
        if path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction()):
            raise ValueError(f'Linked asset is not an immutable copy: {path}')
        if path.is_file():
            result[path.relative_to(directory).as_posix()] = sha256(path)
    return result


def sync(video, copy=True):
    """Create an independent kit. The legacy copy argument is accepted but links are never made."""
    video = Path(video).resolve()
    library = ROOT / 'biblioteca'
    manifest = json.loads((video / 'biblioteca.lock.json').read_text(encoding='utf-8'))
    if manifest.get('version') != 1 or not isinstance(manifest.get('items'), list):
        raise ValueError('Invalid library manifest')
    items = []
    for item in manifest['items']:
        relative = Path(item)
        if relative.is_absolute() or '..' in relative.parts or not relative.parts:
            raise ValueError(f'Invalid library item: {item}')
        src = library / relative
        if not src.is_dir() or not src.resolve().is_relative_to(library.resolve()):
            raise ValueError(f'Library item missing: {item}')
        items.append((src, relative))
    for index, (src, relative) in enumerate(items):
        if any(relative == other or relative in other.parents or other in relative.parents
               for _, other in items[:index]):
            raise ValueError(f'Overlapping library item: {relative}')
        file_manifest(src)
    kit = video / 'kit'
    lock = video / 'kit.manifest.json'
    if lock.exists() or kit.exists() or kit.is_symlink():
        raise FileExistsError(f'Kit already exists: {kit}')
    kit.mkdir()
    for src, rel in items:
        dest = kit / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(src, dest)
    with lock.open('x', encoding='utf-8') as output:
        json.dump({'schema_version': 1, 'algorithm': 'sha256', 'files': file_manifest(kit)},
                  output, ensure_ascii=False, indent=2)
        output.write('\n')
    return kit

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('video')
    parser.add_argument('--copy', action='store_true')
    args = parser.parse_args()
    print(sync(args.video, args.copy))
