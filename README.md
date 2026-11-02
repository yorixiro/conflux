# Conflux

Conflux 是一个独立设计与持续开发的、本地优先的 AI 对话与个人工作空间。产品设计、交互、视觉风格和功能路线由 Conflux 自己决定，不继承旧项目的设计偏好。

技术栈：React、TypeScript、Vite。目标是一套业务核心支持 Web/PWA 与 Android，按需接入本地服务、模型供应商、工具和 MCP。

## 主要功能方向

- 对话、角色身份、模型线路、聊天记录与消息操作
- 长期资料与上下文检索、卡片、收藏和工作区
- 独立可换肤的 UI，允许贴纸、纸张、玻璃、极简等不同布局变体
- Android 平板与手机、Web/PWA 共享功能核心
- 本地优先的数据管理、备份与迁移
- 可选的本地服务和开发代理集成（例如 Devin ACP 预览）

功能进度以当前开发版本为准。

## 项目原则

1. Conflux 现有的自定义主题和交互是产品基线，不恢复旧项目的界面风格。
2. 主题外观与业务逻辑分离；换肤不允许改变聊天归属、角色 ID、模型请求或数据保存机制。
3. UI 尺寸和适配遵循 [Conflux 布局规范](docs/UI_LAYOUT_SPEC.md)；主题可以有自定义尺寸与组件变体。
4. 技术债逐模块审查和替换，目标是减少不必要的旧依赖，而不是全局替换字符串造成新故障。
5. 按实际改动做定向检查，开发流程统一见 [AGENTS.md](AGENTS.md)。

## 主要代码入口

- `src/ui/app-shell/`：应用导航、侧栏、弹层与界面布局
- `src/ui/worlds/`：聊天、群聊与资料世界
- `src/ui/keke-original/`、`src/config/theme/`：自定义主题与适配层
- `src/app/chat/`、`src/app/persona/`、`src/app/collection/`：核心领域逻辑
- `src/engines/request/`、`src/engines/tool-protocol/`：模型请求和工具事件
- `src/stores/`、`src/engines/localData/`：状态和本地数据
- `src/native/`、`android/`：平台适配

部分旧模块、包名、资源、存储键仍留有历史名称；它们是逐步替换对象，并不构成 Conflux 的设计约束。

## 当前开发入口

- **唯一日常开发分支：`conflux-dev`**。此前的 `feat/keke-original-theme-port` 是历史美化分支，`keke-acp-preview` 等为历史开发/对照分支，`main` 保留旧代码，不代表当前运行版本。
- 现有 ACP 修复、三套聊天皮肤相关代码及 2026-11-01 两批已审核的无引用文件删除已汇入 `conflux-dev`。这不代表其他所有旧 PR 功能都完成整合。
- 不为了小修复另建分支或 PR；旧分支及 PR 在确认现有功能等效、无独立成果后才归档。当前运行代码、上游提交与本地工作区都应在修改前核对。

## 本地开发

Termux 的现有应用入口是 **4173**；不要把普通 Vite 开发默认端口误作平板正在使用的地址。先确认原服务状态，按项目现有环境启动：

```bash
npm run termux:dev
```

需要同时启动本地 Devin ACP 桥接时，沿用 `bash tools/termux-acp-dev.sh`（该脚本在 4173 或 47831 已被占用时会拒绝重复启动）。

仅对本次修改做必要的定向检查，功能变动可运行 `npm run typecheck` 及相关单测，不为普通 UI 修复重跑全量测试或调用付费模型。

## 文档

- [开发规则](AGENTS.md)
- [UI 尺寸与布局规范](docs/UI_LAYOUT_SPEC.md)
- [架构与技术决策](docs/CONFLUX_ARCHITECTURE.md)
- [数据与持久化说明](docs/handbook/DATA_AND_STORAGE.md)
- [来源及许可信息](docs/PROVENANCE.md)

## 许可

本仓库仍包含部分依 AGPL-3.0-only 使用的既有代码，适用条款见 [LICENSE](LICENSE)。代码来源与需要保留的声明集中记录于 [docs/PROVENANCE.md](docs/PROVENANCE.md)。这不代表 Conflux 的视觉或产品方案受旧项目约束。
