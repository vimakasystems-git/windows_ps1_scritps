"""Build portable source packages without local reports, dependencies or credentials."""
import hashlib
import json
from pathlib import Path
import tarfile

root = Path(__file__).resolve().parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
out = root / 'build-portable'
out.mkdir(exist_ok=True)
files = [root / name for name in (
    'server.mjs', 'platform.mjs', 'portable-launcher.mjs', 'Start-Vimaka.command',
    'core.mjs', 'benchmark.mjs', 'workflow.mjs', 'storage.mjs', 'report-state.mjs',
    'package.json', 'PORTABLE.md')]
files += sorted((root / 'public').rglob('*'))
checks = []
for platform in ('Linux', 'macOS'):
    name = f'VimakaCare-{platform}-{version}-preview'
    target = out / (name + '.tar.gz')
    with tarfile.open(target, 'w:gz') as archive:
        for file in files:
            if not file.is_file():
                continue
            info = archive.gettarinfo(str(file), arcname=name + '/' + file.relative_to(root).as_posix())
            info.uid = info.gid = 0
            info.uname = info.gname = ''
            info.mode = 0o755 if file.name == 'Start-Vimaka.command' else 0o644
            with file.open('rb') as stream:
                archive.addfile(info, stream)
    checks.append(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name)
    print(target.name)
(out / 'SHA256SUMS.txt').write_text('\n'.join(checks) + '\n', encoding='utf-8')
