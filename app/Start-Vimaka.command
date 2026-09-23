#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo 'Vimaka Care requires Node.js 22 or later to run its local component.'
  echo 'Install the LTS version from https://nodejs.org, then run this file again.'
  exit 1
fi
node -e 'if(Number(process.versions.node.split(".")[0])<22){console.error("Node.js 22 or later is required");process.exit(1)}'
exec node portable-launcher.mjs
