#!/usr/bin/env bash
# Conflux Termux + Ubuntu PRoot ACP development startup.
# Starts the only local frontend (4173) and bridge (47831) with one shared token.
set -Eeuo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo"

for command_name in node npm proot-distro; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '缺少 %s；没有修改运行环境。\n' "$command_name" >&2
    exit 1
  fi
done
for file in tools/conflux-local-server.ts tools/devin-acp-bridge.mjs tools/conflux-acp-mcp.mjs .devin/mcp_config.json; do
  if [[ ! -f "$file" ]]; then
    printf '缺少 %s；请确认当前 Conflux 分支已经更新。\n' "$file" >&2
    exit 1
  fi
done

# Refuse to collide with the existing two services. Never kill unrelated sessions.
for port in 4173 47831; do
  if ! node - "$port" <<'JS'
const net = require('node:net');
const port = Number(process.argv[2]);
const socket = net.connect({ host: '127.0.0.1', port });
socket.setTimeout(1500);
socket.on('connect', () => { socket.destroy(); process.exit(1); });
socket.on('error', (error) => { process.exit(error.code === 'ECONNREFUSED' ? 0 : 2); });
socket.on('timeout', () => { socket.destroy(); process.exit(2); });
JS
  then
    printf '端口 %s 已被占用或无法检查。请先在原来的窗口正常停止旧服务；本脚本不会强行关闭它。\n' "$port" >&2
    exit 1
  fi
done

# The token stays outside the repository and is reused for future restarts.
umask 077
token_file="$HOME/.config/conflux/acp-bridge-token"
mkdir -p "$(dirname "$token_file")"
if [[ ! -s "$token_file" ]]; then
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))' > "$token_file"
fi
chmod 600 "$token_file"
token="$(cat "$token_file")"
if [[ "${#token}" -lt 24 ]]; then
  printf '本地 ACP 密钥无效；未启动服务。\n' >&2
  exit 1
fi

# Keep the standalone bridge/MCP files in Ubuntu. Do not touch any user project or data.
proot-distro login ubuntu -- mkdir -p /root/.conflux-acp/tools /root/.conflux-acp/.devin
for file in tools/devin-acp-bridge.mjs tools/conflux-acp-mcp.mjs .devin/mcp_config.json; do
  cat "$file" | proot-distro login ubuntu -- sh -c "cat > /root/.conflux-acp/$file"
done

bridge_pid=''
front_pid=''
cleanup() {
  trap - EXIT
  [[ -z "$front_pid" ]] || kill "$front_pid" 2>/dev/null || true
  [[ -z "$bridge_pid" ]] || kill "$bridge_pid" 2>/dev/null || true
  [[ -z "$front_pid" ]] || wait "$front_pid" 2>/dev/null || true
  [[ -z "$bridge_pid" ]] || wait "$bridge_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '启动 Conflux 4173 + Devin ACP 47831（共用本地密钥）。\n'
proot-distro login ubuntu -- env \
  DEVIN_ACP_COMMAND=/root/.local/bin/devin \
  DEVIN_ACP_WORKSPACE=/root/.conflux-acp \
  DEVIN_ACP_BRIDGE_PORT=47831 \
  DEVIN_ACP_BRIDGE_TOKEN="$token" \
  node /root/.conflux-acp/tools/devin-acp-bridge.mjs &
bridge_pid=$!

DEVIN_ACP_BRIDGE_PORT=47831 DEVIN_ACP_BRIDGE_TOKEN="$token" npm run termux:dev &
front_pid=$!

# A process exiting ends this paired development session; no duplicate daemons.
if wait -n "$front_pid" "$bridge_pid"; then
  printf '其中一个开发服务已经退出，正在清理另一个。\n' >&2
else
  printf '其中一个开发服务意外停止，正在清理另一个。\n' >&2
  exit 1
fi
