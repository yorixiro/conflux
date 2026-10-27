# Conflux 记忆召回 V1 — 实施与验收清单

状态：进行中。参考 Scarlett「一句话走完 / 三条通道 / 一个闸门」的行为架构，独立实现；**不是视觉移植，也不是第二份记忆数据库**。

## 目标与边界

- 一轮普通聊天最多**被动召回一条**相关旧记录，也允许零条；主动调用 `searchMemory` / `openMemorySource` 不受这个数量限制。
- 用户手动保存的稳定 Persona 记忆属于显式资料，不与隐式召回共用删除或迁移通道。V1 的一条限制专指动态被动召回。
- 继续使用 Polaris 的 `requestPreparation`、Persona、Chat、LocalData 和工具账本；不复制 Chat 引擎，不自动迁移或修改既有历史。
- 保留原多候选召回行为为兼容回退，直到隔离数据、持久化及双端验收完成。
- 不把未授权的私人日记、其他角色对话、密钥或未知文件送入检索上下文。

## 八步链路与代码归属

| 环节 | 现有职责 / 新增落点 | 完成条件 |
| --- | --- | --- |
| 入口 | `requestPreparation.ts` / 当前 Persona 与会话所有权 | 当前身份与可检索会话来源可信 |
| 听懂 | `memoryRecallTerms.ts`、`memoryRecallAnchors.ts` | 短句、中文专名、否定/时间线索在隔离语料中可检索 |
| 找 | `requestSemanticRecallPlan.ts`、`requestSemanticVectorRecall.ts` | 词法与向量候选带来源，RRF 同源合并 |
| 闸门 | `requestRecallGate.ts` | 作用域、强弱阈值、灰区复判、去重、冷却，结果为零或一 |
| 给 | `requestOneMemoryRecall.ts` → `requestPreparation.ts` → `requestContext.ts` | 模型实际上下文只包含最终获准的动态召回 |
| 另外通道 | `exactRecallEvidence` / 既有长期资料目录 | 专名触发也经过同一闸门，资料不被无条件展开 |
| 我自己翻 | `searchMemory` / `openMemorySource` | AI 在授权范围内主动检索并能定位来源 |
| 复盘 | 请求 audit / 助手消息上的 `passiveRecallReview` 与 `passiveRecallReceipt` | 能解释命中、拒绝、注入和冷却；回执随聊天记录持久化 |

## 三阶段交付

### 第一阶段：查询到模型上下文

- [x] 复用原有词法/向量候选和唯一请求编排器。
- [x] RRF 融合；低相关拒绝；灰区复判失败默认拒绝；角色作用域。
- [x] 拦截纯最近消息/语气锚点对相关候选的遮蔽。
- [x] 单条注入和空结果请求级测试；原模式保留。
- [ ] 检索质量的中文多义词、时间、否定、专名基准集。

### 第二阶段：可追溯与生命周期（已实现基础闭环，仍需扩大持久读回覆盖）

- [x] 在现有 ChatMessage.memoryEvidence 中写入被动注入回执与拒绝原因；只有请求上下文实际包含选中片段、且模型成功返回并提交助手消息时才生成送达回执。随 LocalData 对话存储/删除，不建第二份记忆库。
- [x] 将现有已加载对话中的回执接入下一轮 cooldown；同源只记录最后一次，其他 Persona 的回执不参与。
- [ ] 冷却时间、重复记忆、失败重试、断电读回、历史删除与回执一致性测试。
- [x] 主动查阅的摘要来源过滤按 Persona 限定；缺少 Persona、来源失效/部分消息被删时拒绝读取。
- [ ] 确认隐私边界与可撤销授权；取消操作不生成回执。

**未完成的关键边界：** 目前跨轮冷却从当前对话和召回目录中已加载的对话消息读取；没有读取到的旧会话回执不能保证跨窗口冷却。真实 Android 断电恢复、保存失败重试、批量历史删除和用户可撤销授权还需要验收。旧默认多条召回保持不变，新路径仍为 `oneMemoryRecallEnabled` 显式 opt-in。

### 第三阶段：启用与回归

- [ ] 用用户可见、可回退的方式启用新模式；在此之前维持显式 opt-in 参数，默认旧路径。
- [ ] 对比 0 / 1 命中率、错误召回、延迟、prompt token、空结果比例。
- [ ] 运行类型检查、相关测试、构建及数据边界测试；区分未运行与失败。
- [ ] Android 真机和 Web/PWA 分开验收，未测不宣称通过。

## 当前代码接口

`planPassiveRecall` 是无状态纯决策层，只接收已授权、已检索的候选。`planOneMemoryRequestRecall` 将 Polaris 现有 `matched_context` / `vector_match` 源消息映射进闸门。`prepareCollaboratorReplyRequest({ oneMemoryRecallEnabled: true })` 选择新路径；没有该参数时仍走旧路径。请求链已透传 `oneMemoryRecallEnabled` 并从已加载聊天消息读入 `passiveRecallDeliveries`；UI 尚未提供开关，不能宣称正式启用。

提醒：测试中使用合成消息和假 Provider，没有发送付费模型请求，也没有读取用户真实历史。代码测试通过不等于移动设备体验通过。
