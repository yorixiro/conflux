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
