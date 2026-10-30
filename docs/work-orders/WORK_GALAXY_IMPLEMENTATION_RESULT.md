# PR #8 沉浸式记忆星河 · 本轮交付记录

状态：**PR 待验收；用户认可的银河保持原样，本轮沉浸页面待 Android 真机验收**。更新日期：2026-10-30。

- PR：https://github.com/yorixiro/conflux/pull/8（Draft / 未合并）。
- 分支：`feat/heartstring-memory-galaxy`；本轮起点 `1793c98eace808db6f07e0659bc82878b956adf8`。
- 本轮运行代码 Commit：`02da4f704f4261a39fb414f4578640bdd0c15352`；后续进度文档提交另计。
- 已读 `WORK_GALAXY_IMMERSIVE_MEMORY_VIEW.md` 与最新 PR 评论 6515221734；未发现额外的 inline review threads。

## 这次实际修改

- `HeartstringHub.tsx`：保留五个空间；记忆图谱标签只显示「进入记忆星河」，进入前不挂载场景，返回后仍停留入口，不自动重开。
- `MemoryGalaxyFullscreen.tsx`：由 `AppShell.tsx` 的一处 Provider 接线稳定持有全屏页；Portal 放在 document.body，native modal top layer 脱离主题 transform、裁剪和层叠上下文。全屏隔离背景点击/焦点、锁后台滚动，覆盖顶部栏、心弦分类和六导航；关闭恢复滚动及入口焦点。AppShellView、MobileAppShellFrame、CollectionWorld 只做定向阅读，无改动。
- `memoryViewNavigation.ts`：显式进入时添加同 URL 的一层 history，目录/管理只占一个子层。浏览器 Back、ESC、原生 Android backButton 接到同一返回动作：先收起子层，再回心弦；左上「返回心弦」可直接退出两层。卸载移除 history/native/store 监听，避免重复触发。原条目编辑失焦保存也适用于浏览器 Back；资料/摘要仍使用原有明确保存和删除确认。
- `HeartstringMemoryAtlas.tsx` / `heartstring.css`：画布铺满视口，原 Memory 标题、左上返回、右上角色选择；下缘轻阅读与四类计数；底部目录可收起，选择后收起目录并点亮真实星点；搜索、分页和失效选中清理保留。长文在下缘阅读流内展开，下缘阅读区域可滚动，画布不随正文滚走。
- 原 MemorySettingsTab 只在点击「编辑」/「记忆库」时挂载为带「返回星河」的管理视图，不再把白色设置永久堆在星河下面。管理时背景 inert 且暂停场景，退出恢复原暂停状态；全部原记忆库功能继续由同一个组件/Store 处理。
- 安全区与键盘复用现有 viewport-height / viewport-offset-top / keyboard-bridge-offset，未修改全局键盘或导航实现。

**严格未修改** `galaxyTemplateVisual.ts`、`memoryGalaxyScene.ts`、`heartstringMemoryModel.ts`、粒子/Shader/Glow/Bloom、配色、相机/动画参数及依赖。全屏导致画幅宽高比变化，由原有 resize 路径处理；没有通过更换镜头或降低画质来适配。

## 实际验证

本轮只执行必要定向测试与一次类型检查，没有 build、全量测试、verify、PWA 冒烟、门禁、哈希检查或收费调用。

- 最终 `npx vitest run src/ui/collection/heartstring/memoryViewNavigation.test.ts src/ui/collection/heartstring/memoryGalaxyScene.test.ts`：**2 文件、5 项通过**。覆盖返回栈、重复进入/退出、异步返回防重入、条目失焦回调，以及原场景 resize/隐藏/离屏/context lost/资源只释放一次。
- **唯一一次** `npm run typecheck`：exit 2，共 8 处既存诊断：AppShellView.tsx:256 的 onOpenHome（TS2339），DesktopAppSidebar.tsx:189/192/221/223/333/409/490 的 hub/sidebar 比较（TS2367）。这些文件未修改，本轮改动无新增诊断；没有为此重跑类型检查或扩展到无关壳层修复。
- 实际预览使用完整 AppShell/真实 HeartstringHub，不是重画原型。1363×936 桌面页面的 modal 边界为 (0,0,1363,936)；720×860 平板视口为 (0,0,720,860)，只有星河控件进入可访问树，原导航被原生 modal 隔离。
- 实际从原 MemorySettingsTab 新增两条隔离验收文字（一短一长），并从阅读卡定位编辑；保存后目录即时更新。另测输入新内容后不按回车直接浏览器 Back，原条目的失焦保存生效。未调用任何模型/API。
- 四类目录结果依次为 2 / 2 / 0 / 0；搜索「长文验收」为 1 条；点目录后自动收起；字符串条目没有伪造日期；切换到 0 记忆角色后旧详情清理。本轮未用非空资料/摘要重新跑一遍完整管理流程，其原组件和懒加载接线保持。
- 505 字长文可完整展开：720 视口阅读容器约 310px、正文/卡片总高约 527px；320 视口阅读容器约 266px、内容约 1116px；正文 overflow:visible，只有下缘阅读区滚动，页面 scrollY 为 0。
- 720 与 320 页面 clientWidth/scrollWidth 分别为 720/720、320/320；320 分类条 288px 容器/372px 内容可独立横滚。
- 修复了响应式壳层重新挂载带走子页的问题：720×860 → 1080×660 → 720×860 → 320×740 后，同一选中记忆及展开状态保持，modal 持续存在；未因换布局回心弦。正常退出后，心弦记忆图谱入口、顶部栏和六导航恢复，modal/场景 DOM 为 0，body overflow 恢复，焦点回入口。
- 场景资源清理仍由原 createMemoryGalaxyScene 的卸载路径负责；定向测试使用真实几何/材质/纹理和替身 renderer。没有把 DOM 卸载或替身测试说成显存实测。

## 实际截图与未验收事项

以下 PNG 来自浏览器实际运行的 Conflux 页面；平板/手机尺寸使用临时 QA 视口容器，截图裁切到实际应用视口。**QA 容器及上传端点已移除，交付的应用没有 iframe。** 内容是云端隔离验收条目，不是用户的私人记忆。

- [720×860 全屏下缘阅读](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/evidence/galaxy-immersive/immersive-tablet-reader.png)
- [720×860 可收起的底部目录](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/evidence/galaxy-immersive/immersive-tablet-directory.png)
- [320×740 长文阅读与横滚分类](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/evidence/galaxy-immersive/immersive-mobile-long.png)

**云端 WebGL 仍不可用，上述黑色区域仅是降级/布局证据，不代表删除了用户已经认可的银河。** 上一轮银河外观已由用户在 Android 平板确认好看且可旋转；本轮全屏下的实际 GPU 画幅、触摸手感、系统返回键、软键盘/状态栏/手势安全区、FPS/显存及安装 PWA 尚未真机验收。不能把浏览器响应式测试当作 Android 已通过。

## 继续使用原来的 4173

保留正在运行 Vite 的 Termux 窗口。在另一个命令窗口更新；Git 若提示未提交内容会被覆盖，保留修改并停止，不强制切换：

```bash
cd ~/my_st_termux/conflux &&
git fetch origin feat/heartstring-memory-galaxy &&
git switch --detach FETCH_HEAD
```

刷新原 **4173 的同一地址/主机名** → 心弦 → 记忆图谱 → **进入记忆星河**。不换 origin、不重装依赖、不清数据。检查左上返回、点星/目录选择、下缘阅读、四类筛选和编辑后返回；平板横竖屏及系统返回键仍需真机确认。此操作只预览原 PR，不合并。

工单与路线图已回写；共享开发分支进度通过原[文档 PR #9](https://github.com/yorixiro/conflux/pull/9) 更新，未合并前仍待同步。

---

## 上一轮视觉返工记录（历史，以下验收状态属于上一轮）

# PR #8 银河视觉返工记录

状态：**PR 待验收；GPU 视觉尚未验收**。更新日期：2026-10-30。

- PR：https://github.com/yorixiro/conflux/pull/8
- 继续分支：`feat/heartstring-memory-galaxy`，返工起点 `89cddd2b6886d20e80d6562479e1522842c694a5`。
- 返工运行代码：`5526629085b16a441962ac2e5a39d61ce804954e`；后续进度文档提交另计。
- 已读取最近的三条视觉返工评论（6509583298、6509738745、6509945650），最后一条已确认的「银河 + 下缘轻阅读区 + 下方真实分类」为布局依据。未合并、未部署。

## 原版核实与来源

已实际下载以下公开资源，而不是仅根据视频截图推测源码：

- 教程页：https://chat.xiaoke.love/galaxy-tutorial/
- 完整 HTML/JS 模板：https://chat.xiaoke.love/galaxy-tutorial/galaxy-template.html
- 配套教程：https://chat.xiaoke.love/galaxy-tutorial/记忆银河搭建教程.md

教程提供的是可直接运行的单文件模板及定制说明，未提供 GitHub 仓库入口。原模板从 jsDelivr 加载 Three.js 0.160.0 及字体；有内嵌演示记忆，在 memory.json 读取失败时使用。作者在教程中明确邀请读者将模板交给 AI 定制；页面署名为作者与“小克”的共同作品，但未列出独立 OSS 许可证或通用公开再分发授权。Conflux 的来源、有限定制语境及尚未明确的再分发边界已写入 `docs/PROVENANCE.md`，没有擅自声明该模板为 AGPL。

本轮实际打开原模板时，浏览器控制台报告 `GL_VENDOR = Disabled / GL_RENDERER = Disabled / Error creating WebGL context`，页面停留在加载状态。证据为 `docs/evidence/galaxy-rework/conflux-original-blocked.png`。**当前环境无法完成原版运行画面与作者视频的同视角对照。**

用户视频截图呈现白粉色高亮宽核心、横向密集星盘。当前源码的注释明确提到压低白色中心、核心不再巨大，但这不能证明视频与模板属于哪个具体版本。本轮恢复可核对的模板算法与参数，不把恢复源码参数等同于复刻视频成功。

## 具体修改

`galaxyTemplateVisual.ts` 将教程视觉层与 Conflux 数据接线分开：

| 项目 | 本轮处理 |
| --- | --- |
| 粒子盘 | 恢复原半径 5、双臂、旋转系数 1.15、半径幂 1.7、散射 .55 与原上下厚度分布；14000 个粒子 |
| 空间远星 | 恢复原半径/高度分布、五色远星、6400 个粒子 |
| 粒子颜色和 Shader | 恢复原白粉→紫→蓝与 6% 金色、原点精灵尺寸和呼吸；将反向 smoothstep 写为等价的正向表达式以消除未定义边界顺序 |
| 光晕 | 恢复 128px 径向渐变 CanvasTexture / Sprite，原 1.8 尺寸和透明度呼吸；不再用被 120px 限制的巨大单点模拟光晕 |
| 后处理 | 恢复 ACES exposure 1.05、Bloom strength .6 / radius .62 / threshold .12 和 OutputPass |
| 镜头 | 恢复 FOV 55、默认位置 (0,3.1,6.3)、控制阻尼 .05、自转 .32 与距离 2.2–14；保留用户旋转缩放 |
| 原有环境细节 | 恢复四条淡金轨道环、原流星分布与更新算法 |

没有将教程演示记忆、分类语义连线、虚假“喜欢”状态或外部 memory.json 接进用户数据。真实星点使用现有角色/条目/资料/摘要；无日期条目不虚构时间、重要度或相遇事件。节点位置使用模板双臂几何和稳定视图顺序，资料和摘要仅显示实际 updatedAt。

与未改动模板仍有的适配差异：运行于项目现有 Three.js 0.186.0；受 React 容器尺寸而非全屏尺寸约束；粗指针 DPR 上限 1.5、其他设备上限 2，分别限 30/45fps（代码预算，不是实测帧率）；不移植启动黑幕和初始推镜头；选中时装饰层透明度轻降至 .86；实体统一可读尺寸而不推断原模型没有的重要度。未提供“已精确复刻”的结论。

## 阅读与分类布局

- 移除绝对定位的厚重右下角浮窗、圆角边框和大阴影。银河主舞台独立；阅读区在其下缘接入自然页面流，弱渐变与细分隔线承托文字。
- 短内容直接阅读；超过 240 字的内容提供展开/收起，在页面向下延伸，没有覆盖主星盘的固定面板或内部长文滚动窗。
- 点选和关闭不调用 scrollIntoView，也不调整相机。只有明确点击「编辑」才展开既有 MemorySettingsTab 并定位原条目；原增改删与确认保留。
- 下方保留「全部 / 记忆条目 / 长期资料 / 对话摘要」与真实数量；点击同时筛选实体星点和目录。搜索、分页保留，分类切换自动打开目录。
- 分类/分页/删除/角色切换导致选中实体不可见时清理详情。过滤时仅替换实体几何并释放旧实体缓冲，不重建装饰星尘、Bloom 或相机。
- 窄屏分类横向滚动；阅读区/目录正常占据页面空间，页末保留安全区间隔。原记忆管理表单默认折叠，可主动打开，未移除功能。

## GPU 生命周期

document.hidden、离屏和零尺寸停止 RAF。暂停或减少动态效果时按交互重绘。卸载与 context lost 断开观察器/事件/OrbitControls，释放所属实体/连线几何、模板盘面/远星/轨道几何、材质、CanvasTexture、存活流星、Bloom/RenderPass/OutputPass、composer 的 render targets、renderer/context，并移除 canvas。初始化失败也回收已创建的静态对象和 renderer。心弦各页仍互斥挂载。

本轮资源释放使用真实 Three.js 几何/材质/纹理与替身 renderer/后处理的定向测试验证；不是 GPU 显存实测。

## 实际验证结果

- 首轮只运行原有两个相关测试文件：8 项通过。
- 补充「不可见选中节点清理」「仅使用真实日期」两个数据测试后，仅重跑数据文件：8 项通过；加上场景生命周期 2 项，相关测试合计 **10 项通过**。
- **唯一一次** `npm run typecheck`：exit 2。仍为未修改的 `AppShellView.tsx:256`（TS2339）和 `DesktopAppSidebar.tsx:189,192,221,223,333,409,490`（TS2367），共 8 处；本轮图谱文件未新增诊断。没有重跑类型检查或修改无关壳层 UI。
- 云端 Chromium / 720px iframe 实际点击：7 个真实实体（4 条文字、2 份资料、1 条摘要），999 索引片段只显示状态；未选中、短文、长文展开、四类筛选、目录进入、返回、原编辑器修改后目录更新均已检查。
- 点选时 iframe 的 scrollY 为 0；阅读区 position:relative，顶部位于主舞台下缘 36px 内，无覆盖核心的独立浮窗。长文展开为 516 字、约 804px 高、overflow:visible 的自然页面内容。
- 320px iframe 的 window.innerWidth=320，图谱 clientWidth/scrollWidth 均为 320，页面无横向溢出；分类可用宽度 264、内容宽度 372，通过自身横向滚动访问。
- 未加载资料显示摘要和明确提示，未伪造日期；换角色后旧详情数为 0。离开到「共读」后图谱 DOM 数为 0。
- **没有 WebGL 图像验收**：原教程和集成版在当前云浏览器均无法创建 WebGL context。Shader 实际编译/亮度、原版对照、Android 平板双指触摸/FPS/显存、原 AppShell 底栏覆盖及安装版 PWA 仍未验收。

没有运行 build、全量测试、verify、PWA 冒烟、发布门禁、哈希矩阵或收费 API 测试。

## 实际截图（仅布局/降级证据）

以下来自实际浏览器、虚构验收数据，未用参考图片或生成图片填充星空。**这些截图不证明银河 GPU 效果合格。**

- [720px 短记忆下缘阅读](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/evidence/galaxy-rework/tablet-short.png)
- [720px 长文自然展开](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/evidence/galaxy-rework/conflux-tablet-long.png)
- [320px 默认目录与可横滚分类](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/evidence/galaxy-rework/conflux-mobile-default.png)
- [原教程 WebGL 无法创建的实际页面](https://github.com/yorixiro/conflux/blob/feat/heartstring-memory-galaxy/docs/evidence/galaxy-rework/conflux-original-blocked.png)

## 继续使用原来的 4173

原来运行 4173 的 Termux 窗口保持开着。在另一个命令窗口执行：

```bash
cd ~/my_st_termux/conflux &&
git fetch origin feat/heartstring-memory-galaxy &&
git switch --detach FETCH_HEAD
```

成功后刷新原来 **4173 的同一个地址**，主机名也保持原样，打开「心弦 → 记忆图谱」。不另开 5175，不切换浏览器数据来源，不安装依赖或清除缓存。若 Git 报未提交修改会被覆盖，保留修改并停止，不强制切换。此操作预览原 PR 分支，不合并 PR。

下一步仍需有 WebGL 的设备完成原视频/原模板/集成版同视角截图、短/长内容与分类交互、横竖屏、底部导航和前后台资源行为验收。未验收前继续保持 Draft。
