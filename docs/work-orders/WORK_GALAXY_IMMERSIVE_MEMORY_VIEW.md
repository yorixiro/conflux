# Work 返工工单｜「心弦 → 记忆图谱」改为真正的沉浸式星河空间

日期：2026-10-30 · 任务状态：**PR 待验收（本轮沉浸式页面已实施，Android 真机未验收）**  
仓库：`yorixiro/conflux` · PR：https://github.com/yorixiro/conflux/pull/8  
继续分支：`feat/heartstring-memory-galaxy`；工单撰写时现有 PR 代码 HEAD：`32be495f16fadfa033bf8ca455c24e21d5848b27`。开始工作时先核对实际 HEAD 和已有修改，**继续原 PR，不要另建一个银河项目，不合并**。

## 用户确认的现状和目标

**用户在 Android 平板上看到并确认现在的真实 Three.js 银河效果很好看，而且可以拖动、缩放，已经接近作者视频。** 现在的问题不是银河渲染，而是页面结构：奶油色 Conflux 中嵌入一块巨大黑色“播放器”，向下滚动仍然出现黑色目录、白色表单和设置开关，整体像把另一个网站塞进了页面。

**目标：点击「心弦」里的「记忆图谱」，直接进入独立的沉浸式银河空间；返回后回到原来的心弦页面。** 星河成为完整的交互页面，而不是嵌入普通内容区的固定高度 Canvas。

### 必须原封不动保留的画面（最重要）

- 以用户当前真机截图认可的 **PR #8 当前 Three.js 效果**为视觉金标准：星盘、密度、白粉色核心、高光 Bloom、色彩、轨道、动画、旋转缩放的手感、默认相机、原版相关参数都不要动。
- **禁止改写 `galaxyTemplateVisual.ts`、粒子算法、分布、Shader、Glow、Bloom、相机初始角度与速度**。若容器变化必须触及 `memoryGalaxyScene.ts`，只做精确的 resize/DPR/资源生命周期适配，逐项说明，不借机“优化”“重构”或者调画质。
- 保持 `three@0.186.0` / React 原有体系，**禁止 iframe、独立浏览器页、新标签页或截图/GIF 替代**，不增加新依赖。

## 交互与布局（已确认，按此执行）

1. **心弦入口**：`HeartstringHub.tsx` 仍保留五个空间。进入「记忆图谱」标签时先显示简洁的入口区域/进入按钮（不再渲染完整三维星河长页面）。点击「进入记忆星河」后在**当前 Conflux 应用内打开全屏沉浸视图**。避免重进死循环，返回后不自动立刻再打开。可继续从已有记忆入口进入，不新增主导航标签。
2. **真正的沉浸式场景**：全屏覆盖**应用实际可用视口**，黑色星空一体延展。银河上方不再看到奶油色 AppTopbar、心弦横向分类条、Conflux 六个底部导航或白色页面边缘。只保留少量必要的星河原生控件：左上「返回心弦」、右上当前角色切换（或简洁选择入口）、原有 `Memory` 标题。尊重 Android 状态栏、手势栏 `safe-area-inset-*`，不得遮挡返回按钮。
3. **导航与生命周期**：使用适合当前 React 应用的上层全屏视图/Portal 或现有路由层（先审查 `AppShellView.tsx`、`MobileAppShellFrame.tsx`、`CollectionWorld.tsx` 的布局状态与叠层机制），**不要仅给 `.memory-galaxy` 设更大的 height**。覆盖下方普通 UI 的同时阻止误触背景，避免 Portal 处于受 transform 限制的祖先中。Android 系统返回键、浏览器 Back、页面内返回/ESC 的行为要一致，返回「心弦」后恢复正常壳层导航，不会意外跳回聊天/退出应用。注意焦点、后台滚动、键盘。
4. **点亮记忆**：沿用真实记忆星点与角色归属，不造假数据。点星星之后使用用户已认可的**星河下缘轻量阅读卡片**（标题、分类、真实来源、正文，可自然展开长内容），不盖住中心星盘，不弹出厚重屏幕、不整页跳转。点击编辑才进入原有 `MemorySettingsTab` 对应记录；编辑可在星河内以轻量管理层处理或短暂切换到有返回途径的管理视图，**不要把一整串设置开关永久堆在星河页面下方**。
5. **记忆分类与目录**：在星河下缘保留「全部 / 记忆条目 / 长期资料 / 对话摘要」四类及真实计数；点按钮筛选对应星点及目录。目录和搜索从下方打开**可收起的底部面板**，保留当前真实记忆选中、翻页与检索能力。选择一条目录项 → 收起目录 → 高亮对应星点并显示同款轻量阅读卡。窄屏按钮可横滚但不挤坏内容。0 条记忆时仍有原背景星河，使用很轻的空提示。
6. **屏幕适配**：Android 平板横/竖屏、窄手机 320px、约 720px 平板、桌面均保证不露出奶油色边框；视口变化时相机和 renderer 正确 resize。分类、底部面板和系统手势栏不互相遮挡；长文阅读空间可滚动，银河 Canvas 不应被页面滚动夺走触摸旋转事件。
7. **功能不退化**：保留原有 `usePersonaStore`、`heartstringMemoryModel`、真实分类、目录、编辑、删除确认、搜索、文档延迟正文读取、向量索引状态和 WebGL 不可用时文字目录降级。不得新造一份记忆存储或隐式迁移用户数据。
8. **GPU 停止与清理**：进入时才挂载 Three.js 场景；正常退出及系统 Back、离屏、切页、WebGL context lost 时沿用已有 RAF/renderer/composer/texture/geometry 释放逻辑；确保回到心弦后没有后台持续渲染或 Canvas 遗留。不额外初始化第二个并发 WebGL 场景。

## 审查范围与测试预算（严格，不要跑多余流程）

- 开工阅读 `AGENTS.md`、本工单、`docs/work-orders/WORK_GALAXY_IMPLEMENTATION_RESULT.md` 及必要的当前 Shell/Heartstring 文件；确认 PR 分支相较现有代码的真实差异。
- 只审查入口、全屏叠层/返回、选择/目录/编辑状态、resize、GPU 释放。必要定向 Vitest 文件即可，**所有代码收尾后最多一次** `npm run typecheck`；如先前存在不相关的壳层类型错误，记录且不得为此反复跑全量检查。构建仅在验证实际预览产物确有必要时做一次。
- **禁止** `npm test` 全量、`npm run verify`、`npm run publication:gate`、例行 `npm run test:pwa`/无意义冒烟、全量 E2E 门禁、哈希检查/快照矩阵、收费模型/API 测试、无关 UI 重构。
- **人工验收重点**：进入星河是否真正沉浸；点击返回是否回心弦且显示常规导航；星点旋转缩放；星河小阅读卡；四类按钮；目录从底部弹出再收起；编辑后星点及目录同步更新；全屏/关闭反复切换是否释放 GPU。能在 Android 真机核实则附截图/结果，不能核实要明确标注“未做真机验收”，不得把浏览器响应式测试当真机通过。

## 交付条件（必须回写）

- **继续 PR #8 原分支**，提交 Commit SHA，保持 Draft/PR 待验收，**不合并**。
- 给用户极简 Termux 预览方式：尽量复用当前 4173 的同一 origin 与同一真实记忆数据，切勿让用户切到 5175 的空记忆数据。任何命令先说明工作区未提交改动保护。
- 更新本工单状态、`docs/work-orders/WORK_GALAXY_IMPLEMENTATION_RESULT.md` 的本轮记录和 `docs/roadmap/CONFLUX_USABILITY_INTEGRATION.md`（已有的独立 PR #9 文档同步也应核对），标明真实开发/测试/设备验收状态、PR、Commit SHA、未完成事项。功能分支文档更新不能替代共享分支进度同步，若不能同步需明确列出。
- 交付实际的星河全屏截图和轻量阅读/目录截图；**现有的漂亮银河画面不允许被破坏或重新设计**。

> 核心验收一句话：**在心弦点「记忆图谱」，像走进一片星河；点亮星星就能阅读记忆；返回就回到心弦，而不是在米色页面里滚动一块黑色网页。**


## 最新增量：透明磨砂玻璃展示层（2026-10-30）

- 状态：**PR 待验收**；原 PR #8 / `feat/heartstring-memory-galaxy` 继续开发，未合并。
- 展示层 Commit：`d78d1a64ee10d7314e03373779b5c79858d16af9`（进度文档提交另计）。
- 运行代码仅改 `src/ui/collection/heartstring/heartstring.css`：移除底部不透明黑色渐变，将目录、阅读卡与分类/工具区组合为四周留边的悬浮玻璃卡。支持时使用 64–68% 深色底与 `backdrop-filter: blur(12px) saturate(115%)` / WebKit 前缀；不支持时使用仍透明的深色底保留可读性。
- 目录/阅读子层背景透明，单张有限面积玻璃表面负责模糊；正文、标题、元信息、分隔线、搜索框、选中分类与悬停/焦点状态同步适配。未加全屏模糊或动态 blur。
- 未修改任何 TS/TSX、Three.js、Shader、光晕、颜色、相机、动画、交互、数据、存储、依赖或资源释放代码。
- 实际浏览器：720px 视口卡片左距 12px、宽 696px；320px 视口左距 12px、宽 296px、底距 12px；两者页面无横向溢出。320 分类 270px 可用宽度 / 398px 内容自行横滚；目录选中、搜索、长文展开、编辑入口与返回保持可用。computed backdrop 为 blur(12px) saturate(1.15)，子目录背景 alpha=0。
- 可读性：正文提高为不透明浅色、400 字重；以纯白背景加 alpha 合成估算，正文对比约 5.05:1、次级文字 4.67:1、搜索提示 4.70:1。为样式估算，不是真机 GPU 测量。
- 本轮只有 CSS 展示改动，未新增或重复逻辑单测。唯一一次类型检查 exit 2，仍为未改动 AppShellView/DesktopAppSidebar 的原 8 处错误，无新增诊断。无 build、全量、冒烟、门禁、哈希或收费 API 测试。
- 实际布局截图：`docs/evidence/galaxy-glass/glass-tablet-directory.png` 与 `glass-tablet-reader.png`。云端仍无 WebGL，截图只证明玻璃卡布局/样式；**真实银河透过玻璃的观感、Android 平板合成性能尚未验收**。用户给的银河截图仅用于对照，没有作为网页背景或测试渲染替代物。
- 预览：复用原 4173 同一地址，更新 PR 分支并刷新。共享进度通过原文档 PR #9 更新，未合并前仍待同步。

## 本轮实施进度

- 状态：**PR 待验收（沉浸式页面已实施，本轮 Android 真机未验收）**；更新日期：2026-10-30。
- 功能分支：`feat/heartstring-memory-galaxy`；PR：https://github.com/yorixiro/conflux/pull/8 。继续原分支，未合并。
- 本轮运行代码 Commit：`02da4f704f4261a39fb414f4578640bdd0c15352`；进度文档提交另计。
- 依据：[沉浸式专门工单](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/work-orders/WORK_GALAXY_IMMERSIVE_MEMORY_VIEW.md) 与[最新 PR 评论](https://github.com/yorixiro/conflux/pull/8#issuecomment-6515221734)。用户已在 Android 平板认可上一轮银河效果，本轮严格保留。
- 已完成：心弦简洁入口 → 应用内全屏星河；覆盖并隔离顶部栏/心弦分类/六导航；返回恢复原心弦与焦点；下缘轻阅读、可收起的底部目录、四分类/搜索/分页；编辑按需进入原 MemorySettingsTab，保留增改删、懒加载和索引管理。全屏页由 AppShell 外层稳定挂载，跨桌面/移动布局切换仍保留记忆选中和阅读状态。
- 视觉保护：`galaxyTemplateVisual.ts`、`memoryGalaxyScene.ts`、数据模型与依赖均未修改；粒子、Shader、Bloom、颜色、相机和动画参数保留。画布尺寸由既有 ResizeObserver 适配全屏，管理视图暂停背景场景，退出沿用原释放机制。
- 验证：最终两份定向 Vitest **5 项通过**；本轮唯一一次 `npm run typecheck` exit 2，仍是原有 AppShellView / DesktopAppSidebar 的 8 处错误，本轮改动无新增诊断。实际应用浏览器检查了进入/返回/ESC/浏览器 Back、筛选、搜索、长短阅读、条目新增/编辑回写、角色切换、跨布局 resize、背景隔离和退出 DOM 卸载。
- 响应式实测：720×860、320×740、1080×660；前两者页面 clientWidth/scrollWidth 分别均为 720/320，窄屏分类 288px 可用宽度、372px 内容独立横滚。浏览器视口测试不等于 Android 真机。
- 截图：`docs/evidence/galaxy-immersive/` 三张为真实浏览器布局/降级证据。**当前云端 WebGL 不可用，黑色区域不代表用户认可的银河被删除，也不作为 GPU 画面通过证据。**
- 待验收：本轮全屏页面在 Android 平板上的旋转/双指缩放/系统返回键、键盘与安全区、GPU 画幅和 FPS/显存；本轮未完成 GPU 真机截图。无全量、冒烟、门禁、哈希、收费 API 或构建。
- 预览：保留原 **4173** 及同一 origin，更新原 PR 分支后进入「心弦 → 记忆图谱 → 进入记忆星河」。步骤见结果记录。
- 共享开发分支进度通过原[文档 PR #9](https://github.com/yorixiro/conflux/pull/9) 更新；未合并前仍待同步。
