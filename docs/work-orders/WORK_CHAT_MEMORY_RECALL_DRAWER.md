# Conflux · AI 消息「记忆浮现」抽屉卡

日期：2026-10-31。状态：PR 待验收（代码实施，运行测试及真机未验收）。
基线：`keke-acp-preview` 的 `aaf7a60e6348170d027d703bd670f55c71e732f5`。
开发分支：`feat/chat-memory-recall-drawer-20261031`。PR：https://github.com/yorixiro/conflux/pull/16 。
功能提交（文档收尾前 HEAD）：`de2a959faff2a8016135abc61b7320dbd122daa0`。

## 目标与实际数据边界

让 AI 回复的真实 `memoryEvidence.items` 从原「更多 → 记忆来源」菜单移到消息正文下方的紧凑「记忆浮现」小卡，点击滑开抽屉查看已有命中来源、原文摘录、对话轮和相似度。
不重复显示原记忆来源菜单，不新增常驻微型操作按钮，不写任何演示数据。

数据来自 `buildChatMemoryEvidenceFromAudit` 的 semanticRecallPlan.selectedCandidates；当前不包含被显式过滤的 `recent_tail`，也不能证明所有长期上下文来源都被这里列出。
仅从 `sourceConversationId/sourceMessageIds` 与 `kind` 推导「聊天记录、语义片段、上下文命中、对话锚点」等有来源的轻标签。用户期待的「最近摘要、关系底座、日记与信、日历待办、用户画像」需要将来由真实上下文编排提供来源类型，绝不通过关键词或展示文本猜测。

## 范围与保护

- 新增共享 React 卡片 + 局部 CSS，控制展开/收起、`aria-expanded` 和 reduced-motion。
- 使用现有 `MessageMemoryEvidence` 展示命中原文；不修改检索、上下文拼装、消息 ID、LocalData 数据、请求、ACP 或记忆库。
- 不更改 `src/ui/keke-original/**` 或已有美化皮肤变量，不修改气泡样式/贴图。
- 与 PR #13（thinking 弹窗）、PR #15（消息收藏、表情）隔离；本 PR 独立 Draft，不合并。
- 用户美化 AI 本地 `dc0090d` 尚未推 GitHub；待推送后定向比较，禁止直接覆盖本地工作树。

## 验证与验收

定向 React SSR 断言覆盖真实标签、默认折叠、英语文案、不猜测分类；**已编写，未运行**。
未执行类型检查、构建、Android 真机/PWA 视觉、付费 API、全量测试。

后续在隔离 worktree 运行 `npx vitest run src/ui/worlds/chat/message/MessageMemoryRecallCard.test.tsx src/ui/worlds/chat/message/MessageMemoryEvidence.test.tsx` 及一次 `npm run typecheck`。
在手机 320px、平板 720px、桌面 1440px 检查：真实命中有卡片、无命中无卡片、抽屉滑动及点击热区、长文内部滚动、三套皮肤、键盘/安全区、刷新已有记忆来源不丢失。PWA/Android 真机必须另行验收。
