#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo '请先运行：pkg install nodejs-lts npm git'
  exit 1
fi
node -e 'if (+process.versions.node.split(".")[0] < 22) { console.error("需要 Node.js 22 或以上，请更新 nodejs-lts。"); process.exit(1); }'

# Electron is a desktop-only dependency; keep esbuild's required install script.
ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund

# Some Android builds cannot load Rollup's native binary. Use the matching official
# WASM package locally, without changing this repository's manifest or lockfile.
if ! node --input-type=module -e "await import('rollup')"; then
  rollup_version=$(node -p "require('./node_modules/rollup/package.json').version")
  npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund "rollup@npm:@rollup/wasm-node@${rollup_version}"
  node --input-type=module -e "await import('rollup')"
fi

echo '依赖准备完成。'
echo '热开发：npm run termux:dev'
echo '首次安装或更新：npm run termux:pwa'
echo '以后日常启动：npm run termux:start'
