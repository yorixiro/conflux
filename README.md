# Conflux

个人维护流程见 [AGENTS.md](AGENTS.md)。**当前唯一日常开发线是 [`conflux-dev`](https://github.com/yorixiro/conflux/tree/conflux-dev)**。本默认分支只保留较早源码与入口文档，不是正在运行的完整 Conflux；`feat/keke-original-theme-port` 为冻结的历史美化分支，不再承接新功能。

## 上游技术背景

Polaris is a local-first AI workspace for sustained work with models, collaborators, saved materials, tools, and personal project context.

Most AI chat clients treat a conversation as a single message stream. Polaris treats it as a workspace: conversations survive restarts, collaborators keep identity and memory boundaries, useful outputs become cards or project materials, and model-visible tools leave evidence that the next request can use.

The core design idea is to build an environment that matches how an AI collaborator can reason naturally: clear scene, clear identities, clear tools, clear evidence, and enough local context for the model to choose well.

## Product Shape

- **Chat workspace:** long-lived conversations, streaming replies, task state, tool calls, thinking summaries, attachments, and import/export flows.
- **Collaborators and personas:** configurable collaborators with persistent identity, model settings, memory controls, room settings, and tool permissions.
- **Collection surface:** saved conversations, code cards, images, files, room projects, and workspace materials outside the linear chat timeline.
- **Readable AI environment:** request context, room boundaries, memories, tools, and project materials are arranged as named parts of the current scene.
- **LocalData:** a local-first data layer for conversations, collaborators, cards, assets, project files, runtime settings, and migration/import boundaries.
- **Tool evidence:** model tools are tracked as visible events with execution results and replayable context, not just hidden side effects.
- **Cross-platform shell:** shared product runtime for web, iOS, Android, and desktop host surfaces, with native bridges only for real platform capabilities.

## Current Status

- Native iOS and Android shells use SQLite behind the LocalData backend. Web and self-host browser builds use KV/IndexedDB.
- Data ownership is explicit: LocalData facts with a SQLite backend where connected, blob storage for large binaries, runtime/UI stores as projections, and existing local data handled through import and migration boundaries.

Status files:

- [docs/README.md](/docs/README.md): documentation map.
- [DEPLOYMENT.md](/DEPLOYMENT.md): local development, web deployment, backend origin, and native build guide.
- [docs/open-source/README.md](/docs/open-source/README.md): documentation pack for product intent, architecture, modules, backend, and verification.

## License

Polaris source code is licensed under AGPL-3.0-only. See [LICENSE](/LICENSE).

## 开发

日常维护遵循 [AGENTS.md](AGENTS.md)，不要求逐功能 PR 或团队审批。

## Code Map

- `src/main.tsx` starts the web app and selects the active runtime surface.
- `src/ui/AppShell.tsx` and `src/ui/app-shell/` own the top-level app shell.
- `src/ui/worlds/ChatWorld.tsx` and `src/app/chat/` own chat orchestration.
- `src/ui/worlds/CollectionWorld.tsx` and `src/app/collection/` own the collection/project workspace surface.
- `src/stores/` owns persisted client state projections: `spaceStore`, `chatStore`, `collectionStore`, `personaStore`, and `runtimeStore`.
- `src/engines/` owns reusable logic for requests, providers, tool protocol, task state, cards, themes, attachments, LocalData, and persistence helpers.
- `ios/` and `android/` own Capacitor wrappers and native plugins.
- `workers/polaris-api/` owns the Cloudflare Worker API package.

## Local Development

Install dependencies and start the Vite dev server:

```bash
npm i
npm run dev
```

`npm run dev` starts the frontend Vite server. It does not start a backend by itself. Web builds keep relative `/api` routes on the current origin, and Vite only proxies `/api` when `VITE_POLARIS_API_ORIGIN` is set. For split-origin dev proxying or native internal API routes, copy `.env.example` to `.env.local` and set `VITE_POLARIS_API_ORIGIN` to your own selfhost or relay origin.

Backend/selfhost notes are in [docs/connect-your-own-backend.md](/docs/connect-your-own-backend.md).
Deployment paths are in [DEPLOYMENT.md](/DEPLOYMENT.md).

Common verification commands:

```bash
npm run typecheck
npm run test:data-boundary
npm test
npm run build
```

`npm run verify` runs the main typecheck, extra tool/API typecheck, worker typecheck, the full test suite, and a production build.

## Data And Verification Rules

- Use `.env.example` as the checked-in configuration template and keep fixtures synthetic.
- Treat old Polaris data as an external migration source: import, stage, validate, then promote it into current LocalData rows.
- Tool changes must close the full loop: model visibility, execution, UI evidence, next-turn replay, and focused tests.

---

## Conflux 个人开发

本项目由小欣独立开发和维护。开发规则统一见 [AGENTS.md](AGENTS.md)，技术说明见 [文档目录](docs/README.md)。上述 Polaris 内容为本分支保留的上游技术背景，不规定 Conflux 的产品方向或开发流程。

当前功能开发线是 [`conflux-dev`](https://github.com/yorixiro/conflux/tree/conflux-dev)；本分支仅同步开发规则和导航说明，不代表功能代码已合入 `main`。不要在旧分支新建功能分支或 PR；开始修改前先核对 `conflux-dev` 与实际本地运行的 HEAD。
