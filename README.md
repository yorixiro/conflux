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

**功能路线不等于已实现或已验收。** 依代码、测试及实际设备验收判断功能状态。

## 项目原则

1. Conflux 现有的自定义主题和交互是产品基线，不恢复旧项目的界面风格。
2. 主题外观与业务逻辑分离；换肤不允许改变聊天归属、角色 ID、模型请求或数据保存机制。
3. UI 尺寸和适配遵循 [Conflux 布局规范](docs/UI_LAYOUT_SPEC.md)；主题可以有自定义尺寸与组件变体。
4. 技术债逐模块审查和替换，目标是减少不必要的旧依赖，而不是全局替换字符串造成新故障。
5. 代码验证、构建、真机验收分开报告；改动必须可追溯。

## 主要代码入口

- `src/ui/app-shell/`：应用导航、侧栏、弹层与界面布局
- `src/ui/worlds/`：聊天、群聊与资料世界
- `src/ui/keke-original/`、`src/config/theme/`：自定义主题与适配层
- `src/app/chat/`、`src/app/persona/`、`src/app/collection/`：核心领域逻辑
- `src/engines/request/`、`src/engines/tool-protocol/`：模型请求和工具事件
- `src/stores/`、`src/engines/localData/`：状态和本地数据
- `src/native/`、`android/`：平台适配

部分旧模块、包名、资源、存储键仍留有历史名称；它们是逐步替换对象，并不构成 Conflux 的设计约束。

## 本地开发

```bash
npm ci
npm run dev
npm run typecheck
npm run build
```

定向修改优先做定向验证。不要为了普通 UI 改动反复执行有费用的模型请求。

## 文档

- [开发规则](AGENTS.md)
- [UI 尺寸与布局规范](docs/UI_LAYOUT_SPEC.md)
- [独立化迁移清单](docs/CONFLUX_INDEPENDENCE_PLAN.md)
- [数据与持久化说明](docs/handbook/DATA_AND_STORAGE.md)
- [来源及许可信息](docs/PROVENANCE.md)

## 许可

本仓库仍包含部分依 AGPL-3.0-only 使用的既有代码，适用条款见 [LICENSE](LICENSE)。代码来源与需要保留的声明集中记录于 [docs/PROVENANCE.md](docs/PROVENANCE.md)。这不代表 Conflux 的视觉或产品方案受旧项目约束。
