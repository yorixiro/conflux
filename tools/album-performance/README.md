# 收藏册隔离诊断

在仓库根目录运行 `node tools/album-performance/server.mjs`，在同一设备打开
`http://127.0.0.1:5179/tools/album-performance/index.html`，点击 Run。
仅使用合成照片，assetStore 被这个独立 Vite 配置替换；不读取或写入用户存储，
不加载正式入口，不安装 Service Worker。生产构建不包含这个入口和插桩。

对照基线：先运行 `node tools/album-performance/server.mjs --baseline=a6320d5081462dcfa86bcf90ab4c93a31b13b508`，
保存页面末尾 JSON；停止服务器，再运行无参数版本并重新打开页面。对照版本从 Git 读取源码，
无需切换分支或改动工作区。不要同时运行两次或在一个正在跑的夹具里热改代码。
两次保持同一设备、浏览器版本、横竖屏、窗口大小、DPR、温度和缓存条件。
诊断允许软件 WebGL，JSON 会报告真实 renderer；软件渲染结果不能作为安卓 GPU 验收。

依次采样首次进入、静止 10 秒、连续拖邮票 10 秒、摇晃、照片分组往返、照片/邮票袋往返。
拖动以真实画布的 pointer 事件路径运行，并检查 `debug.held()`，未命中会报错。
可另用手指执行一次拖动对照，验证触摸命中和事件频率。自动夹具不替代真机视觉验收。

- `duration` 是操作经过时间；首屏只表示引擎 ready，后续字体、开封、贴图可能仍在加载。
- `frameIntervalMs` 是引擎 tick 间隔的 median / P95，静止时包含环境更新间隔，不应换算为 FPS。
- `cpuMs` 是主线程 step + render 提交的墙钟时间，包含诊断开销，不是 CPU 利用率。
- `gpuMs` 仅在 EXT_disjoint_timer_query_webgl2 支持且结果有效时记录；不支持时 n=0 / null，绝不用 CPU 时间代替。
- `calls` 累计一个 tick 内所有主画面、阴影和磨砂离屏 pass，避免只读最后一次 render 的偏小数字。
- `textures` / `geometries` / `programs` 为 renderer.info 的资源数量；并非显存字节。
- `created` / `disposed` / `liveContexts` 为渲染器生命周期计数，不含被夹具绕过的能力探测临时 context。
- `uploads` 统计采样期间 texImage2D / texSubImage2D 调用（不等同于独立纹理数）；`shaders` 为 compileShader 调用次数。
- `materials` 列出原始贴图实际尺寸、通道和网格顶点数。贴图下载失败时不能声称 PBR 视觉验收通过。
- 照片总数改变时只替换照片袋；同数量分组复用几何和纹理，邮票袋仅首次选择时分配。

静止状态保留原有树枝动画，环境按 160ms 定时检查，只有姿态变化才绘制；不要求它变成一张静态图。
同时记录稳定段资源数量和往返后的数量；初次选择邮票时资源正常增加，之后不应随往返次数增长。
若持续增长，附两份 JSON、设备型号和 WebGL renderer，不要将它标为通过。

## 安卓平板 Termux：隔离体验真实应用

新开一个 Termux 会话，先进入现有 Conflux 仓库目录。以下命令不切换原目录分支，
不 stash/reset/覆盖已有修改；创建独立 detached worktree，只读复用已安装依赖。
Vite 使用预览 worktree 内的独立缓存，固定 5179，端口被占用时直接停止，不改用其他端口。

```bash
(
set -e
conflux_source="$(git rev-parse --show-toplevel)"
git fetch origin pull/6/head
git worktree add --detach "$conflux_source/../conflux-pr6-preview" FETCH_HEAD
cd "$conflux_source/../conflux-pr6-preview"
ln -s "$conflux_source/node_modules" node_modules
node --input-type=module <<'JS'
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const server = await createServer({
  configFile: false,
  plugins: [react()],
  cacheDir: 'tmp/album-preview-vite',
  server: { host: '127.0.0.1', port: 5179, strictPort: true },
});
await server.listen();
console.log('Conflux PR #6: http://127.0.0.1:5179');
JS
)
```

在平板浏览器打开 `http://127.0.0.1:5179`，从这个测试页面进入收藏册。
这是实际应用源码的 Vite 开发预览：不运行类型检查或 build，不经过正式 PWA/本地 relay 的启动脚本，
也不注入性能诊断。DEV 入口不会注册 Service Worker；不用安装成 PWA。
原 5173/4173 服务、缓存和数据不受影响。5179 是独立 origin，因此旧照片/聊天不会自动出现。
只在此处导入 5 张非隐私测试图片，形成 2/2/1 三组；无需配置模型 API。

若 `conflux-pr6-preview` 已存在，worktree 命令会停止，保留里面的内容；换一个新的预览目录名即可。
预览完成只在这个新会话按 Ctrl+C，原服务继续运行。不要清除原 PWA 数据，也不用合并 PR。

真机观察顺序：

1. 首次打开，等待六枚邮票的原始材质下载完成，记录有无长时间白屏/明显卡顿。
2. 照片第 1/2 组往返，再到只有 1 张的第 3 组往返；看整本册是否重开、照片是否串组。
   数量变化允许照片袋自身重新初始化，封套与邮票状态应保留。
3. 切到邮票，用手指连续拖动 10 秒、摇晃、反复切照片/邮票；查看交互及位置恢复。
4. 将浏览器切到后台再回来，检查有无黑屏、贴图丢失或交互失效。
5. 对照确认六枚原图、完整金属反光/法线、48×60 浮雕、透明袋、磨砂和边缘抗锯齿没有退化。
   源图网络下载失败需要先排除，不能把占位图当作完整材质验收。

需要对照旧版时，先停止此预览，仅在这个独立 worktree 运行
`git switch --detach a6320d5081462dcfa86bcf90ab4c93a31b13b508`，再运行上面的 Node 启动块。
返回优化版时在同一独立 worktree `git switch --detach 本次交付的新CommitSHA`。
两版使用同一 5179 测试 origin、同一批照片及相同平板/方向/浏览器条件；首次冷加载与缓存后的加载分别记录。
若这个预览目录有自己的修改，Git 会保护它们；不要强行切换或清理。

如需量化数据，停止真实应用预览后，在优化版 worktree 运行本文件开头的合成照片诊断服务，
使用完整路径 `/tools/album-performance/index.html`。两个预览不能同时占用 5179。
FPS/P95、GPU 时间、GPU 资源/内存曲线在本轮仍未实测；肉眼流畅度不代替量化指标。
