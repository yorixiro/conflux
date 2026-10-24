# Conflux P0 基线审计（进行中）

审计日期：2026-10-23
审计对象：`yorixiro/conflux` / `feat/conflux-bottom-navigation`；开始审计时 HEAD 为 `64ef81b798c6c61b9bc698fec82d565b8b7296d5`。
状态：**仅完成源码/文档静态核对的第一部分；P0 尚未通过。不得把本报告当作已构建、已合并或手机已更新的证明。**

## 用户可理解的当前结论

- Conflux 已有唯一的请求准备和上下文拼装链路；不需要再单独造“第二套预设注入器”。
- 已有按角色的手动记忆、对话摘要、跨对话召回、向量候选和 Token 预算相关代码，但这些并不表示全部功能均已开启或经过端到端验收。
- 已有开发用的 RequestDebugOverlay / 请求检查器，可作为今后“本次给 AI 发了哪些材料”预览的依据；现在属于开发调试界面，不等于面向普通人的正式预览功能。
- Anthropic 显式前缀缓存计划及其他线路的自动/未知缓存状态已有代码。缓存命中、实际账单和长期记忆是不同的事，不能混成一个开关。
- 自动对话摘要的发布门禁当前为 `false`，本次**没有开启**；也没有发送付费请求、改变历史数据格式或创建新的记忆数据库。

## 静态核对的所有者与链路

| 责任 | 已核对文件与行为 | 下一步验收 |
| --- | --- | --- |
| 聊天请求入口 | `src/engines/request/requestPipeline.ts` 的 `requestCollaboratorReply` 调用 `prepareCollaboratorReplyRequest`，再进入 `requestAssistantReply` | 验证失败、取消、重试与审计一致性 |
| 单一拼装器 | `src/engines/request/requestPreparation.ts` 选择人格、能力、预算、记忆、摘要、召回、工具，再调用 `assembleAssistantContext` | 合成数据核对实际消息顺序和权限 |
| 人设与预设 | `src/engines/request/requestPromptLayers.ts` 的 `buildAssistantPromptParts` 划分身份、能力、运行/上下文材料；人设编译通过 `resolvePersonaPromptForRuntimeSpec` | 校验角色切换、提示顺序和动态内容 |
| 聊天记录与裁剪 | `requestConversationPreparation.ts` 处理模板、正则、卡片引用；`requestContextPlan.ts` 保留最新用户消息，按条数及 Token 预算筛选，并保护关联工具结果 | 边界输入、超额和孤儿工具回执测试 |
| 已有记忆 | `requestMemoryPlan.ts` 从当前和允许继承的角色记忆中按预算选行；`requestConversationSummaryPlan.ts` 选择摘要；`requestSemanticRecallPlan.ts`、`requestSemanticVectorRecall.ts` 处理召回候选 | 确认跨角色隔离、召回质量、来源可追溯 |
| 自动摘要门禁 | `src/config/memoryReleaseGates.ts` 的 `enableAutomaticConversationSummary: false`；`src/app/chat/useAutomaticConversationSummaryMemory.ts` 同时要求设置、数据 hydration 和无待保存/加载对话才触发 | 保持关闭，等用户明确启用并验证持久化后再评估 |
| 缓存计划 | `requestCachePlan.ts` 为 Anthropic 显式前缀规划身份与能力断点，设置 1h TTL；其他协议可以是“自动/未知”或不适用 | 逐服务商验证真实请求、响应 usage 和费用，不以计划冒充命中 |
| 可检查性 | `requestPreparationAudit.ts`、`requestInspector.ts`、`src/ui/RequestDebugOverlay.tsx` 和 `useRequestDebugState.ts` 已有预估 Token、上下文段、裁剪、缓存计划的审计展示；需开发模式或 debugRequest 路径 | 设计面向普通人的脱敏预览：默认不显示 API Key、私密日记、原始敏感正文 |
| 持久化边界 | `docs/handbook/DATA_AND_STORAGE.md`：Persona/Document/Chat 通过已有 LocalData 归属保存；UI store 不是新数据库 | 现有持久化测试及真实重启读回 |

### 本阶段不做的事

- 不创建第二套上下文、记忆或缓存实现；不照搬 IB 的整份 index.html。
- 不在 P0 未通过时开启自动摘要、向量索引、外部 Agent、日记后台读取或跨仓导入。
- 不删除、覆盖、自动整理已有聊天和记忆；私人日记默认不进入模型上下文。
- 不修改六个底部入口、角色资料布局、消息存储和用户安装的 PWA。

## 验收状态（不得将未运行写为通过）

| 项目 | 结果 |
| --- | --- |
| 读取仓库 AGENTS.md、架构/迁移矩阵/交接/LocalData 文档、package.json 与 Capacitor 配置 | **已完成静态核对** |
| 读取上述上下文/记忆/缓存源码 | **已完成静态核对** |
| `npm ci`、`npm run verify` | **未执行**（此次仅使用 GitHub 仓库连接，未取得可运行该仓库的构建工作目录） |
| `npm run android:build-debug` | **未执行**（未验证 Android SDK/Gradle 环境） |
| Android 真机、已安装 PWA、真实模型 API、缓存命中 | **未验收** |
| Polaris 上游、IB-Mobile、Aru Host 的完整版本/许可证证据与跨仓来源锁定 | **待补完 P0** |
| 单端数据重启恢复、错误恢复、导入回滚、双端同 commit 证明 | **待验证** |

## 后续顺序

1. **先补全 P0**：固定来源 SHAs/许可证、运行构建及现有相关测试、补充实际日志与故障清单；不更改用户数据。
2. **P0 通过之后**：在现有 Request Inspector 上做可读、脱敏的“本次上下文预览/材料清单”，复用审计输出，先不改变真实请求语义。
3. 再验收角色预设作用域、模型线路、缓存 usage、手动记忆的读回；自动摘要与智能召回按单独权限和测试逐步开放。
4. 日记时间轴、主动 Agent、邮箱相册等外部接入留待后续阶段，不挤占当下的聊天内核工作。

本报告是第一份可追溯的 P0 检查点，后续补充实测日志后才能将 P0 标记为通过。

## 2026-10-24 P0 复检与最小修复

以 `feat/conflux-bottom-navigation` 的 `b08870062d278c34e551ebed56ae7f52f32c83c2` 为起点，在全新隔离工作目录检查；初始 `git status --short --branch` 干净，与远端一致。未使用任何真实用户聊天、角色或密钥。

| 实际执行 | 结果 |
| --- | --- |
| `npm ci` | 成功，安装 419 个包。 |
| `npm run build`（修改前） | 成功，TypeScript 与 Vite 构建通过；保留既有混合静态/动态导入和大 chunk 警告。 |
| `npm test --`（12 个与导航、聊天动作、角色线路、Token、SW 相关的既有测试文件） | 12 个文件、79 项通过。 |
| `npm run verify`（修改前） | 类型与 worker 检查通过；全量 491 个文件中 490 个通过、1 个失败，3116 项中 3115 项通过。失败为 `startupFactSourceBoundary.test.ts` 对 `AppShellView` 不得直接使用 hooks 的约束。 |
| 定点修复 | 将右侧快捷设置抽屉的 `quickSettingsOpen` 状态和页面切换时的关闭 effect 从 `AppShellView.tsx` 移至既有 `useAppShellViewController.ts`，`AppShell.tsx` 传入 `homeOpen`。未改样式、接口、存储或请求行为。 |
| `npm test -- src/stores/startupFactSourceBoundary.test.ts` | 1 个文件、37 项通过。 |
| `npm run verify`（修改后） | **全部通过**：类型、extra 类型、worker 类型、491 个文件/3116 项单测及生产构建（1182 个模块）。 |
| `git diff --check` | 通过。 |
| `npm run test:pwa` | **环境阻塞**：Playwright Chromium 可执行文件不存在。尝试 `npx playwright install chromium` 时下载返回损坏 ZIP，无法启动隔离浏览器。不能记为 PWA 通过。 |

本环境无可运行的 Chromium 和图形显示，**320px 手机、720px 平板、1440px 桌面的浏览器实际交互、安装版 PWA 更新/离线接管尚未复测**。SW 相关现有单测通过，不替代真实浏览器验收。Android APK、安卓真机、真实模型请求和用户设备数据均未接触。P0 仍未全部通过；后续需要在具备浏览器的环境补做三屏隔离测试及 PWA 更新，并在 Termux 上验证已安装 PWA。
