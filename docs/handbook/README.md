# Conflux 模块技术手册

技术索引，不是第二套开发要求。旧的 Polaris 模块说明只用于理解代码来源和存储结构；以当前 `conflux-dev` 实现为准。唯一日常开发规则见 [AGENTS.md](../../AGENTS.md)。

## 首选入口

- [Conflux 架构](../CONFLUX_ARCHITECTURE.md)
- [开始开发](GETTING_STARTED.md)
- [数据与存储](DATA_AND_STORAGE.md)
- [开发与代码定位](DEVELOPER_GUIDE.md)
- [共享类型](TYPES_AND_CONTRACTS.md)
- [历史存储证据](../open-source/README.md)

## Module Notes

Each module note is a design-and-usage page, not a file dump. Read it for what the module owns,
what it must not own, and how to extend it.

- [Assets](MODULES/assets.md)
- [Chat](MODULES/chat.md)
- [Collection](MODULES/collection.md)
- [Config](MODULES/config.md)
- [Documents](MODULES/documents.md)
- [Import And Export](MODULES/import-export.md)
- [LocalData](MODULES/local-data.md)
- [LocalData Health](MODULES/local-data-health.md)
- [MCP Runtime](MODULES/mcp-runtime.md)
- [Native Bridges](MODULES/native-bridges.md)
- [Persona](MODULES/persona.md)
- [Product Knowledge](MODULES/product-knowledge.md)
- [Runtime](MODULES/runtime.md)
- [Space](MODULES/space.md)
- [Theme](MODULES/theme.md)
- [Tools](MODULES/tools.md)

只更新真实变更涉及的模块说明；旧发布门槛、拆分计划、重复 FAQ 不再要求执行。
