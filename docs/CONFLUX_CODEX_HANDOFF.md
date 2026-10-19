# Codex 执行任务书：Conflux
项目：yorixiro/conflux · Base: Polaris fork
本文件是给编码代理的实际工作合同；逐 PR、小步提交，所有重大改动提供日志与可验证结果。

## 0. 先读
1. AGENTS.md
2. docs/CONFLUX_ARCHITECTURE.md
3. docs/CONFLUX_MIGRATION_MATRIX.md
4. docs/open-source/architecture-overview.md
5. docs/handbook/DATA_AND_STORAGE.md
6. 当前 package.json、capacitor.config.ts、android/ 和 src/native/

**不要未经测试直接跑完整移植。不要更改旧 IB 或花信仓库。不要重做当前 Polaris Chat 交互引擎。**

## P0: 基线审计（第一张 PR）
分支建议：chore/conflux-p0-baseline
- 固定 fork/base、Polaris 上游、IB-Mobile、Aru Host 的 commit SHA、LICENSE、build script、主要目录。
- 在有依赖的环境执行 npm ci、npm run verify、npm run android:build-debug；缺 Android SDK 时明确 BLOCKED 而不是写“成功”。
- 检查当前 Android appId / appName / Manifest、Web PWA manifest、SW、API relay 和数据持久化；列出已有功能，避免重复实现。
- 列出 Polaris 上游已有 memory lanes、provider contracts、工具事件流和 LocalData migrations；提供准确的函数名、文件路径。
- 产出 docs/CONFLUX_BASELINE_REPORT.md：源版本、命令、实际结果、未通过清单、依赖关系图、风险。
- PR 不做架构重写，尽量不修改业务代码。
验收：基础构建结果有日志、现有测试没有新增回归、已知风险不被掩盖。

## P1: 共用 Web/PWA + Android 壳与 xAI Adapter
分支建议：feat/conflux-p1-platform-provider
- 优先沿用 Capacitor 和现有平台抽象，不复制 React 视图；检查 manifest、service worker、offline storage。
- 适配 xAI/Grok Provider 到现有 ProviderRuntime；能力识别、流式增量、取消、错误和恢复。不要在组件层每个页面各自拼 API。
- 浏览器凭据策略：安全 relay/BFF，禁止 build 时嵌入私钥；Android 凭据安全保存。
- 通过 PWA/Android smoke，证明同一 commit 两端运行聊天、离线读取和附件基础功能。
验收：构建、冷启动、刷新持久化、网络断连、429/5xx、取消、工具回执可核对。

## P2: IB staged import 与单一记忆模型
分支建议：feat/conflux-p2-import-memory
- 不直接粘贴 IB 的 index.html；以可脱敏样本写解析器、结构校验、dry-run、sourceId mapping、staging、提交回读和回滚报告。
- 对 Persona、Chat、Asset、Memory 做显式迁移；再次导入不复制。
- 调整 Polaris 唯一 context compiler；IB auto-memory 作为优先级/候选卡，不能形成第二份 always-on 隐性 prompt。
验收：实体数一致、重复导入幂等、失败不损坏现存内容，密码日记不进入模型 prompt。

## P3: 日记 / 信件 / 日程 / 共读 / 设置助手
分支建议：feat/conflux-p3-library-activity
- 最小闭环：UI -> 权限 -> domain model -> durable LocalData -> readback -> export -> tests。
- Blog 密码日记默认 private，AI 批注按授权；Letters 持久消息与投递状态；Calendar 时区/重复规则；Coread 与文档位置；Helper 限定操作白名单，全部可审计。
- ICode 合入 Collection/Tool，不允许第二套文件事实源。
验收：刷新持久化、模型可访问范围测试、异常与恢复。

## P4: 社交与媒体
分支建议：feat/conflux-p4-media-social
- Circle 发帖/评论需授权；Music 首选本地音频/LRC；Voice 先 TTS/STT 再低延迟通话；Cinema 本地资源/字幕。
- 安卓权限、音频中断、后台回收、浏览器媒体策略都要有可解释降级。
验收：真机媒体权限、用户中断和离线表现验证。

## P5: Aru Host optional adapter
分支建议：feat/conflux-p5-aru-host
- 列出并验证 Host 实际 API、认证、JobReceipt/状态查询/取消、MCP 和 artifact。
- 远程执行按工作区和文件范围逐项授权；提交时 idempotencyKey；断网后查询状态。
- 不假定 iOS pairing、APNs、Push 可以直接复用。
验收：Host 宕机本地功能不受影响、失败不重复执行、无授权不可外发。

## P6: 稳定发布
分支建议：chore/conflux-p6-release
- Web/PWA install、Android debug/release builds；导出备份、导入恢复、升级回归、数据回滚。
- 根据资源决定是否做独立的端到端加密多端同步，不绑定 V1 里程碑。
验收：两端同版、数据完整、无秘密泄露、实际设备验证记录。

## 每个 PR 必须附上
- Scope / 改了什么、涉及哪些 domain owner
- Commands run / 原始测试输出与未执行说明
- Data migration / 失败回滚
- Browser + Android verification（没有设备必须写未验证）
- 截图或录屏（仅在 UI 变化时）
- 新增第三方代码的许可来源
- 下一阶段未完成项

**现在开始只处理 P0；P0 未通过，不得自行跳至 P2–P5。**
