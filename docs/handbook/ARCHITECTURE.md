# Architecture

Polaris is a local-first AI workspace. The shared product runtime lives in `src/`; web,
selfhost, iOS, and Android wrappers should consume that shared runtime instead of copying product
semantics into platform shells.

## Layer Direction

The intended dependency direction is:

```txt
types -> config -> engines -> stores -> app -> ui
```

Platform and infrastructure boundaries sit beside the shared runtime:

```txt
native / infrastructure / server adapters -> engines or stores through explicit APIs
```

Do not invert this by importing shell UI from chat orchestration, store internals from components,
or native bridge details from product logic.

## Layer Responsibilities

| Layer | Owns | Must not own |
|---|---|---|
| `src/types/` | Shared product contracts and domain types. | Runtime decisions, persistence, UI state. |
| `src/config/` | Static catalogs, prompts, presets, and selector registries. | User state, generated runtime facts. |
| `src/engines/` | Pure or reusable logic: LocalData contracts, request building, provider runtime, tool protocol, theme math, import checks. | React state, store lifecycle, visual layout. |
| `src/stores/` | Durable client projections and five product stores: space, chat, collection, persona, runtime. | Rendering, provider transport policy, platform shell behavior. |
| `src/app/` | Orchestration hooks and controllers that connect stores, engines, and product workflows. | Low-level persistence contracts, visual styling. |
| `src/ui/` | React presentation, shell surfaces, and interaction components. | Source-of-truth decisions, migration logic, hidden side effects. |
| `src/infrastructure/` | Browser/native storage helpers, asset blob storage, and low-level persistence facilities. | Product ownership semantics. |
| `src/native/`, `ios/`, `android/` | Platform capabilities: SQLite plugin, files, notifications, WebView shell integration. | Duplicated chat, theme, collection, or persona product logic. |

## Five Stores

The product state layer has five stores:

- `spaceStore` — workspace frame, theme/frontstage/display state, saved skins, collaborator theme
  state.
- `chatStore` — conversations, messages, tasks, drafts, groups, chat workflow state.
- `collectionStore` — cards, image cards, room projects, project files, workspace reference doc
  directory rows.
- `personaStore` — collaborators/personas, active collaborator, persona settings, memory heads.
- `runtimeStore` — providers, model settings, tools, MCP, web search, voice/image settings,
  triggers, companion connection state.

Do not merge these stores. Do not add a sixth store unless the product has a genuinely new durable
state family.

## Data Spine

LocalData is the durable facts contract. Domain rows are the current source for active product
facts; old data participates only at explicit import, migration, census, health, or recovery
boundaries.

The normal path is:

```txt
UI intent -> app controller -> store action -> domain persistence facade -> LocalData row engine
```

The import path is separate:

```txt
package evidence -> parse/validate -> reconstruct LocalData rows -> promote coherent domains
```

Do not make ordinary startup read old storage as if it were current data.

## Tool Spine

A model tool must be available only when enabled, parse valid arguments, execute its intended
action, and return the result to the conversation. Reuse existing registration and execution
paths rather than building parallel tool systems. For daily architecture review and tests,
follow [AGENTS.md](../../AGENTS.md) instead of a separate gate.

## Theme Spine

Theme tooling uses the preview/apply/rollback contract:

```txt
theme action -> description metadata -> preview transaction -> visible theme state
-> apply or rollback
```

The describer may attach preview metadata. It must not write CSS, apply a skin, or decide layout
geometry. Theme can change look; layout geometry belongs to the layout contract and shell
geometry owners.

## Platform Boundary

Most product behavior should be fixed once in `src/`. Use `ios/`, `android/`, `src/native/`, and
desktop bridge code only for real platform capabilities: storage, file access,
notifications, native HTTP, SQLite, and shell integration.

When diagnosing a platform report, first ask:

1. Is the behavior shared product logic in `src/`?
2. Is there an explicit platform branch?
3. Is a native capability actually involved?
4. Which channel needs release verification?

Source fixed is separate from web selfhost, Android APK, iOS/TestFlight, and App Store release
state.
