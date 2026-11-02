# LocalData

LocalData is the durable facts contract for Polaris data. It defines row states, domain ownership,
commit validation, backend abstraction, and active-source promotion.

## Purpose

Make data ownership explicit and testable. A row is either complete, unloaded, incomplete, timed
out, or deleted; the system must not silently convert missing evidence into current data.

## Boundaries

LocalData owns:

- Domain row keys, row states, and commit metadata.
- Readback and validation after commits.
- Active-source promotion.
- Backend abstraction across KV, memory, SQLite, and native SQLite.
- Migration, census, health, and import/export evidence.

LocalData does not own:

- UI presentation.
- Provider networking.
- Product workflow orchestration.
- Native platform semantics beyond the backend capability interface.

## Source Map

```txt
src/engines/localData/types.ts
src/engines/localData/repository.ts
src/engines/localData/localDataKvBackend.ts
src/engines/localData/localDataSqliteBackend.ts
src/engines/localData/localDataMemoryBackend.ts
src/stores/localDataStorePersistence.ts
src/stores/storeLocalDataBackendHost.ts
src/app/bootstrap/storeLocalDataBackendBootstrap.ts
src/native/localDataSqlite.ts
```

Domain row engines live in `src/stores/{domain}/` and call the LocalData contract rather than
owning backend details.

## Data Flow

Ordinary write:

```txt
store action -> domain facade -> domain row engine -> LocalDataRepository.commit
```

Migration/import:

```txt
external evidence -> staged unit of work -> validation -> active-source promotion
```

## Public Usage

New domain persistence should:

- Construct explicit `LocalDataRef` values.
- Commit complete rows or tombstones through the repository.
- Promote a domain only after validation proves the row set is coherent.
- Return explicit failure states rather than empty replacement data.

## Extension Rules

- Add row shapes in the owning domain and shared row contracts in `src/engines/localData/types.ts`.
- Keep store-facing APIs in `src/stores/{domain}/index.ts` when the domain has a facade.
- Keep migration code in `migrationPlanner.ts`; it is not ordinary persistence.
- Do not read old KV or SQLite directly from UI or app controllers.

## Verification

定向检查与测试范围统一见 [AGENTS.md](../../../AGENTS.md)。只验本次受影响的模块，除发布或大范围整合外，不默认运行全量测试或构建。

