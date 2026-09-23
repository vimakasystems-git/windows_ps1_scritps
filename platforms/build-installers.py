"""Native packages with bundled official Node runtime supplied by CI."""
import argparse
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--os', choices=['linux', 'macos'], required=True)
parser.add_argument('--arch', choices=['x64', 'arm64'], required=True)
parser.add_argument('--node', required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parent.parent
app = repo / 'app'
version = json.loads((app / 'package.json').read_text())['version']
out = repo / 'dist'
out.mkdir(exist_ok=True)
work = out / (args.os + '-' + args.arch)
work.mkdir()  # Never overwrite a previous build.
stage = work / 'root'
if args.os == 'linux':
    dest = stage / 'opt/vimaka-workstation-care'
else:
    bundle = stage / 'Applications/Vimaka Workstation Care.app'
    dest = bundle / 'Contents/Resources/app'
dest.mkdir(parents=True)
for name in ['server.mjs', 'platform.mjs', 'core.mjs', 'benchmark.mjs', 'workflow.mjs',
             'storage.mjs', 'report-state.mjs', 'updates.mjs', 'stop-local.mjs',
             'desktop-launcher.mjs', 'package.json', 'THIRD-PARTY-NOTICES.txt']:
    shutil.copyfile(app / name, dest / name)
shutil.copytree(app / 'public', dest / 'public')
shutil.copyfile(Path(args.node).resolve(), dest / 'node')
(dest / 'node').chmod(0o755)
def write(file, content, executable=False):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding='utf-8', newline='\n')
    file.chmod(0o755 if executable else 0o644)
def run(*command):
    subprocess.run(command, check=True)
name = f'VimakaWorkstationCare-{version}-{args.os}-{args.arch}'
if args.os == 'linux':
    write(stage / 'usr/bin/vimaka-workstation-care', '#!/bin/sh\nexec /opt/vimaka-workstation-care/node /opt/vimaka-workstation-care/desktop-launcher.mjs\n', True)
    write(stage / 'usr/share/applications/vimaka-workstation-care.desktop', '[Desktop Entry]\nType=Application\nName=Vimaka Workstation Care\nComment=Local diagnostics and benchmark\nExec=/usr/bin/vimaka-workstation-care\nIcon=vimaka-workstation-care\nTerminal=false\nCategories=System;Utility;\n')
    icon = stage / 'usr/share/icons/hicolor/512x512/apps/vimaka-workstation-care.png'
    icon.parent.mkdir(parents=True)
    shutil.copyfile(app / 'public/icon-512.png', icon)
    hook = '#!/bin/sh\nset -e\nif [ -x /opt/vimaka-workstation-care/node ]; then\n /opt/vimaka-workstation-care/node /opt/vimaka-workstation-care/stop-local.mjs --stop\nfi\n'
    debarch = 'amd64' if args.arch == 'x64' else 'arm64'
    write(stage / 'DEBIAN/control', f'Package: vimaka-workstation-care\nVersion: {version}\nArchitecture: {debarch}\nMaintainer: Vimaka <vimakasystems@gmail.com>\nDepends: libc6 (>= 2.28), libstdc++6, xdg-utils\nSection: utils\nPriority: optional\nDescription: Local diagnostics, benchmark and storage dashboard\n Bundled Node.js runtime. No automatic OS tuning.\n')
    write(stage / 'DEBIAN/preinst', hook, True)
    run('dpkg-deb', '--root-owner-group', '--build', str(stage), str(out / (name + '.deb')))
    rpmarch = 'x86_64' if args.arch == 'x64' else 'aarch64'
    top = work / 'rpm'
    for folder in ['BUILD','RPMS','SOURCES','SPECS','SRPMS','BUILDROOT']:
        (top / folder).mkdir(parents=True)
    spec = top / 'SPECS/app.spec'
    write(spec, f'''Name: vimaka-workstation-care
Version: {version}
Release: 1
Summary: Local diagnostics and benchmark
License: LicenseRef-Proprietary
BuildArch: {rpmarch}
Requires: glibc >= 2.28, libstdc++, xdg-utils
AutoReqProv: no
%global __os_install_post %{{nil}}
%description
Vimaka Workstation Care with bundled Node.js runtime.
%install
mkdir -p %{{buildroot}}
cp -a "{stage}/opt" "{stage}/usr" %{{buildroot}}/
%pre
{hook.split('set -e', 1)[1]}
%files
/opt/vimaka-workstation-care
/usr/bin/vimaka-workstation-care
/usr/share/applications/vimaka-workstation-care.desktop
/usr/share/icons/hicolor/512x512/apps/vimaka-workstation-care.png
''')
    run('rpmbuild', '--define', '_topdir '+str(top), '--target', rpmarch, '-bb', str(spec))
    shutil.copyfile(next((top / 'RPMS').rglob('*.rpm')), out / (name + '.rpm'))
else:
    write(bundle / 'Contents/MacOS/VimakaWorkstationCare', '#!/bin/sh\nHERE="$(CDPATH= cd -- "$(dirname -- "$0")/../Resources/app" && pwd)"\nexec "$HERE/node" "$HERE/desktop-launcher.mjs"\n', True)
    info = {'CFBundleIdentifier':'com.vimaka.workstationcare','CFBundleName':'Vimaka Workstation Care',
            'CFBundleDisplayName':'Vimaka Workstation Care','CFBundleExecutable':'VimakaWorkstationCare',
            'CFBundlePackageType':'APPL','CFBundleVersion':version,'CFBundleShortVersionString':version,
            'LSMinimumSystemVersion':'13.5','CFBundleIconFile':'AppIcon','NSHighResolutionCapable':True}
    (bundle / 'Contents/Info.plist').write_bytes(plistlib.dumps(info))
    icons = work / 'AppIcon.iconset'
    icons.mkdir()
    for size in [16,32,128,256,512]:
        run('sips','-z',str(size),str(size),str(app / 'public/icon-512.png'),'--out',str(icons / f'icon_{size}x{size}.png'))
    run('iconutil','-c','icns',str(icons),'-o',str(bundle / 'Contents/Resources/AppIcon.icns'))
    scripts = work / 'scripts'
    write(scripts / 'preinstall', '#!/bin/sh\nset -e\nAPP="/Applications/Vimaka Workstation Care.app/Contents/Resources/app"\nif [ -x "$APP/node" ]; then "$APP/node" "$APP/stop-local.mjs" --stop; fi\n', True)
    run('pkgbuild','--root',str(stage),'--identifier','com.vimaka.workstationcare','--version',version,'--install-location','/','--scripts',str(scripts),str(out / (name + '.pkg')))
print(out / name)
