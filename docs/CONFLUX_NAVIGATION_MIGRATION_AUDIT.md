# Conflux 导航与功能迁移审计（首轮）

日期：2026-10-21。基线：`feat/conflux-shell-pwa`。实施分支：`feat/conflux-home-navigation-20261021`。

## 产品决定
- **Polaris 是业务底座，不是最终导航或 UI 规范。** 顶层由 Conflux 统一拥有首页、聊天、资料及个人空间的路由/导航。
- 首页是真实应用页面而非 demo HTML。卡片只负责呈现 Polaris 已有数据与跳转，绝不新建聊天记录副本。
- Claude 的三套聊天主题（云雾/玫瑰/铅笔贴纸）保留为视觉迁移目标，**未接入**，不拿截图假装完成。不得改变原型素材和自画气泡替代。
- IB 的 Room/Blog/Letters/Memory/Music/Profile 等作为**待审计的独立 feature**，不硬塞到 Polaris 的 `CollectionShelf` 里。
- Web/PWA 和 Android 使用同一份 React UI，平台能力留在 Capacitor adapter；Provider 不做小模型自动路由。

## 代码路径核对（事实 / 状态）

| 来源 | 模块 | 所在路径或证据 | 结论 |
| --- | --- | --- | --- |
| Polaris | 世界容器：collection/chat/group | `src/ui/app-shell/AppShellView.tsx` | 已有代码，导航不是新 Conflux 首页 |
| Polaris | 会话导航、创建、选择 | `src/ui/app-shell/useAppShellNavigationActions.ts`, `useAppShellController.ts` | 已有可调用 actions；实机/端到端未重新验收 |
| Polaris | 真实对话摘要 | `src/app/collection/conversationCardSummary.ts` | 有 ID、标题、最新摘录、时间戳；本次直接复用 |
| Polaris | 消息列表与输入框 | `src/ui/worlds/ChatWorld.tsx`; timeline/composer 下属模块 | 已有代码；模型网络能力依赖实际 Provider |
| Polaris | 收藏：会话、项目、代码、图片、角色资料 | `src/ui/worlds/CollectionWorld.tsx`, `collectionShelfNav.ts` | 有入口与 UI；逐功能验收仍需进行 |
| Polaris | 移动顶栏与桌面侧栏 | `src/ui/shell/AppTopbar.tsx`, `src/ui/app-shell/DesktopAppSidebar.tsx` | 已有不同导航样式，本次加回首页入口 |
| IB | Room / Chat / Blog / Letters / Memory / Music / Profile / API / DIY | `yorixiro/InternalBeyond` 的 README / `InternalBeyond.html` | 原项目声明有 9 个模块；迁到 React/Polaris 的数据接口**未完成**，需逐个审计源码和验证 |
| 花信 | React 迁移、聊天、视觉 tokens、legacy 兼容 | `yorixiro/huaxin/src/features/`, `src/chat/`, `src/styles/design-tokens.css` | 只迁稳定 owner，不搬 iframe 全壳和重复监听器 |
| EH-UI | MessageBubble / Starfield / NoiseOverlay / decor | `yorixiro/EH-UI/components/` 与 README | 组件可拆，视觉迁移候选，需核对依赖 |
| Claude 原型 | 三套聊天主题与界面 | 独立 `app.html` 原型（当前不在 Conflux 源树） | 仅视觉/演示交互；**未连真实消息**，移植须先拆视觉和交互职责 |
| Aru | 具体代码和授权范围 | 尚未在当前用户仓库发现可用源代码 | 待提供源路径与逐模块审计，不猜功能 |

## 本次真正实现的范围

1. 新增 `ConfluxHome.tsx` 和 `ConfluxHome.css`，仅展示**现有真实会话**，空列表展示真空状态，不使用假人物/聊天/天气。
2. 从 `desktopSidebarProps.conversations` 获取已受角色 scope 过滤的摘要；复用 `onOpenConversation`、`onCreateConversation`、`onSelectShelf`、`onOpenGroupWorld`。真实数据由原 stores / controllers 继续持有。
3. 从首页进入会话或功能页时关闭首页；在移动顶栏和桌面侧栏增加返回首页操作。
4. 宽屏使用主会话区与功能索引分栏；小屏切成单列。无固定 520px 模拟手机画布。
5. 不修改聊天发送、Provider、LocalData、角色、记忆、群聊或 SW。

## 风险、验证门槛与后续

**未完成的验收**：需要执行 `npm run typecheck`、`npm run build` 和真机/浏览器点按冒烟。本次 GitHub 连接器仅做源码更改，不声称已经跑过这些测试。

建议验收矩阵：
- 新装空数据：首页能打开，空会话状态无伪数据；无角色时新建按钮禁用。
- 已有数据：最近对话显示真实标题/最后摘录；点击正确会话并继续发送；重启后历史仍在原 LocalData。
- 切换角色：首页的近期对话列表遵守当前角色 scope，不泄露其他角色的私有会话。
- 手机/平板/桌面：主页实际适配，不产生横向溢出；手机顶部栏、桌面侧边栏都能回首页。
- 旧能力回归：对话流、群聊、角色信息、收藏/代码/图像卡片、设置、主题仍可进入。
- 新视觉：Claude 三套气泡/背景改造需按原型 DOM/CSS/资源拆迁，接入现有 Timeline/Composer，不能整体 iframe 把真聊天藏起来。

**下一阶段优先级**：
P0. 在 Termux 或 CI 完成源码构建 + PWA 验收，修复任何 TS/布局/启动问题。
P1. Claude 原型视觉组件拆分与真实 ChatWorld 对接；完成发消息、保存、恢复完整路径。
P2. 逐个定义 IB/花信迁移 adapter（Diary、Letters、MemoryGraph、Room、Music），明确数据结构与导入/回滚。
P3. 再审 Aru 功能和许可证，决定移植范围；统一交互规格、主题 tokens 和跨端发布验收。

禁止为迁移便利篡改原存储或直接覆盖已有本地用户数据；测试 fixture 不得混入真实首页。
