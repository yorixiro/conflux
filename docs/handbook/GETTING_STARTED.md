# Getting Started

This page covers local development for the source tree. It does not imply that this checkout
is the live web selfhost source, Android release source, iOS/TestFlight release source, Mac desktop
package source, or App Store review source.

## Install

```bash
npm i
```

## Run The Web App

```bash
npm run dev
```

The Vite dev server serves the shared frontend. It does not start a backend by itself. For
split-origin backend development, copy `.env.example` to `.env.local` and set
`VITE_POLARIS_API_ORIGIN` to a deployer-owned API origin.

## Build

```bash
npm run build
```

This runs TypeScript project build and the Vite production build.

## 日常检查

统一按 [AGENTS.md](../../AGENTS.md) 的五问架构检查和最少验证执行。日常 TypeScript 改动通常运行：

```bash
npm run typecheck
npx vitest run <本次相关测试文件>
```

文档不用跑测试；纯样式检查对应页面即可。只有实际涉及构建、发布或跨模块整合时才加 `npm run build` 或全量回归。数据层按本次风险选定向测试，发布时才考虑 `npm run verify`；不要把它们当作每次修改的必跑清单。

## Native Wrappers

The native wrappers consume the same shared frontend:

```bash
npm run android:sync
npm run ios:sync
```

Build commands are available for Android debug/release and iOS simulator/device targets. Native
build success is a channel-specific proof; it is separate from source-level TypeScript and web
build success.

## Desktop Host Preview

```bash
npm run desktop:dev
npm run desktop:preview
```

These commands exercise desktop host-capability work. Web, iOS, and Android
surfaces should keep using their own platform bridges instead of pretending to
have desktop file or terminal access.

## Where To Start Reading

- Product structure: [Architecture](ARCHITECTURE.md)
- Data model: [Data And Storage](DATA_AND_STORAGE.md)
- Module ownership: [Module notes](README.md#module-notes)
- Backend/selfhost setup: [../connect-your-own-backend.md](../connect-your-own-backend.md)

## Data Rule

Use `.env.example` for configuration shape and synthetic fixtures for
reproduction cases.
