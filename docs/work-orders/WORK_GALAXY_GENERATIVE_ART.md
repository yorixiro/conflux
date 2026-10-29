# Work 工单｜「心弦」银河式记忆知识图谱·现有页面定向升级

> **用户更正（优先级最高）**：银河教程是为了把 `心弦 → 记忆图谱` 从四张统计卡片升级成有动态粒子/星系感的**真实、可操作的记忆关系图**。它不是无关的独立数字艺术实验。之前本工单中的“禁止接入心弦”要求已废止，本文件完全取代旧版工单。

## 2026-10-30 视觉返工（覆盖此前自由设计方向）

继续原 PR #8 分支，执行最新三条视觉评论，最后确认以 https://github.com/yorixiro/conflux/pull/8#issuecomment-6509945650 为准。作者视频是视觉参考，当前下载模板是技术参考；必须分别记录原版与集成版运行结果。使用银河下缘轻阅读区与下方四类按钮，不能再使用覆盖星盘的实体大浮窗。用户已有 4173 Vite，复用其原地址。

## 仓库与基线

- 仓库：`yorixiro/conflux`
- 基线：`feat/keke-devin-acp-preview-20261030`。撰写时 HEAD 为 `3bca958a61504cfe8ed318ceb8218acea8cc9901`；Work 开工时必须核对远端 HEAD 并从当前最新开发提交派生**隔离功能分支**，不能使用旧 main。
- 教程参考：https://chat.xiaoke.love/galaxy-tutorial/ 。原作者视频截图是本轮视觉参考；当前教程可能与视频版本不同，需运行截图对照，优先保留原始渲染参数；站点无法访问就注明参考未核实，不得声称精确复刻。
- 技术：现有 React + TypeScript + `three@0.186.0`；优先复用已有 Three.js、性能和资源释放实践，不为小改动重造引擎。
- 目标页面：`src/ui/collection/heartstring/HeartstringMemoryAtlas.tsx`、`heartstring.css`、`heartstringMemoryModel.ts`；旧有 `MemorySettingsTab`、`usePersonaStore` 保持原数据管理入口。

## 明确的第一版（MVP）

把目前「角色居中 + 四类记忆计数卡」替换为在 **记忆图谱区域实际工作**的三维/准三维银河可视化；下方原来的记忆编辑能力保留或改为同页侧面板，不能让它消失。

1. **真实节点**：当前角色为根节点；实际 `personalMemories: string[]` 每条非空内容、`referenceDocs`（有 ID）、`conversationSummaries`（有 ID）各可形成独立可选节点；`vectorIndex` 属于索引运行状态，不是记忆实体，只作为可选状态信息显示，**不把 indexedChunkCount 伪装成同等数量的记忆节点**。数据为空时优雅展示空星系+提示。
2. **真实关联**：首期连线仅表示已证实的归属关系（角色→资料/条目/摘要）；摘要与聊天记录可以使用真实的 `sourceConversationIds` / `sourceMessageIds` 做有来源的连接或详情链接，只有目标记录确实存在并可访问时才绘制。记忆条目目前无稳定 ID、无 provenance，**禁止通过相似词猜测已存在语义关系**；不要假设它们能直接可靠相连。
3. **视觉语言**：真实 GPU/WebGL 粒子、银河式空间层次、缓慢运动、轻柔辉光和景深；**记忆实体必须与装饰星尘区分**，不同类别有区别但不牺牲文字可读性。视觉要让人联想到星系/知识宇宙，而不是“普通统计卡漂浮在星星背景上”。尽量不加大依赖；可用 Three.js Points/ShaderMaterial，或有依据的 TSL 实现。
4. **基本交互**：在手机/平板可触摸，点击/点按真实记忆节点可查看其文字、类型、来源与修改入口；选中状态有明确高亮，能返回图谱、切换角色、回到心弦其他页面。沿用 `MemorySettingsTab` 已有的增改删逻辑和确认机制，切勿创造第二份记忆库或把图形模拟数据写进持久化。
5. **响应式及无障碍**：兼容 Android 手机/平板 Web/PWA；画布渲染失败时，提供可用的非 WebGL 分类列表而非白屏；保留必要的文字列表/键盘可达路径；长记忆文本不能压住界面。
6. **性能边界**：按视口/DPR 限制背景粒子、节点数量及特效，必要时抽样**只减少绘制的装饰，不减少真实记忆管理数据**；Resize / 页面隐藏 / 切换标签 / 组件卸载时停止 RAF、释放相关 Three.js 资源/事件监听。不得让心弦 3D 收藏册与图谱后台同时持续高频渲染。
7. **开发范围严格限定**：主要在 `heartstring/`、相关测试和必要的图谱入口接线。不得改克克主题、聊天框、角色/会话所有权、ACP、数据库 schema、PWA 缓存、主导航，也不得删除旧记忆。**新图谱在独立功能分支实现，通过隔离预览或未合并 PR 交付；用户验收前不合并进现有开发分支**。

## 现有数据模型的真实限制（先检查再编码）

- `Persona.memory.personalMemories` 是字符串数组，目前不存在记忆 ID。
- `referenceDocs` 有 `id,title,summary,source,updatedAt`，正文可能延迟加载；不得宣称已读取所有正文。
- `conversationSummaries` 有 `id,kind,title,content,sourceConversationIds,sourceMessageIds`，可用于证实某些来源；会话本体可能不在当前载入集合中。
- `vectorIndex.indexedChunkCount` 是索引计数，不能当成图中的记忆条目。
- 在本次工作中先做**可验证的来源图 + 粒子视觉 + 节点详情**。真正自动发现语义关联、历史纠错记录的完整知识图谱属于后续单独功能，不能为了效果随意编造边。
- 不新增收费 embedding/模型调用，不自动整理、重建、删除记忆。

## 定向审查与测试限额（严格）

- 只检查新图谱数据映射：非空条目、删除条目、重复字符串、文档延迟加载、摘要孤立来源、换角色、空数据的处理；定向 Vitest 仅运行新增/相关文件。
- 只检查新场景的生命周期、内存/显存释放、标签切换、点击选中、Resize 与低端 Android 降级；避免无关系统回归。
- 开发完成后最多一次 `npm run typecheck`，确需产物才最多一次 `npm run build`；不得频繁重复执行。
- **禁止**例行 `npm test` 全量、`npm run verify`、`npm run publication:gate`、`npm run test:pwa` 常规冒烟、哈希/快照矩阵、大量 E2E 门禁、收费 API 测试、无意义压力测试与不相关文件审查。
- 有条件则在 320px 手机、720px 平板和桌面窗口实测图谱；做不到须写明未测，不虚构帧率或设备测试结果。

## Work 交付

- PR/独立分支、Commit SHA、明确的预览步骤（Termux 上不能覆盖当前聊天和 ACP 正在运行的会话）。
- 两三张必要的实际效果截图或简短演示记录，说明与教程区别。
- **可核对**的真实节点数/来源、可用交互、场景资源回收路径。
- 定向测试实际结果及未执行项目，不拿“代码提交”冒充真机已通过。

**验收的核心不是做完一个漂亮的 Galaxy Demo，而是打开 Conflux「心弦 → 记忆图谱」，能够在一片有空间感的粒子星系里看见并点选自己的真实记忆。**


### Galaxy 记忆图谱 · 本轮交付进度

- 状态：**PR 待验收（视觉返工代码已提交，视觉尚未验收）**；更新日期：2026-10-30。
- 功能分支：`feat/heartstring-memory-galaxy`；功能 PR：https://github.com/yorixiro/conflux/pull/8 。未合并。
- 本轮运行代码 Commit：`5526629085b16a441962ac2e5a39d61ce804954e`（进度文档提交另计）。
- 已处理：按 PR #8 最后三条返工评论，恢复教程双旋臂/14000 盘面粒子/6400 远星、原配色与相机、Sprite 中心光晕和 Bloom；下缘轻阅读区取代覆盖浮窗，长文在自然页面流展开，点选/关闭不滚动整页；四类按钮筛选星点和目录，编辑沿用原记忆库。
- 验证：相关 Vitest 两文件合计 10 项通过；唯一一次类型检查 exit 2，仍是未修改 AppShellView / DesktopAppSidebar 的 8 处诊断，本轮图谱文件未新增诊断；720px iframe 中短文/长文/分类/编辑回写通过，320px iframe 无页面横向溢出；离开图谱后 DOM 卸载。
- 实际截图：`docs/evidence/galaxy-rework/` 包含平板短文、长文和 320px 默认布局，以及原教程未能渲染的截图。**均不能作为 GPU 视觉合格证据**；当前云浏览器 WebGL 被禁用。
- 未验收：作者视频 vs 当前教程 vs 集成版的 GPU 同视角对照、着色器实机效果、Android 平板触摸/FPS/显存/底部导航覆盖；教程未附独立 OSS 许可证，通用公开再分发授权尚未明确。
- 预览：复用用户当前 **4173 Vite** 与原地址，不再安排 5175。更新步骤见 `docs/work-orders/WORK_GALAXY_IMPLEMENTATION_RESULT.md`。
- 共享分支进度继续经 [文档 PR #9](https://github.com/yorixiro/conflux/pull/9) 同步，未合并前仍待同步；未运行全量、冒烟、门禁、哈希或收费 API。

