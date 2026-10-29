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
