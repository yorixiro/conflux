# 收藏册性能架构优化：证据与验收记录

日期：2026-10-27。基线：`a6320d5081462dcfa86bcf90ab4c93a31b13b508`，
开发基线分支：`feat/conflux-bottom-navigation`。范围仅为收藏册计算和资源生命周期。
本报告区分源码证据、隔离单元测试和设备测量，不能将前两者当作 FPS/GPU 实测。

## 先诊断得到的代码证据

1. 基线 `ArchiveFolio.tsx` 的 `BookView key` 包含 owner、分组 index 和照片 id。
   更重要的是 `show3d = supported && !!bag && pictures.ready`：切换到未缓存照片时先卸载 BookView，
   URL 准备好后再挂载。仅删除 key 中的分组仍不足以修复这条卸载路径。
   `BookView` mount effect 调用 `createBook`，cleanup 调用 `book.dispose()`；
   `scene.ts` 的 createBook 新建 WebGLRenderer，dispose 释放场景并 forceContextLoss。
   因此普通切组会重新分配 renderer、PMREM 环境、灯光阴影、磨砂 render targets、两个袋子的对象和材质。
2. 基线 `PouchAddon.setProfile` 的 sameItems 对照片 id/image 不同直接返回 false；
   `buildPolaroid` 也拒绝更换 image。已有在位更新只支持同一照片的文字，不能解决照片分组。
3. 基线 `ArchiveFolio.addons()` 同时创建照片袋和隐藏的邮票袋。后者构造后就异步构建全部六枚网格、
   下载完整贴图、上传并预编译，虽然当前看不到。两个袋子订阅同一体感源，隐藏袋子的 wake 也能叫醒宿主。
4. `shared.ts` 的 decoded Map 成功后从不删除条目。URL.revokeObjectURL 不会释放 Map 中仍被强引用的解码 Image。
5. 主循环已经有 needsFrame/bookDirty 分离，阴影已设置 autoUpdate=false。
   `step` 在合并 addonMoved 前才标记 bookDirty；仅邮票运动本身不会使书的阴影失效。
   这部分不是新发现的“每帧重画所有阴影”问题，继续保留。
6. 仍有确定的无输出阴影工作：Three 0.186 的 WebGLShadowMap.renderObject 会为 VSM 接收者提交绘制。
   bag 的 receiveSun 和 scene 的 guardReceiver 给它们指定了不写颜色/深度的 customDepthMaterial，
   但仍会处理原几何体的顶点。每枚邮票主几何保留 48×60 网格，2989 顶点/17280 索引。
7. 邮票基础材质在贴图到齐前就被 compiled；normal/displacement/ORM 等随后一次性安装并使 shader defines 失效。
   最终贴图尚未到齐时的预编译不能覆盖最终 shader variant。
8. fixed frost 封套仍会在 idle 里预绘当前 UI 不提供的 cloth/leather 备选封套。
   详情图片也有正在等待照片/字体时关闭对话框后仍继续分配离屏资源的路径。

## 实施顺序与边界

先修复整场景重挂载，再复用照片槽位和释放解码缓存，然后去掉隐藏资源与无输出 shadow draw，
最后处理预编译时机和异步取消。未变动 UI/CSS、用户存储或 PWA 更新链路。

- 普通照片分组保留一个 BookView、Canvas、renderer、相机、灯光、世界与邮票袋。
- 相同数量、相同 kind 的照片槽位只 relabel/repaint；原来的 canvas textures、几何、planck bodies、
  位置、速度、层级和 held joint 保留。ID 更新原子完成，重复相同内容不再发起重绘。
- 中途被取代的 repaint 保留 dirty slot，后续更新会补画，避免跳过尚未完成的文字/照片。
- 数量不同（例如末组只有一张）只替换照片袋，完成后再替换旧袋；该照片袋的物理状态会重新初始化。
  书、相机、封套和邮票状态保留。这是本次局部替换的明确边界。
- 邮票袋在第一次选中时构建，此后保留；隐藏袋不 step，也不能用加载/体感事件唤醒宿主。
- 接收者仅在无输出的 shadow submission 内临时把 drawRange.count 设为 0，onAfterShadow 恢复原范围。
  光照接收、主画面完整浮雕、透明袋自带接触阴影、书和树枝的真实阴影全部保留。
- 原始贴图全部到齐时先按最终配方 compileAsync / upload，再加入场景。最长等 1500ms 就允许原有占位材质显示，
  慢网络的原图继续下载，后续完整替换，未取消或降分辨率。极慢网络下最终材质仍可能在一次可见帧中编译，这是剩余瓶颈。
- fixed frost 跳过未用封套的预绘，保留 frost shader 预热、离屏 blur 与 VSM 缓存。
- 详情关闭、profile 变化或卸载会取消过期 snapshot 等待；图片/字体晚到不能覆盖最新内容。
  React 在 createBook 字体等待期间离开时，不再分配一个马上丢弃的 renderer。

## 可核对的前后结果

下表是代码路径及隔离测试结果，**不是安卓帧率或显存实测**。

| 项目 | 基线 | 本次结果与证据 |
| --- | --- | --- |
| 普通分组 renderer 生命周期 | 分组 key / pictures.ready 两条路径触发卸载 | key 仅 ownerId；首组就绪后后续图片等待不再隐藏 BookView，仍需设备计数确认 |
| 等数量照片切组 | setProfile 拒绝，整场景重新挂载 | 隔离测试往返更新 12 次，buildObject 始终仅初始 2 个；对象及 sim 引用相同，位置/速度/层级/held 完全保留 |
| 未改变便笺的纹理更新 | 随场景重建或全量 repaint | 同一测试中便笺 repaint 次数未增加 |
| 首次看照片时的六枚邮票 | 隐藏袋也分配六枚完整邮票 | 源码改为第一次选中才分配；实际 GPU 数量待测 |
| 无输出 VSM receiver 提交 | 原完整几何被送往不写颜色/深度的材质 | 单测验证 shadow 范围为 0，返回后恢复 17277 个索引（测试自设 start=3），主几何仍有 2989 顶点 |
| 解码缓存 | 成功的每个 URL 永久保留 Image | 单测验证并发共用一次 decode，成功后再次请求会创建新 Image，强引用缓存已移除 |
| PBR 通道/尺寸/几何 | 原配方与完整几何 | kogei 测试全部 7 个 material map 引用保留；ORM 复用一个 texture；原图 Image 直接作为 texture，48×60 分段、MSAA alphaToCoverage 保留 |
| 取消详情 | 已关闭仍可能等待旧照片，随后渲染离屏图 | 单测取消在 GPU 工作前返回，未完成的照片不会阻塞克隆模型释放 |

| 必测状态 | 帧时间 median/P95 | CPU / GPU 时间 | Draw Calls、纹理/几何数量、Context 数量 |
| --- | --- | --- | --- |
| 首次加载 | 未实测 | 未实测 | 未实测 |
| 稳定静止 | 未实测 | 未实测 | 未实测 |
| 持续拖邮票 10 秒 | 未实测 | 未实测 | 未实测 |
| 摇晃 | 未实测 | 未实测 | 未实测 |
| 照片分组及袋子往返 | 未实测 | 未实测 | 未实测 |

无可用安卓真机。当前远端浏览器不能访问隔离本地服务；本地 Chromium 下载也未得到有效可执行包。
因此没有有效的浏览器性能样本、P95、FPS、优化百分比、GPU 资源曲线或视觉通过结论。
已提供独立的 [诊断夹具](../../tools/album-performance/README.md)，分别运行基线与工作分支即可采样上述状态。
计数与计时只注入该夹具；生产入口无监控计时或新增 RAF。

静止时原有连续 RAF 会在物理/交互停止后停下；原树枝动画保留，每 160ms 检查，姿态变化才绘制。
这类低频环境帧不能记作“完全零渲染”，也不能把其 tick 间隔换算为 FPS。
详情对话框打开时暂停环境 sway，关闭后从原姿态恢复；未关闭所有阴影或磨砂效果。

## 修改文件

路径均相对 `src/ui/collection/album/`，除另有标注。

| 文件 | 解决的问题 |
| --- | --- |
| `ArchiveFolio.tsx` | 稳定 key/首组就绪锁存；在位更新照片；异步局部替换；邮票惰性创建；隐藏 wake 过滤；详情取消及暂停环境帧 |
| `sasshi/BookView.tsx` | 将放弃挂载的 AbortSignal 传给引擎；固定封套预绘选项 |
| `sasshi/scene.ts` | 字体等待后先检查取消，避免无用 context；receiver 空绘制；跳过未用封套预绘 |
| `receiveOnlyShadow.ts` | 无输出 shadow draw 跳过顶点提交并恢复主画面范围，保留既有回调 |
| `bag/addon.ts` | 等形照片在位更新、按变化槽位上传、原子 ID 更新、dirty slot 跨取消保留、最终材质预编译、快照取消 |
| `bag/objects/polaroid.ts` | 复用照片 canvas/textures；图片加载代次防竞态；等待照片与字体后一次 repaint/upload |
| `bag/objects/rig.ts` | relabel 后公开新逻辑 ID 和最新 ready promise |
| `bag/objects/shared.ts` | 仅保留正在解码的缓存；receive-only shadow helper |
| `bag/objects/stamp.ts` | 原图异步解码与完整 mipmap；取消在途 Image；原始材质通道保留 |
| `bag/sim/types.ts`, `bag/sim/world.ts` | 等形槽位原子重命名，保留物理体、运动和关节 |
| `bag/snapshot.ts` | GPU 分配前、decode 后及异步阶段检查取消，及时释放克隆和 targets |
| `bag/lifecycle.test.ts` | 12 次切组复用、不重画未变对象、取代慢图片及补画取消中的 dirty slot |
| `receiveOnlyShadow.test.ts` | 完整几何恢复、已有回调保留；物理 ID 原子互换/非法输入 |
| `bag/objects/stamp-loading.test.ts` | 完整通道与几何、map defines 合并更新、卸载取消、离线占位 |
| `bag/objects/image-decoding.test.ts` | 并发解码共享与成功后的缓存释放 |
| `bag/snapshot-lifecycle.test.ts` | 取消不执行 GPU 工作、悬而未决照片不会扣住克隆 |
| 仓库 `tools/album-performance/` | 无用户存储的合成照片夹具，基线/现版本源码采样，CPU/GPU P95、每帧所有 pass 及资源计数 |

## 实际执行的检查

- 定向 Vitest（6 个文件，11 项测试）：通过。包含已有 `bag/stamp-page.test.ts` 1 项，新增测试 10 项。
- `npm run typecheck`：仅运行一次，退出 2。发现 6 处错误：可选 printed 方法调用、新增测试缺少 from、
  Texture.image 的 unknown 类型及 Mesh.material 联合类型。已逐处修正；遵照本次只运行一次的限制未复跑，
  **初轮最终版本类型检查通过状态当时未确认**。见下方 2026-10-27 收尾复核。
- `git diff --check`：通过。
- 诊断服务的 TSX 和三个主模块可经 Vite transform，但关闭 smoke 服务时出现退出 13，故不将其计为完整通过。
- 未运行 build、verify、全量测试、整套 E2E，也未动用户数据。

## 剩余验收与风险

PR 保持 draft。真机及浏览器可访问环境下仍需：

1. 运行同条件基线/修改后诊断，核对五种状态的 P95、CPU/GPU、Draw Calls。
2. 确认普通切组 renderer created 不增长；首次邮票分配后，多次袋子/分组往返 textures/geometries 不持续增长。
3. 查看六枚邮票的金属反光、原浮雕、透明锯齿边缘及 MSAA；验证手指拖动/真实体感、隐藏袋恢复、末组数量变化。
4. 极慢网络下最终 shader 的可见帧编译、完整 PBR 双面透明绘制、环境帧的磨砂 blur 仍可能占 GPU 时间；未测之前不排序为实测瓶颈。
5. 类型状态已在下方收尾复核确认通过；真机性能及外观项目仍待验收。

未改 renderer antialias、原图尺寸、DPR 算法、48×60 浮雕、金属/法线/透明材质参数、磨砂质量、
照片与邮票共用一本册的交互；未引入第二 renderer、WebGPU、场景框架或空白实体格页。
回退本 PR 单独提交即可撤销，无数据迁移或存储回滚要求。


## 2026-10-27：PR #6 收尾复核

按 [最新工单评论](https://github.com/yorixiro/conflux/pull/6#issuecomment-6437106562) 操作：

- 唯一代码修改：`bag/lifecycle.test.ts` 的 `profile(...): Profile` fixture 补充
  `coverTitle: 'Fixture'`，不修改生产 schema 或任何渲染参数。
- 本轮 `npm run typecheck` **仅复跑一次，exit 0**。先前报告中的最终类型状态现已确认通过。
- 未复跑 Vitest、全量测试、build、verify 或 E2E；上一轮 11 项定向测试结果保留为历史结果。
- 新增 [Termux 隔离真实应用预览步骤](../../tools/album-performance/README.md#安卓平板-termux隔离体验真实应用)：
  独立 worktree、独立缓存与 5179 origin；不切换用户原工作目录，不改动 5173/4173 服务或正式 PWA。
- 预览方案已准备，未在安卓平板执行。FPS/P95、GPU 时间和资源/内存曲线仍**未实测**；
  六枚原图、金属反光、完整浮雕、透明袋/磨砂、边缘抗锯齿、真实触摸与前后台恢复仍待用户观察。
- PR 保持 Draft，不合并、不强制推送。
