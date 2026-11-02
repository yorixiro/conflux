# Polaris Handbook

This handbook is the current-source guide for Polaris. It explains the codebase as it is
meant to be maintained: by responsibility, owner boundary, and data flow.

Use [AGENTS.md](../../AGENTS.md) for the single daily development workflow. This handbook
is a technical reference, not an additional review process. Historical storage evidence is
listed in [docs/open-source/](../open-source/README.md).

## Reading Order

1. [Architecture](ARCHITECTURE.md) — the layer map, dependency direction, and major ownership
   boundaries.
2. [Getting Started](GETTING_STARTED.md) — install, run, test, and build commands.
3. [Data And Storage](DATA_AND_STORAGE.md) — LocalData, domain rows, source-of-truth rules, import
   boundaries, and backend shape.
4. [Types And Contracts](TYPES_AND_CONTRACTS.md) — the domain type barrel and subsystem type
   ownership.
5. [Developer Guide](DEVELOPER_GUIDE.md) — where to add common changes and which gates to run.
6. [Publication Gate](PUBLICATION_GATE.md) — checks before any public archive or release claim.
7. [FAQ](FAQ.md) — short answers to common contributor questions.

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

## Handbook Scope

- Current architecture and module ownership.
- How to add or modify a feature without crossing boundaries.
- Technical references; routine checks are defined only in [AGENTS.md](../../AGENTS.md).
- Current implementation facts.

## Maintenance Rule

Update an existing module note when a real change makes its content inaccurate. Do not create
a separate audit, handoff document, or approval gate for an ordinary change.
