# Conflux 功能迁移矩阵
2026-10-19 · 所有“目标”表示待实施，不表示已经具备。

| 来源 | 功能 | 决策 | 初始阶段 | 技术落点 |
|---|---|---|---|---|
| Polaris | Chat / Group / Persona | 原样保留，补 bug | P0–P1 | 现有 chat/group/persona |
| Polaris | Collection / Workspace | 保留并扩展 | P0–P3 | collection / LocalData |
| Polaris | Request / Memory / Tool | 唯一执行引擎 | P0–P2 | request、tool-protocol |
| Polaris | Web / Android 包装 | 优先跑通双端 | P1 | Vite、Capacitor、native |
| IB | 好友、群聊、频道、收藏、表情包行为 | 映射进现有聊天 | P2–P4 | chat + asset + collection |
| IB | Auto Memory / 摘要 / 重要性确认 | 合并现有记忆 lane | P2 | existing context compiler |
| IB | 备份导入、Persona、Chat、Asset | staged import；不可在启动时自动导入 | P2 | imports/ib-import + LocalData |
| IB | Blog / 密码日记 / AI 批注 | 新模块；默认私密 | P3 | journal + document |
| IB | Letters | 新模块；异步投递后做 | P3 | letters + runtime jobs |
| IB | Calendar / 纪念日 | 新模块，时区/重复规则 | P3 | calendar + tool permissions |
| IB | Coread | 依托 document 和 chat thread | P3 | coread + collection |
| IB | Helper | 变为有白名单的设置助手 | P3 | settings + tool ledger |
| IB | ICode / GitHub | 融入 Workspace，不建第二套文件库 | P3 | collection + tools |
| IB | Circle / 动态 | 本地个人社交世界，AI 发帖受权 | P4 | social |
| IB | Music / LRC / 一起听 | 先本地媒体，外部音乐服务最后 | P4 | media/music |
| IB | Call / 语音消息 / TTS STT | 先文本+语音，再实时打断 | P4 | media/voice + permissions |
| IB | Cinema / 字幕 / 本地视频 | 后期模块，不先做视频群聊 | P4+ | media/cinema |
| IB | 伪 iOS Home / Lock / Wallet / 原主题 | 不迁 | — | 保留 Polaris 的 UI |
| Aru Host | Remote Jobs / MCP / Artifacts | 可选适配，逐项验证 | P5 | integrations/aru-host |
| Aru | 主动任务 / 后台作业 | 后期做，服务器承担可靠执行 | P5 | Host/queue/notification |
| Aru | 交换格式 | 仅外部导入/导出协议 | P5 | integrations/aru-format |
| Conflux | 双端备份恢复 / 发布 | 必须 | P6 | releases / migration |
| Conflux | 加密多端同步 | 可选、需独立设计 | P6+ | sync adapter |

## 里程碑
- P0：锁定三仓版本、依赖、许可证、构建与数据 baseline。
- P1：从同一 commit 构建 PWA 与 Android Debug APK，发送并取消 Grok 流式响应。
- P2：IB 备份 staged import + 记忆合流，重复导入不新增重复数据。
- P3：日记、信件、日历、共读、设置助手的第一批可用版本。
- P4：社交、音乐、TTS/STT、媒体权限和语音能力。
- P5：Aru Host job / artifact / MCP、主动任务权限边界。
- P6：备份恢复演练、可靠构建、真机验收，按需设计加密同步。

顺序原则：先双端同核与数据安全，再功能，再后台；不允许把漂亮的空页面当作“功能完成”。
