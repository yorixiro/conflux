# Conflux — 系统架构与技术决策
版本：v1.0 · 2026-10-19
状态：实施设计，不代表功能已实现
目标：个人自用；一套 React/TypeScript 业务源码同时输出 Android APK 和 Web/PWA。

## 1. 代码基线与来源
- 主框架：Aevella/polaris-local-first；本仓库是该项目的 fork。继续保留原生 Chat / Group / Persona / Collection / Runtime / Tool Protocol / LocalData 架构。
- 功能参考：yorixiro/InternalBeyond-Mobile（IB）。迁移有价值的行为与数据，不套用 IB 的伪 iOS 桌面、锁屏、主题或消息气泡外观。
- 远程能力参考：Aevella/aru-host 和 aru-collaborator-format；仅通过经过验证的公开协议或自己的 Host 接口接入，不假定 Aru iOS 客户端协议兼容 Android。
- 不改原有 IB、花信、EH-UI 仓库，不把它们作为融合项目的主干。
- 原生证据：Polaris 已有 android/、src/native/、Capacitor 配置以及 npm run android:build-debug；这仅说明具备构建入口，不代表已构建或已在安卓真机通过验收。

## 2. 不可动摇的边界
1. **单一业务内核**：一套聊天事件、一个 Persona 身份源、一个上下文编译器、一个工具执行与审计链、一份 LocalData 事实源。禁止简单并排塞进第二个聊天引擎。
2. **多平台薄适配**：Android 和 Web/PWA 共用 UI、路由、业务逻辑、持久化领域契约；只在文件、凭据、通知、后台任务、网络与媒体权限上分流。
3. **Local-first**：离线可浏览历史、日记、文档；AI 网络请求和远程任务当然需要网络。不得将 UI/Zustand 视作唯一数据库。
4. **独立视觉与交互**：Conflux 的设计、主题、导航和组件尺寸由本项目定义。旧工程的视觉规范不是开发要求；既有实现仅作为尚待替换的技术基础。
5. **隐私优先**：密码日记、密钥、本地文件默认不进入上下文、不外发。每个显式的模型或 Host 访问记录范围与结果。
6. **实事求是**：未验证的 Aru pairing、同步、推送和跨平台兼容不得宣称已支持。UI 中未实现的功能不展示成已完成。
7. **许可边界**：Polaris 现有代码为 AGPL-3.0-only；IB-Mobile 为 PolyForm Noncommercial 1.0.0；Aru Host 为 Apache-2.0。个人研究与公开再分发是两回事；跨许可证复制原码前需专门评估。优先学习行为后实现独立适配而非整段搬运 IB 代码。

## 3. 分层关系

~~~mermaid
flowchart TD
    U[Shared React UI / Polaris Shell] --> F[Feature Domain Layer]
    F --> CHAT[Polaris Chat Group Persona Collection]
    F --> MEMORY[Existing context compiler / memory lanes]
    F --> TOOL[Tool Protocol / grants / receipts]
    F --> PLATFORM[Platform capabilities]
    F --> DATA[LocalData + blob repository]
    F --> PROVIDER[Provider runtime: xAI + existing]
    PLATFORM --> WEB[Web PWA: browser persistence / SW]
    PLATFORM --> ANDROID[Android: native SQLite / Keystore]
    PROVIDER --> API[Owned same-origin relay or permitted transport]
    TOOL --> HOST[Optional Aru Host adapter]
    HOST --> JOB[Jobs / MCP / artifacts]
    F --> SYNC[Optional encrypted sync: later]
~~~

现有架构职责参见：
- docs/open-source/architecture-overview.md
- docs/handbook/DATA_AND_STORAGE.md
- docs/connect-your-own-backend.md

先阅读原有契约再变更模块。优先沿用现有路径：
- src/app/chat/、src/ui/worlds/ChatWorld.tsx：对话与流式生命周期
- src/app/group/、src/app/persona/、src/app/collection/：群聊/身份/材料
- src/engines/request/、src/engines/provider-runtime/：上下文与模型
- src/engines/tool-protocol/：工具与审计
- src/engines/localData/：数据真相与导入
- src/native/、android/：平台边界

新功能推荐 src/features/journal、letters、calendar、coread、social、media/music、media/cinema、media/voice；集成推荐 src/integrations/ib-import、aru-host、providers/xai。目录是建议，不为整齐大搬家。

## 4. 持久化与数据迁移

Polaris LocalData 领域沿用 asset/chat/collection/document/persona/runtime/space；遵守 active-data-source、row completeness、readback commit 约束。关键事实写入领域拥有者而不是随手塞 localStorage。Web 使用现有浏览器后端；Android 使用现有 Native/SQLite 适配；large binary 进入 blob / native file。密钥在受支持的安全存储中保管，不直接放 JS bundle、备份、日志。

IB 导入：用户手动选择备份 → 校验格式、schema 和版本 → staging → sourceId 到 targetId 映射 → dry-run 统计与预览 → 用户确认 → 领域级 promote → readback → 报告。重复导入必须幂等；失败不能损坏原存储；原始备份不可修改。Persona 不等于 Provider；通话卡只引用消息；私密日记默认隔绝模型。

手机和平板与浏览器的**同一套代码不等于同一份数据**。V1 各设备独立，支持备份导出和导入。后续同步需要设备 ID、revision、变更日志、冲突策略、端到端加密和密钥恢复专项设计；不要悄悄做明文云备份。

## 5. 模型与工具执行
- 复用 Polaris provider-runtime，只添加 xAI/Grok adapter。支持能力发现、可用模型、流式文本、取消、错误和用量事件；不可写死模型名或返回结构。xAI API 具体可用端点以实现时官方文档为准。
- 将上游事件统一成 Polaris 当前已使用的内部事件类型；禁止 UI 直接对多个厂商各自 fetch。
- 401/429/5xx、限流、断流、超时、用户取消必须有可信状态，保留可恢复的草稿。
- Web 前端不能暴露 API 密钥。首选用户自控的 relay/BFF（同源/CORS 明确配置）；Android 凭据由安全存储管理。
- 工具流程：schema -> authorize -> execute -> durable receipt -> visible result -> next-turn replay。删除、代码执行、Git push、外发内容、日记读取等必须显式授权；不能因连上 Host 就上传聊天史。

## 6. Aru Host 和后台任务
Aru Host 是可选节点而非必需登录服务。先验证 API manifest、鉴权、CORS、jobs 状态、取消、制品索引和连接断开；不将 iOS 的 APNs 或 pairing 协议直接照搬到 Android。远程 job 必须带 idempotency key，断网重连后查询结果而非重复提交。断连时本地聊天/资料不受影响。1 核 1GB VPS 只适合轻量 relay / 调度原型；不默认承诺在其上跑本地大模型、视频处理或重媒体服务。

PWA Service Worker 不能保证浏览器关闭后持续执行定时任务；Android 使用 WorkManager / notifications 的平台限制也要明确。持续后台作业应由用户授权的 Host 或服务端完成。

## 7. 交互
主要区：Chat、Workspace、Library、Activity、Settings；桌面采用侧边导航，手机采用响应式导航，不重复开发两套页面。优先保证聊天输入、附件、键盘回避、群聊和工具结果可用；日记、信件、日历、音乐、共读等增量落在现有 shell。视觉和交互以 Conflux 当前自定义实现及 docs/UI_LAYOUT_SPEC.md 为依据；新主题使用独立适配层，复杂模块按需懒加载。

## 8. 完成定义
必须可在同一源码 revision 完成 Web/PWA 构建与 Android Debug APK。验收包含：
- npm ci / npm run verify（基于源码实际 scripts 执行）
- npm run android:build-debug（在具备 Android SDK/Gradle 的环境）
- 浏览器：聊天发送、流式停止/重试、本地刷新保留、离线阅读、PWA 安装
- 安卓：真机键盘与权限、应用重启后恢复、文件读写、敏感凭据、失败与重连
- IB 导入：数目对账、重复导入不复制、私密内容隔离、回滚与备份
- 远程：Host 不可用时本地能力正常；无授权时不上传内容
完成状态必须区分设计 / 实现 / build / E2E / 真机验收。
