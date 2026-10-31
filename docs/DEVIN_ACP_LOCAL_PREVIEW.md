# Devin ACP — isolated local preview

Status: **implementation in progress**, not yet accepted on Android. The ACP connection can be selected as a provider in the normal chat flow. Do not label it production-ready without a real Devin and tablet check.

## Architecture

`devin acp` (Ubuntu PRoot, stdio JSON-RPC) → `tools/devin-acp-bridge.mjs` (loopback-only HTTP/SSE, token required) → Conflux same-origin `/devin-acp` route → Add Connection → ACP Agent or normal chat. The Termux local server serves the route on port 4173 in both HMR and built PWA modes; standalone Vite also has a development proxy.

The bridge owns the Devin process and ACP session. The browser never sees the bridge token, Devin credentials or the stdio channel. It is not an OpenAI-compatible endpoint; do **not** enter it as a Base URL in an API provider.

## Start in the Ubuntu PRoot with Devin installed

From the Conflux checkout containing this integration:

```sh
export DEVIN_ACP_BRIDGE_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
export DEVIN_ACP_WORKSPACE="$HOME"
node tools/devin-acp-bridge.mjs
```

The same token must be present in the Conflux server process (not in `VITE_*` or source files). If it runs in a different Termux session, pass the token through a private environment file outside the repository. Never commit or screenshot it.

In the **Conflux process environment**, set `DEVIN_ACP_BRIDGE_TOKEN` to the exact same value, then run `npm run termux:dev` for live development or `npm run termux:pwa` for a built PWA. Both use the existing `http://127.0.0.1:4173/` address. The bridge defaults to `127.0.0.1:47831`. If Ubuntu PRoot and Termux cannot share loopback on the device, verify network reachability before changing any bind address. Do not expose the bridge on `0.0.0.0` or forward it publicly.

Open Conflux → API connections → Add connection → **ACP Agent** → **Detect ACP connection** → send a test message. To use the main chat, add the Devin ACP provider on that screen and select it in the composer.

## Focused verification

1. `node --check tools/devin-acp-bridge.mjs` and `node --check tools/devin-acp-smoke.mjs`.
2. `node tools/devin-acp-smoke.mjs` inside authenticated Ubuntu; confirm ACP initialize responds.
3. `npm run typecheck` in the isolated checkout, once dependencies are installed.
4. In the UI on port 4173 in both development and built PWA modes, test health, one prompt with streaming text, stop/cancel, disconnect, wrong token and second simultaneous prompt. Test the normal chat provider route too.
5. Confirm no key is stored in frontend bundle, app data or logs. Check both Android browser/PWA and native APK separately.

Do not run the full regression suite for this isolated integration pass. Do not merge until the ACP session, message lifecycle and Android device checks are demonstrated.

## Known limitations

- The ACP provider uses the canonical chat request and history flow for text. Files and permission-requiring agent operations are not supported by this bridge.
- The dedicated Termux launcher upgrades the ACP-only Devin project config to `mcp__conflux__*`: **all** tools exposed by the Conflux MCP adapter (including memory writes, attachment access and enabled workspace actions), not just the previous five read tools. Existing local configuration is preserved, and no global Devin permissions or other MCP servers are modified. The browser still enforces current persona/conversation tool enablement and executes only its own exposed tool catalog. Permission grant is not the same as bypassing Conflux's data-edit previews or enabling unavailable tools.
- Direct Devin CLI shell/file agent operations use their own ACP permission requests and are not silently approved by the MCP allow rule. This is independent of authorizing the entire Conflux tool catalog.
- The local Termux PWA has a same-origin route. A separately hosted PWA or native APK still needs a trusted transport in its own deployment/runtime.
- No actual tablet/Ubuntu/Devin runtime test has been performed by this change.
