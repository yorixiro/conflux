# Termux 与 PWA：当前开发入口

本页不再指导切换历史美化、导航或 ACP 分支。唯一日常开发分支为 `conflux-dev`，详见 [AGENTS.md](../AGENTS.md)。

- 项目路径：`~/my_st_termux/conflux`
- 平板前端服务端口：**4173**；Devin ACP 桥接端口：**47831**。
- **日常联合启动**（Termux + Ubuntu PRoot）：`bash tools/termux-acp-dev.sh`。现有脚本启动、管理两个进程，并共用保存在仓库外的 ACP 密钥。
- `npm run termux:dev` **仅启动 4173 热开发服务及其 ACP 转发路由，不会启动 47831 的 Devin 桥接进程**；只有故意单独调试前端时才使用。
- 不要把普通 `npm run dev` 的 Vite 默认端口当作原 Termux 服务
- PWA 必须使用安装时相同的主机名、端口与来源；`localhost` 和 `127.0.0.1` 并不相同

## 更新前先核对

```bash
cd ~/my_st_termux/conflux
git status --short --branch
git branch --show-current
```

**仅在当前分支确实为 `conflux-dev`、工作区干净、没有需要保护的本地提交时**，才更新：

```bash
git fetch origin
git pull --ff-only origin conflux-dev
```

如果还在历史分支、存在未提交改动或无法快进，先核对差异，不要自动切分支、合并、重置或清理数据。已有服务运行时，不重复启动；先确认并正常停止旧前端/桥接进程，两个端口都空闲后，再运行联合启动脚本：

```bash
cd ~/my_st_termux/conflux
bash tools/termux-acp-dev.sh
```

脚本遇到占用端口会拒绝启动，不会替你强杀旧服务。不要删除聊天数据、缓存或重复开进程来排查。

## PWA 排查

同一来源的 `/api/health` 可帮助区分 `development` 实时开发服务与 `pwa` 静态构建服务；后者不会因改了源码就自动更新。项目保留 `/__conflux_dev` 同来源开发切换入口，必须先确认实际服务、来源和目的，不应把它当作通用清数据命令。

提交推送并不保证已安装 PWA 刷新，也不等于 Android 真机通过。其他命令以当前 [package.json](../package.json) 与 [部署说明](../DEPLOYMENT.md) 为准。
