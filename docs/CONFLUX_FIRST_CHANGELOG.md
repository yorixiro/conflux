# Conflux 首批前端变更（开发分支）

分支：`feat/conflux-shell-pwa`

## 这次确实改了代码
- Web: 浏览器 tab、应用 metadata、分享标题使用 Conflux。
- Web: 补全原本指向不存在文件的 `/manifest.webmanifest`；使用仓库已有的 192/512 像素 Polaris 图标作为**临时图标**，不能说已经设计了 Conflux logo。
- Web: `sw.js` 只缓存公开静态 shell、Vite 入口 JS/CSS、同源 `/assets/` 与 `/icons/`；绝不缓存 `/api/`、聊天请求结果、密钥和用户文件。
- Web: 只在生产浏览器环境注册 SW；Android 原生 shell 不注册。
- Android: appName、applicationId 与可见 label 改成 Conflux；`com.yorixiro.conflux` 为**新安装包身份**，与旧 Polaris 数据隔离，不迁移其旧本地数据。
- Android: 保留原 Java/Kotlin 源码 package/Gradle namespace `com.alyssa.polaris`，避免在首 PR 中改动所有原生插件的类加载路径。只改 Android applicationId，后续需真机构建确认。
- 没有修改 Polaris 的 LocalData、聊天、Persona、记忆、tools 与网络 Provider。
- 没有同步或迁移原 IB 与花信中的私人数据。

## 验收目标（尚需 CI/本机）
- `npm ci && npm run verify`
- `npm run build` 后确认 `dist/manifest.webmanifest` 与 `dist/sw.js` 存在，PWA manifest 包含 192/512 图标，SW 控制 / 并能加载此前缓存的静态 shell
- 首次必须在线完成安装与缓存；没有访问过的懒加载模块离线未必可用，暂不把完整离线聊天当作已验证
- `npm run android:build-debug`；验证 Android packageName `com.yorixiro.conflux.debug`（调试构建会带 .debug 后缀），主屏显示名 Conflux
- 用真机测试独立安装与本地数据；绝不自动导入旧 Polaris 数据

## 下一阶段
- 让 Codex / CI 先完成 P0 原始构建审计并给出可复现日志。
- PWA 缓存策略针对懒加载 chunk、升级/失效、子路径部署做独立验收。
- 完成新品牌 icon 和 Android adaptive icon 之前继续明确现有图标只是占位。
- P1 接入现有 Provider Runtime 的 Grok adapter，不在 UI 重写一套请求引擎。
