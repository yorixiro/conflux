# Devin ACP — Termux / Ubuntu PRoot delivery notes

Status (2026-10-30): **Bridge running and model discovery confirmed on Android device; full chat acceptance pending.** The user's screenshot showed “Devin 桥接在线” and a real model dropdown. This does not prove a two-turn conversation completed successfully.

> **P1 原生工具桥是独立的后续工单。** 原有本文记录 text-chat 阶段的现场结果，不代表 tools 已通过验证。工具桥实现、权限、隔离预览和未执行的模拟测试状态见 [WORK_DEVIN_ACP_NATIVE_TOOLS_P1.md](work-orders/WORK_DEVIN_ACP_NATIVE_TOOLS_P1.md)。原生工具版不再支持下文旧的 stdin 启动方式，必须把两个 mjs 作为真实文件放在 PRoot 同目录。

## Supported scope and frozen UI

- Conflux same-origin 4173 → local bridge on `127.0.0.1:47831` → `devin acp` in Ubuntu PRoot.
- Normal API settings remain untouched. The ACP provider page supports connection status, real agent model discovery and model selection. No arbitrary OpenAI Base URL, fabricated API Key, or user-entered bridge Token is required for local loopback use.
- Text-only conversation is the delivery target. Permission-requiring agent tools, file attachments, separately hosted PWA and native APK transports are **not** part of this acceptance. Those are separate scopes.
- Preserve local persona settings, old chat data, current theme and the existing 4173 service configuration. Do not force-push, reset, or merge PRs for this closure.

## Proven path and minimal normal operation

The Devin CLI was already installed and authenticated in Ubuntu PRoot at `/root/.local/bin/devin`. A bridge started using plain `spawn('devin')` failed because the noninteractive Ubuntu subprocess did not include that directory in PATH. Using an explicit executable path resolved the observed startup failure. Do not reinstall or log in again solely because the bridge reported a missing command.

To restart the **bridge only**, in a regular Termux window with `~/my_st_termux/conflux` containing the current bridge source:

```sh
cd ~/my_st_termux/conflux
proot-distro login ubuntu -- env -u DEVIN_ACP_BRIDGE_TOKEN \
  DEVIN_ACP_COMMAND=/root/.local/bin/devin \
  node --input-type=module - < tools/devin-acp-bridge.mjs
```

This streams source from Termux into Ubuntu; it does not assume the repository exists at `/root/my_st_termux/conflux`. Keep the bridge process running. The old `git show FETCH_HEAD:tools/devin-acp-bridge.mjs | proot-distro ...` variant also works but depends on FETCH_HEAD not changing.

The current Conflux live-preview server runs via `npm run termux:dev` at `http://127.0.0.1:4173`; once running, **do not restart it for ordinary chat**. A `200` from `/devin-acp/health` only means the HTTP endpoint responded; check the returned `running` status before declaring Devin available.

## Acceptance checklist (stop after completion)

- [x] Android UI shows “Devin 桥接在线”
- [x] Android UI loads genuine Devin model choices
- [ ] From a Conflux persona bound to Devin ACP, send a message in the **normal chat window** and receive a text response
- [ ] Send a second message in the same conversation; confirm it receives an appropriate follow-up
- [ ] Keep selected model/connection after reopening the settings, without disrupting ordinary API routes

**After these user-observed checks pass, mark the text-chat scope accepted and freeze the UI.** No extra test suite, design changes, refactor, data cleanup or branch merge is authorized by this checklist. If an item fails, fix only the observed failure.

## Operational troubleshooting, only if an actual failure occurs

- `Devin ACP process is unavailable`: check whether the Ubuntu `devin` subprocess is running; bridge listening alone is insufficient.
- `ENOENT`/can't find `devin`: set `DEVIN_ACP_COMMAND=/root/.local/bin/devin` as above; it is **not** evidence the user is logged out.
- 502 from 4173: local bridge is unreachable; confirm only the bridge process and loopback address, not the unrelated Vite/UI code.
- A missing model list with `running: true`: the agent may not advertise models for that session; use its default model rather than inventing IDs.
- Current persona settings source can differ from the shared branch because guarded sync preserved local changes. Do not overwrite this file merely to make branches identical.

Source ownership: `tools/devin-acp-bridge.mjs`, `tools/conflux-local-server.ts`, `src/engines/request/devinAcpReply.ts`, and `src/engines/request/requestPipeline.ts`. No live Android request, test result, or private chat content is recorded in this document.
