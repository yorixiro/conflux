# Devin ACP 原生工具桥接 P1：验收与回滚

状态：**2026-10-31 用户在 Termux 隔离目录已验证原模拟 1/1、Vitest 9/9 通过，叠加 PR #12 后 tsc --noEmit 退出码 0。后续取消修复的新增模拟用例尚待重跑，真实 Devin/Fable 和 Android 仍未验收。**
仓库 yorixiro/conflux，基线 feat/keke-devin-acp-preview-20261030，基线 SHA 135b8901930bd931b3111fce550ed21480ee278b。
实现分支 feat/devin-acp-native-tools-p1-20261030。独立 Draft PR，禁止合并。

## 根因

原 ACP 入口把 Conflux 工具的描述塞进提示词，但没有把既有 JSON Schema 注册为模型可调用的原生工具；session/new 的 mcpServers 为空。已有的 searchMemory 以及浏览器工具执行器无需重写。

## 执行链路

1. 当前角色和会话的 AssistantToolContext 生成可见工具注册表、参数 JSON Schema。
2. requestPipeline / devinAcpReply 把 schema 作为结构化 tools 参数发送到本地 Bridge。
3. Bridge 在 ACP session/new 注册 Conflux stdio MCP server；同时附带项目级 .devin/mcp_config.json，以覆盖部分 Devin CLI 忽略 ACP 传入 mcpServers 的情况。
4. MCP tools/list 按当前活动会话暴露工具；tools/call 发起结构化 name/arguments。
5. Bridge 通过 SSE tool_request 推送给本机 Conflux 浏览器；浏览器用原有 parser、access resolver 和 executeToolActions 执行。
6. 浏览器使用同源 POST /devin-acp/tool/result 返回真实工具回执，Bridge 将其交给 MCP，Devin 继续生成完整回答。
7. 原生工具调用证据按原有聊天消息机制记录。模型只说“我调用了 searchMemory”不是通过验收的证据。

## 访问边界和异常

- 桥与 MCP 适配器没有 LocalData / SQLite 数据访问逻辑。写入仍依赖原有浏览器权限、工作区约束、预览确认和持久化层。
- MCP 请求必须落在当前活动会话、可见工具白名单内；浏览器二次验证本轮角色与会话。
- 同时最多四个待回执调用，超时 45 秒；断流、取消、进程失败清理待处理调用；过期回执返回 409，不被当作成功。
- 不修改 UI、数据库、人物设定、记忆隔离或工具业务逻辑。
- 风险：某些 Devin CLI 版本在提前读取空的动态 MCP 列表后，可能不响应 tools/list_changed；真实 CLI discovery 和平板测试尚缺证据。请勿声称已验收。

## 定向测试（不付费）

在完整隔离检出目录中运行：

    node --test tools/devin-acp-native-tools.test.mjs
    npx vitest run src/engines/request/devinAcpReply.test.ts
    npm run typecheck

第一项启动假 Devin ACP 子进程，通过真正的 MCP stdio 适配器执行 tools/list、两次 tools/call：searchMemory 和 listEnvironmentNodes，并由模拟浏览器返回结果，检查 ACP 后续回答；也检查 writeMemory 不在白名单时 403、空闲请求和迟到回执 409。第二项验证浏览器 SSE 工具调用、拒绝回执与回答继续。这里只证明测试代码存在，尚无通过日志；没有运行全量测试或付费模型。

## Termux / Android 隔离预览

不要切换、覆盖、回滚正在美化的 Termux 工作分支。在当前仓库目录使用 git fetch + git show FETCH_HEAD:路径，从远端分支把以下文件传入 Ubuntu PRoot 的专用预览目录 /root/conflux-acp-p1（与旧 /root/conflux 区分）：

    tools/devin-acp-bridge.mjs
    tools/conflux-acp-mcp.mjs
    .devin/mcp_config.json

具体示例，在 Termux 执行：

    cd ~/my_st_termux/conflux
    git fetch origin feat/devin-acp-native-tools-p1-20261030
    proot-distro login ubuntu -- mkdir -p /root/conflux-acp-p1/tools /root/conflux-acp-p1/.devin
    git show FETCH_HEAD:tools/devin-acp-bridge.mjs | proot-distro login ubuntu -- sh -c 'cat > /root/conflux-acp-p1/tools/devin-acp-bridge.mjs'
    git show FETCH_HEAD:tools/conflux-acp-mcp.mjs | proot-distro login ubuntu -- sh -c 'cat > /root/conflux-acp-p1/tools/conflux-acp-mcp.mjs'
    git show FETCH_HEAD:.devin/mcp_config.json | proot-distro login ubuntu -- sh -c 'cat > /root/conflux-acp-p1/.devin/mcp_config.json'

必须在 PRoot 中以真实磁盘文件运行 Bridge，而不是旧的 stdin node --input-type=module - 方式；MCP 适配器需基于 import.meta.url 获取同目录文件路径。先正常停止旧的 47831 桥，再在 Ubuntu 中运行：

    cd /root/conflux-acp-p1
    DEVIN_ACP_WORKSPACE=/root/conflux-acp-p1 DEVIN_ACP_COMMAND=/root/.local/bin/devin DEVIN_ACP_BRIDGE_TOKEN="$DEVIN_ACP_BRIDGE_TOKEN" node tools/devin-acp-bridge.mjs

前提：Ubuntu PRoot 和 Termux 4173 本地服务必须设置同一强随机 DEVIN_ACP_BRIDGE_TOKEN（至少 24 字符），仅保存于私有环境，不要提交 Git。原先未配置 token 的 4173 服务，必须在保留原环境和修改的前提下择机重启并传入同一 token；不要在本工单中强行停止正在美化的服务。

**注意**：只传入桥的两个 mjs 不会自动升级 4173 浏览器源代码；还需要隔离预览带有本 PR 的 TypeScript 变更的页面。旧 UI 即使显示桥接在线，也不意味着原生工具通路有效。切换预览时不要覆盖 Termux 主工作树或用户数据。

平板最终验收：Fable 调用 searchMemory 返回真实记忆候选，并在需要时使用 openMemorySource；再用 listEnvironmentNodes 返回真实目录。检查对应工具记录和回执，确认继续回答。验证普通聊天第二轮、模型选项、token/cache 统计，以及取消/断连/权限拒绝。完成前保持 Draft PR，不合并。


## 2026-10-31 收尾测试：旧 4173 保持运行

新增修复：浏览器中断或用户取消后立即终止仍在等待的 session/prompt，让下一条消息不必等待原本最长 10 分钟超时。模拟 Devin 无视取消的测试用例已补充，但没有新的运行通过日志。

在先前已有的 ~/my_st_termux/conflux-acp-p1 独立工作树中（已叠加 PR #12），先确认 git status --short 为空、两个提交尚未包含，才运行：

    cd ~/my_st_termux/conflux-acp-p1
    git fetch origin feat/devin-acp-native-tools-p1-20261030
    git cherry-pick 21ee6388d40448d95b6d495b7b4e8259b91210e2 60ad946f0dd1a412adb4e0d5264582b80b2c7447
    node --test tools/devin-acp-native-tools.test.mjs
    npm run typecheck

不重新运行全量测试，不重复前次 9 项 Vitest，不进行付费模型探测。

真实验证采用独立端口：保留正在美化的 4173 和旧 47831；测试 Vite/Conflux 使用 4174，测试 PRoot Bridge 使用 47832。4174 是独立 browser origin，不共享 4173 的 LocalData，因此只在 4174 创建专用测试协作者和测试记忆，**不读取生产个人记忆**。

将隔离工作树下 tools/devin-acp-bridge.mjs、tools/conflux-acp-mcp.mjs 和 .devin/mcp_config.json 复制到 Ubuntu /root/conflux-acp-p1 相同相对目录（不得覆盖旧 PRoot Bridge）：

    proot-distro login ubuntu -- mkdir -p /root/conflux-acp-p1/tools /root/conflux-acp-p1/.devin
    cat tools/devin-acp-bridge.mjs | proot-distro login ubuntu -- sh -c "cat > /root/conflux-acp-p1/tools/devin-acp-bridge.mjs"
    cat tools/conflux-acp-mcp.mjs | proot-distro login ubuntu -- sh -c "cat > /root/conflux-acp-p1/tools/conflux-acp-mcp.mjs"
    cat .devin/mcp_config.json | proot-distro login ubuntu -- sh -c "cat > /root/conflux-acp-p1/.devin/mcp_config.json"

在独立 Termux 窗口中启动 4174。先在本机私下设置仅测试用的强随机 DEVIN_ACP_BRIDGE_TOKEN（至少 24 字符），不要存进 Git、截图或公开日志；命令必须从隔离工作树运行，且该变量已被其 shell 继承：

    DEVIN_ACP_BRIDGE_PORT=47832 node --import tsx --input-type=module -e "import {startLocalServer} from './tools/conflux-local-server.ts'; await startLocalServer({dev:true, port:4174}); console.log('Conflux isolated: http://127.0.0.1:4174')"

另一 Termux 窗口使用相同测试 Token，启动独立 Ubuntu PRoot Bridge：

    proot-distro login ubuntu -- env DEVIN_ACP_COMMAND=/root/.local/bin/devin DEVIN_ACP_WORKSPACE=/root/conflux-acp-p1 DEVIN_ACP_BRIDGE_PORT=47832 DEVIN_ACP_BRIDGE_TOKEN="$DEVIN_ACP_BRIDGE_TOKEN" node /root/conflux-acp-p1/tools/devin-acp-bridge.mjs

打开 4174 的 Android 浏览器，只创建虚拟测试数据，启用记忆读取/环境工具，用一次真实 Devin ACP Fable 测试 searchMemory；必须能看到工具调用及结果内容，Fable 才能依据结果继续回复。追加验证正常聊天、取消后恢复、模型选项和 Token 显示。否则停在 Draft / PR 待验收，不合并。

停止 4174 和 47832 即可退出独立预览，不触碰 4173 / 47831 或用户存储。
