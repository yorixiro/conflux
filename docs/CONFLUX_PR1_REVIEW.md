# Conflux PR #1 构建与代码复核

日期：2026-10-20。分支：`feat/conflux-shell-pwa`。
原始 PR head：`655709c37f42f660d2581807ab46eaf386b5ba34`；base：`acf20547275cddc4e5bec7099e3c54d82d42cf1e`。
范围：只处理现有 Web/PWA/Android 壳和可复现构建问题；不增加第二套业务、持久化或 Provider，也不合并 PR。

## 全部原始改动的复核范围

| 原始 PR 文件 | 结论 / 处理 |
| --- | --- |
| `android/app/build.gradle` | applicationId 与 namespace 分离合理；Debug 后缀为 `.debug`；APK 未能生成，不能宣称安装身份已实机验证。 |
| `android/app/src/main/assets/capacitor.config.json` | 与 TS 配置语义一致；`cap sync android` 成功；同步生成的纯格式噪声不纳入修复。 |
| `android/app/src/main/res/values/strings.xml` | 名称/包资源与 Conflux 一致；Java package 保留原 namespace。 |
| `capacitor.config.ts` | `webDir=dist`、appId/appName 一致；本次不改网络、键盘或持久化策略。 |
| `index.html` | Conflux metadata、manifest 和现有 Apple touch icon 路径存在，Vite 多入口构建通过。 |
| `public/manifest.webmanifest` | 改为相对 id/start_url/scope/icon，避免子目录部署跳回站点根；图标仍是 Polaris 占位。 |
| `public/sw.js` | 修复私密导航污染离线 shell、目录级缓存范围过宽、固定版本和不完整预缓存/强制升级问题。 |
| `src/app/bootstrap/confluxServiceWorker.ts` | 尊重 Vite BASE_URL；开发/原生/file/不支持 SW 的环境不注册。 |
| `src/main.tsx` | 注册调用位置合理，不改变既有 LocalData 初始化与 React 挂载链。 |
| `docs/CONFLUX_FIRST_CHANGELOG.md` | 保留首批历史说明，补充本报告链接和已修正项。 |

## 修复与边界

- Vite 在构建时生成确定的 SW 内容哈希和静态文件精确白名单；包含入口、传递依赖、懒加载 chunk、字体、worker 与明确指定的公共图标/启动图，排除 sourcemap。
- 所有白名单文件预缓存成功才完成安装；失败只删除本次新建的 cache，保留回滚重装时已存在的 active cache，不强制替换旧 worker。更新等待所有旧受控标签页退出，再清理本 scope 的旧 cache。
- 受控页面的应用根/index 导航优先返回同版预缓存 HTML，避免 A 控制期间在线刷新却加载 B HTML；B 等待时保持 A 的 HTML/资源一致，全部旧客户端关闭后才启用 B。缺少缓存首页时才尝试网络恢复，不将浏览器清缓存后的离线能力视为有保证。
- 只对应用根/index 导航提供离线 fallback；API、用户文档、转换器 HTML、未知 assets/icons、跨源、Authorization、Range、非 GET 请求不受缓存逻辑接管。运行时网络响应不写 CacheStorage。
- cache 名采用 URI 编码 scope 加冒号分隔，避免根路径与 `/-other/`、`/conflux/` 与 `/conflux/-other/` 前缀碰撞；清理原 `conflux-static-v1` 时仅限根 scope；不清理其他应用 cache，不迁移/删除 LocalData。
- Windows 的 10 个测试失败来自源码扫描返回反斜杠；仅统一测试辅助函数的路径分隔符，不放宽断言或修改业务存储。
- Android 构建脚本原先使用 POSIX 环境赋值，在 Windows npm/cmd 失败。改为 Node/tsx 调用平台 Gradle wrapper，保留调用方 SDK/JDK 配置，不再硬编码 Homebrew SDK。
- `npm audit` 发现原锁文件中的 Capacitor Android/iOS 8.2.0 命中 `GHSA-rvm3-566m-v7fv`。根据 GitHub advisory 和 npm peerDependencies，将 core/cli/android/ios 同步固定到同一 8.x 的已修复版本 **8.4.3**。未运行 `npm audit fix --force`；不改变 iOS 工程或声称 iOS 原生包已修复/验收。

## 实际运行与结果

本机：Windows，Node `v26.7.0`、npm `11.19.0`，Chrome（Playwright 的隔离临时 profile）。

| 命令 | 实际结果 |
| --- | --- |
| `git fetch origin --prune` / `git switch feat/conflux-shell-pwa` / `git pull --ff-only origin feat/conflux-shell-pwa` | 成功；私人规则文件保留且未跟踪。 |
| `npm ci` | 成功；依赖修复后重新执行成功。有既存 `@renovatebot/pep440` Node 支持范围警告。 |
| `npm run typecheck` | 成功。 |
| `npm run build` | 成功；Vite 5.4.21，保留既有混合静态/动态 import 与大 chunk 警告。 |
| `npm test -- --reporter=dot`（修复前） | 487 个文件：486 通过、1 失败；3083 项：3073 通过、10 失败，均为 Windows 路径比较。 |
| `npm test -- tools/confluxPwaPlugin.test.ts tools/confluxServiceWorker.test.ts tools/android-build.test.ts src/app/bootstrap/confluxServiceWorker.test.ts` | 4 个文件，24 项通过；关键回归先确认 RED 再修复；多缓存模型覆盖跨 scope 清理和 active-A / waiting-B / rollback-A 的网络错误、HTTP 503。 |
| `npm run verify` | typecheck、extra typecheck、worker typecheck、全量测试和生产构建全部成功；491 个测试文件、3107 项通过。 |
| `npm run test:data-boundary` | 18 个文件、196 项通过。 |
| `CONFLUX_BROWSER_CHANNEL=chrome npm run test:pwa` | 根路径通过：125 个静态文件、manifest 解析/Chromium installability 检查、离线刷新、首次离线导入真实 GroupWorld 懒加载模块、私密响应隔离、等待更新/旧缓存清理；全部页面的 pageerror 为空；额外断言 GroupWorld 首次页面请求发生在离线导入时，排除预先在线导入导致的假通过；升级使用明确的不同 B HTML/内容哈希 lazy 测试 fixture，验证在线刷新仍使用 A、B 激活后离线首次加载 B-only 模块。 |
| `npm run build -- --base=/conflux/` + `CONFLUX_BROWSER_CHANNEL=chrome npm run test:pwa -- /conflux/` | 子目录 shell 冒烟通过；不等同所有业务/Provider 路由的子目录 E2E 验收。之后已恢复根路径生产构建。 |
| `java -version` / `javac -version` | 当前 JDK 为 17.0.20；同步后的 Capacitor Android compileOptions 要求 Java 21，需补齐匹配的 JDK。 |
| `npm run android:build-debug` | 原脚本先暴露 Windows shell 语法失败；修复后 Web build 与 `cap sync android` 均成功，Gradle 8.14.3 实际执行，但以 `SDK location not found` 失败；未生成 APK。 |
| `npm audit --json` | 修复前 39 项（2 critical）；修复后 37 项（0 critical、26 high、9 moderate、2 low），仍非安全全绿；worker 安装另报 4 high。 |

冒烟脚本使用回环地址和一次性 profile，不读取真实用户浏览器或私密数据；测试的 API/私密 HTML 是明确的测试 fixture，不是伪造产品运行结果。

## 尚未通过的门槛

- 本机没有已配置的 Android SDK（`ANDROID_HOME` / `ANDROID_SDK_ROOT` 均未设置，默认 SDK 目录不存在）；需安装并配置 API 36 SDK、匹配 build tools 和 JDK 21 后重跑 Debug build。
- 无 Android APK、签名/安装、真机键盘/权限、重启恢复、与原 Polaris 并存的数据隔离证明。
- Chromium 开发协议的 installability 检查通过不等于已完成桌面/手机主屏实际安装验收。
- 未测试真实模型请求、私人数据、全业务离线工作流、远程部署响应头、iOS 或 release 包；本轮不接触这些数据/设备。
- 仍有依赖审计高风险项，需专门依赖维护；不将构建/单元测试通过表述为可安全发布。

## 复现

安装 Playwright Chromium 或设置 `CONFLUX_BROWSER_CHANNEL=chrome`/`msedge` 使用本机浏览器后：

```sh
npm ci
npm run verify
npm run test:data-boundary
CONFLUX_BROWSER_CHANNEL=chrome npm run test:pwa
npm run build -- --base=/conflux/
CONFLUX_BROWSER_CHANNEL=chrome npm run test:pwa -- /conflux/
npm run build
npm run android:build-debug
```

Android 最后一步须具备 SDK/JDK；本次明确为 BLOCKED，而非已完成同 revision 双端构建。
