# Devin ACP 原生工具桥接 P1：验收与回滚

状态：**代码已提交；模拟测试用例已编写，但未在真实运行环境执行；Fable/Android 实机尚未验收。**
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
