# Developer Guide

This guide answers "where should this change go?" for Conflux work.

## Add Product Copy Or Knowledge

- Product documentation content: `src/app/shell/productKnowledge/`.
- Product docs registry/API: `src/app/shell/productDocs.ts`.
- Module docs: `docs/handbook/MODULES/`.

Do not put long prose catalogs back into orchestration files.

## Add Static Config

Use the responsible subfolder:

```txt
src/config/persona/
src/config/theme/
src/config/prompts/
src/config/catalog/
```

Leave config root only for genuinely cross-cutting config. There is no broad config barrel; import
by the specific path so ownership stays visible.

## Add A Tool

先确认现有工具能否复用。需要新能力时，沿实际调用链修改：工具描述及可见性 → 参数解析 → 执行 → 结果回显；已有的记录/回放路径受影响时再同步更新。**关闭工具必须真正禁用执行，而非只隐藏提示词。**

验证只针对这次改动的调用和关闭场景；不要求每个工具额外建一份流程、模块文档或八阶段验收。

## Add Or Change Persistence

Find the domain folder first:

```txt
src/stores/chat/
src/stores/collection/
src/stores/persona/
src/stores/runtime/
src/stores/space/
src/stores/asset/
src/stores/document/
```

Use a domain facade for store-facing reads/writes, a row engine for LocalData rows, and a
`migrationPlanner.ts` only for explicit staging/migration paths.

Do not add downstream defensive checks until you trace where the value is produced and which
trust boundary already validated it.

## Add UI

Use `src/app/` for controllers, orchestration, effects, and product workflow state. Use `src/ui/`
for React presentation and interaction components.

Do not put source-of-truth decisions in UI components. Do not put layout or visual styling into
store and engine files.

## Add Theme Behavior

- Static theme catalogs and selectors: `src/config/theme/`.
- Theme math and CSS generation: `src/engines/theme-coordinate/`.
- Theme sessions and preview transactions: `src/app/theme/`.
- Theme persistence/state: `src/stores/space*`.
- Theme UI: `src/ui/theme-tool-mode/`, `src/ui/shell/`, and related world components.

Theme may change look. It must not take ownership of viewport, keyboard, or shell geometry.

## Add Native Capability

Native capabilities live behind `src/native/`, `ios/`, or `android/`. Keep product semantics in
shared `src/` code and expose only the capability boundary through native code.

## Verification

开发流程和检查范围统一遵循 [AGENTS.md](../../AGENTS.md)。按本次修改选择定向检查，日常类型或引擎修改不默认运行全量测试；发布检查仅用于实际发布。
