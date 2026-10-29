# Devin ACP — isolated local preview

Status: **implementation in progress**, not yet accepted on Android. This is a dedicated ACP connection panel in Add Connection, **not** a replacement for the canonical Conflux chat provider. Do not label it production-ready.

## Architecture

`devin acp` (Ubuntu PRoot, stdio JSON-RPC) → `tools/devin-acp-bridge.mjs` (loopback-only HTTP/SSE, token required) → Vite same-origin proxy `/devin-acp` → Add Connection → ACP Agent panel.

The bridge owns the Devin process and ACP session. The browser never sees the bridge token, Devin credentials or the stdio channel. It is not an OpenAI-compatible endpoint; do **not** enter it as a Base URL in an API provider.

## Start in the Ubuntu PRoot with Devin installed

From a separate, isolated checkout of `feat/devin-acp-bridge`:

```sh
export DEVIN_ACP_BRIDGE_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
export DEVIN_ACP_WORKSPACE="$HOME"
node tools/devin-acp-bridge.mjs
```

The token must be copied into the environment of the Vite process (not into `VITE_*` or source files). If Vite runs in a different Termux session, pass the token securely through a private environment file outside the repository. Never commit or screenshot it.

In the **Vite process environment**, set `DEVIN_ACP_BRIDGE_TOKEN` to the exact same value, then run the existing dev server. The bridge defaults to `127.0.0.1:47831`. If Ubuntu PRoot and Termux cannot share loopback on the device, verify network reachability before changing any bind address. Do not expose the bridge on `0.0.0.0` or forward it publicly.

Open Conflux → API connections → Add connection → **ACP Agent** → **Detect ACP connection** → send a test message. The standard API provider form remains unchanged.

## Focused verification

1. `node --check tools/devin-acp-bridge.mjs` and `node --check tools/devin-acp-smoke.mjs`.
2. `node tools/devin-acp-smoke.mjs` inside authenticated Ubuntu; confirm ACP initialize responds.
3. `npm run typecheck` in the isolated checkout, once dependencies are installed.
4. In the UI, test health, one prompt with streaming text, stop/cancel, disconnect, wrong token and second simultaneous prompt.
5. Confirm no key is stored in frontend bundle, app data or logs. Check both Android browser/PWA and native APK separately.

Do not run the full regression suite for this isolated integration pass. Do not merge until the ACP session, message lifecycle and Android device checks are demonstrated.

## Known limitations

- The ACP Agent panel is a connection and prompt probe. It is **not yet** wired into the canonical chat send/history pipeline or provider selection.
- Agent permission requests are rejected rather than auto-approved. Tool execution requiring permissions is therefore not ready.
- Vite proxy exists only in the dev server; a production PWA/APK needs a platform-appropriate trusted bridge transport.
- No actual tablet/Ubuntu/Devin runtime test has been performed by this change.
