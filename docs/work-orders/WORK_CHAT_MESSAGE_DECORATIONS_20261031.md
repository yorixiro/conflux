# Conflux · 真实消息收藏标记与表情回应

状态：**PR 待验收**。基线 `keke-acp-preview` / `aaf7a60e6348170d027d703bd670f55c71e732f5`；分支 `feat/chat-message-decorations-realdata-20261031`。

本轮：消息自身持久存储 `isFavorite` 与 `reactions`，消息操作菜单沿用既有 React 组件；使用原 `ensureConversationWritable/updateMessage/persistToDb`，不新增数据库和 schema 迁移，不改三套皮肤 CSS/资产、ACP、记忆、工具。

未完成：P2 心弦收藏的来源索引和反向跳转；引用草稿/气泡、编辑态细化。美化 AI 的本地提交 `dc0090d` 尚未 push，未验证冲突。

验证：已写定向 Vitest，但**未运行**。类型检查、Vite build、安卓平板/PWA 真机都**未运行**。请在独立 worktree 跑定向 Vitest 与一次 typecheck，真机验证收藏/取消、多个表情独立切换、刷新/重启持久化，及 320/720/1440 菜单、输入法遮挡。不得合并或覆盖 Termux 美化分支。
