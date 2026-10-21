# Conflux：只用安卓 Termux

同一部手机运行 Termux 和 Chrome，不需要电脑、域名或公网部署。这里提供本机启动入口；不代表 APK 或安卓真机已验收。

## 首次准备

在 Termux 执行（仓库放在 Termux 的 home，不放 `/sdcard`）：

```bash
pkg install -y nodejs-lts npm git
git clone --branch feat/conflux-shell-pwa --single-branch https://github.com/yorixiro/conflux.git ~/conflux-termux
cd ~/conflux-termux
npm run termux:setup
npm run termux:pwa
```

已经有 `~/conflux-termux` 就先进入它，不要覆盖或删除；确认在上述分支且没有待保留的改动后，用 `git pull --ff-only` 更新。其他位置的检出也可以，下面的目录换成自己的路径。

`termux:setup` 安装锁定依赖，跳过安卓不需要的 Electron 二进制。如果 Rollup 原生二进制加载失败，只在本机依赖目录改用相同版本的官方 WASM 包，不改源码或锁文件。需要 Node.js 22+；npm 在新版 Termux 中是单独的软件包。

构建完成后，用**这部手机的 Chrome** 打开 **http://127.0.0.1:4173/**，等待首页加载，从浏览器菜单选择“安装应用”或“添加到主屏幕”。菜单文字和实际安装形式取决于浏览器。`localhost`/`127.0.0.1` 符合本地安全上下文要求，但仍需真机确认安装。

## 日常使用与开发

| 要做什么 | 在仓库目录运行 | 固定地址 |
| --- | --- | --- |
| 日常启动已构建版本 | `npm run termux:start` | `http://127.0.0.1:4173/` |
| 修改源码，保存后热更新 | `npm run termux:dev` | `http://127.0.0.1:5173/` |
| 把改好的源码构建为安装版 | 先 Ctrl+C 停止旧服务，再 `npm run termux:pwa` | `http://127.0.0.1:4173/` |

手机构建只运行 Vite，节省资源；完整类型检查和测试仍在开发环境运行，不能用手机快速构建代替发布验证。启动命令不会自行切换端口；端口占用时先停止之前的服务。

**正式聊天一直使用 `127.0.0.1:4173`。** `localhost`、`127.0.0.1`、不同端口各有自己的浏览器数据，开发入口不会自动读取安装版聊天。不要清除站点数据来更新。

更新后先在有服务时打开安装版，让新版资源下载；然后关闭所有该地址的浏览器标签和 PWA 窗口再打开，等待中的新版才能接管。离线缓存允许阅读已经存下的历史，但调用本地 relay 需要 Termux 服务仍在运行。安卓可能回收后台 Termux；可在系统设置中允许其后台运行，必要时 `termux-wake-lock`，用完执行 `termux-wake-unlock`。

## 连接自己的模型

沿用应用设置里的自定义 Provider，填写自己的服务地址和模型。不要使用未配置服务端密钥的内置免费模型作为首次验收。

两个入口都在同源提供现有 `/api/provider-relay`、embeddings、images、audio 和 client-diagnostics 处理器；仍沿用原来的目标校验与认证规则。无需另开中转服务器来解决浏览器 CORS 回退。此入口不会自动选择模型或改为小模型。

`/api/health` 可检查本地服务是否启动。模型列表 relay、内置免费模型、联网搜索、公开素材分享等不在此入口的支持范围，会返回明确的未提供提示；可以手动填模型名。不要把这里仅监听回环地址的个人入口当公网服务器。

## 真机最后检查

首次打开 → 配置自己的 Provider → 发送一句话并试停止输出 → 刷新后确认历史 → 安装至主屏 → 关闭再开 → 飞行模式查看已有历史。没有真实接口和手机操作记录前，不把这些项目写成通过。

参考：[MDN PWA 安装条件](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)、[Termux Node.js LTS 包](https://github.com/termux/termux-packages/blob/master/packages/nodejs-lts/build.sh)。
