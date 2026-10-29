# 心弦记忆银河：实现与定向验收

开发基线：`feat/keke-devin-acp-preview-20261030` 的 `f553d80cdc197ca7aa6f492e2175a2ef8d8e0ebd`。
收尾时上游新增的三个提交仅变更 AGENTS 与路线图文档，已基于 `45e5ad275a1c78f3b32404826299a8b27acf1352` 接续交付；运行代码基线未变。
功能分支：`feat/heartstring-memory-galaxy`；[PR #8](https://github.com/yorixiro/conflux/pull/8)。运行代码提交：`aeff4ed089592f286b7c6efa18bfabe783d5e812`。状态：PR 待验收，未合并或部署。

## 实现

- `HeartstringMemoryAtlas.tsx`：在原「心弦 → 记忆图谱」中挂载 Three.js 场景。支持触摸旋转、缩放、点选、归属高亮、分类、查找、星域分页、文字目录及原编辑器定位。
- `heartstringMemoryModel.ts`：角色为根节点；非空字符串记忆、具有 ID 的资料与摘要分别形成实体。保留重复字符串及其原数组下标；条目变化、删除或换角色时不把旧选择套到相邻条目。下标仅是视图定位，没有写入记忆 ID。
- 选中实体时绘制一条角色归属线。摘要的登记来源只显示计数，未展开未加载对话、未绘制猜测关系；无自动语义关联。
- 未加载资料显示摘要和明确提示。进入原资料编辑器时才调用既有正文读取。图谱不会自动读取所有资料或触发索引、embedding、模型调用。
- `MemorySettingsTab.tsx` 与 `EditablePill.tsx` 只增加可选定位请求；增改删、确认、正文读取与回写全部沿用旧编辑器。没有第二份持久化数据。
- `memoryGalaxyScene.ts`：独立编写三旋臂星尘、空间远星、中心光晕和带光环的实体星点。装饰与实体使用不同点云，单个选中实体额外绘制归属线；无纹理下载、无后处理依赖。修改文字不会重建 GPU 场景。

## 与教程的差别

已读取 https://chat.xiaoke.love/galaxy-tutorial/ 的正文与模板源码。浏览器访问模板停在加载页；当前云端浏览器明确报告 WebGL 被禁用，故未核实教程的实际动态图像，也未声称精确复刻。

本实现参考紫粉蓝星尘、旋臂、核心和轻微呼吸的方向，接入 Conflux 原数据和编辑器；不复制模板的内嵌演示记忆、同类星座猜测关系、流星或 Bloom。无时间戳的字符串条目不伪装成按时间排列，根节点使用角色。

## 性能与释放

- 小视口或粗指针设备：装饰最多 5200 点、DPR 上限 1.35、每星域最多 240 条记忆，粗指针动画上限 30fps。
- 桌面：装饰最多 10500 点、DPR 上限 1.75、每星域最多 480 条记忆，动画上限 45fps。上述是代码预算，不是实测帧率。
- Resize 更新画布、相机、DPR、装饰 draw range；暂停或系统减少动态效果时按交互重绘。
- document.hidden、IntersectionObserver 离屏、零尺寸停止 RAF。切换心弦标签会卸载图谱，原收藏册与图谱不同时挂载。
- 卸载或 context lost：取消 RAF；断开 ResizeObserver、IntersectionObserver；移除 visibility、媒体查询、pointer、context 事件；dispose OrbitControls、4 个 geometry、4 个 material、renderLists、renderer；主动释放 WebGL context 并移除 canvas。重复 dispose 安全。
- 星域分页只分配绘制窗口，完整数据仍可通过分类、全局目录搜索、翻页和旧编辑器管理。

## 实际验证

1. `node node_modules/vitest/vitest.mjs run src/ui/collection/heartstring/heartstringMemoryModel.test.ts src/ui/collection/heartstring/memoryGalaxyScene.test.ts`：初次数据测试 6/6 通过；生命周期测试中相机 mock 没有朝向原点导致 1 项失败，修正 mock 后生命周期 2/2 通过。后续场景 Resize/镜头调整后，仅重新运行生命周期文件，2/2 通过。合计两个文件 8 项通过。
2. 唯一一次 `npm run typecheck`：exit 2，8 处错误全部来自未修改的壳层文件：
   - `src/ui/app-shell/AppShellView.tsx:256`：TS2339，actions 类型中没有 onOpenHome。
   - `src/ui/app-shell/DesktopAppSidebar.tsx:189,192,221,223,333,409,490`：TS2367，hub/sidebar 已收窄分支内的不可达比较。
   - 上述两个文件与开发基线没有 diff。图谱及编辑接线文件未报类型错误；没有第二次类型检查或借本工单修改无关 UI。
3. 云端 Chromium 隔离页面直接挂载真实 `HeartstringMemoryAtlas` / `HeartstringHub` / stores，以虚构数据验收。初始：36 条字符串 + 2 份资料 + 1 条摘要 = 39 颗记忆星，角色根节点另计。999 个向量片段只显示索引状态。
4. 实际点击演示记录：目录搜索「第一次」→选中条目→原编辑器自动切到条目并聚焦→修改并按 Enter→目录查到修改后的原文；资料星点打开原文编辑器，修改后字数更新；摘要星点打开旧对话编辑器，保存后的详情正文更新且原来源计数保留。
5. 切换到空白角色：真实记忆数为 0，旧选中详情消失。将条目增加为 520 条后，523 个实体可在目录与下一星域继续访问。桌面第二页实际显示剩余 43 条，未遗漏资料/摘要。
6. 检查 320px、720px 容器与 1440px 桌面容器（正文受现有 1080px max-width 限制）：图谱区 scrollWidth 与 clientWidth 相等，未发生横向溢出；目视检查了窄栏详情与目录。属于容器宽度验收，不等同于 Android 设备或真实移动视口验收。
7. 「心弦 → 记忆图谱 → 共读」实际切换后，图谱 DOM 与画布计数为 0；返回后重新挂载。
8. 当前云端 Chromium WebGL context 创建失败（GL_VENDOR/GL_RENDERER Disabled）。已实测非 WebGL 自动目录降级与编辑可用；GPU 图像、着色器实际编译/效果、触摸双指缩放、Android 真机 FPS/显存未实测。生命周期测试使用真实 Three.js 几何/材质与替身 renderer/controls，不是 GPU 显存实测。

未运行 build、全量测试、verify、PWA 冒烟、发布门禁、哈希矩阵或收费 API 测试。

## Android / Termux 隔离预览

在新的 Termux 会话执行，保留原目录、原服务器及 ACP 会话：

```bash
cd ~/my_st_termux/conflux
git fetch origin feat/heartstring-memory-galaxy
git worktree add ../conflux-galaxy-preview -b preview/heartstring-galaxy FETCH_HEAD
cd ../conflux-galaxy-preview
ln -s ../conflux/node_modules node_modules
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

浏览器打开 `http://127.0.0.1:5175/`，进入「心弦 → 记忆图谱」。5175 是独立浏览器数据区，初始没有原 PWA 的私有记忆；可手动添加几条测试记忆，或自行导入备份后查看。不要在当前聊天/ACP 服务窗口停止服务或切换分支。命令复用原目录已安装的同版本依赖，不覆盖旧源码。

真机重点：不同类型星点的光环和正文可读性；点选/旋转/双指缩放；资料编辑后回图谱；角色切换和空数据；横竖屏；前后台与共读/收藏册切换后动画是否停止并恢复。尚未跑过这些真机验收，不把代码帧率上限当作性能承诺。

结束预览只在新窗口 Ctrl+C，原 PWA 与 ACP 保持原状。回滚本功能只需不合并此分支；本次没有 schema、缓存或存储迁移。
