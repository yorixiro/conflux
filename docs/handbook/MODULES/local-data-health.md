# LocalData Health

LocalData Health is the **diagnostic** view over local storage: storage-size buckets, chat/persona/
collection/asset consistency stats, domain source status, promotion readiness, and collaborator
orphan detection. It answers "what is actually on disk and is it coherent?" — it is **not** a source
of truth and never participates in ordinary product reads or saves.

## Purpose

Give import, migration, census, promotion-readiness, and the settings storage-health UI a single
honest picture of local data without inventing facts. Health reads evidence and reports it; it does
not promote, repair, or replace data. Missing evidence stays visible as missing, never silently
converted into current data.

## Boundary

Health/census is an **explicit diagnostic boundary**, alongside import/migration/recovery. It is one
of the few places allowed to scan whole KV (`kvEntries(`) or touch legacy keys like
`polaris-space-store-v1`. `startupFactSourceBoundary.test.ts` pins that allowance to an exact file
list — ordinary startup, ordinary save, lazy body read, and current-fact export must **not** route
through here.

LocalData Health owns:

- Storage-size bucket classification and the diagnostic snapshot shape.
- Read-only consistency stats (asset meta/binary/preview, chat persistence, persona/workspace doc
  bodies, collaborator orphans).
- Domain source status + promotion readiness presentation for diagnostics.

LocalData Health does **not** own:

- Source-of-truth decisions, promotion, or repair. Promotion lives in
  `engines/localData/promotionReadiness.ts` and the store promotion persistence; health only reports
  its readiness.
- Ordinary product reads/writes. Those go through the domain facades (see [LocalData](local-data.md)).

## Source Map

```txt
src/infrastructure/localDataHealth.ts              public facade: snapshot/census assembly +
                                                   livePromotion parsing + public read entries
src/infrastructure/localDataHealth/
  storageKeys.ts         shared raw storage key names health reads (the key dictionary)
  recordGuards.ts        generic untyped-JSON shape guards (isPlainRecord, readRecordArray)
  source.ts              the read-source I/O entry: KV/asset/localStorage reads, lightweight +
                         promotion read selectors (readLocalDataHealthSource, holds kvEntries())
  buckets.ts             bucket ids/labels/order, KV+localStorage classification, byte sizing
                         (classifyKvKey, classifyLocalStorageKey, estimateLocalDataBytes)
  chatConsistency.ts     chat catalog/manifest/record/legacy-chunk consistency
                         (buildLocalChatPersistenceHealth)
  docBodyConsistency.ts  persona-memory + workspace-reference doc body split/chunked counting
                         (buildPersonaMemoryDocHealth, buildWorkspaceReferenceDocHealth)
  collectionConsistency.ts collection-state project-file + workspace-doc-directory counts
                         (buildCollectionSourceHealth)
  assetHealth.ts         asset meta/binary/preview reconciliation (buildLocalAssetStorageHealth)
  domainSources.ts       per-domain source status + readiness/issue presentation
                         (buildLocalDataDomainSources)
  collaboratorOrphans.ts collaborator orphan diagnostics (buildCollaboratorOrphanDiagnostics)
```

`buckets.ts` owns the storage-size taxonomy: which bucket a KV or localStorage key belongs to, the
bucket labels/order, and byte estimation. It holds the `polaris-space-store-v1` localStorage literal,
so one boundary file list in `startupFactSourceBoundary.test.ts` points at `buckets.ts`. `source.ts`
is the read-source I/O entry — it holds `kvEntries()` / `kvGet()` / `kvEntrySizes()`, the asset-store
reads, the localStorage scan, and the lightweight/promotion read selectors — so the other boundary
file list (the `kvEntries(` one) points at `source.ts`. The snapshot-assembly loop that *aggregates*
entries into buckets still lives in the facade because it weaves the full source shape; it calls the
`buckets.ts` classifiers and consumes the `source.ts` reader.

The facade is a real assembly entry point, not a compatibility shim. It was decomposed by
responsibility one slice at a time. `storageKeys.ts` and `recordGuards.ts` are shared foundations:
the first holds the raw storage key vocabulary health reads (a key graduates here once a second
concern references it), the second holds the generic untyped-JSON guards. Concern modules are pure
functions over already-read evidence that import those foundations — this is what lets a concern
leave the facade without duplicating constants or forming an import cycle. What remains in the facade
is genuine assembly: `buildLocalDataHealthSnapshot` (the bucket-aggregation loop + census/promotion
orchestration), livePromotion parsing, and the public read entries that combine `source.ts` reads
with report building.

## Public API

The facade keeps these entry points stable for callers:

- `readLocalDataHealthSnapshot(...)` / `buildLocalDataHealthSnapshot(...)` — full diagnostic snapshot
  (settings storage UI, `clientDiagnosticsReporter`).
- `readLocalDataCensusReport()` / `readLocalDataCensusReportForKv(...)` — census for the per-domain
  `migrationPlanner`s.
- `readLocalDataPromotionReadinessKvEntries()` — selected KV evidence for
  `localDataPromotionReadiness` / `localDataSourcePromotionPersistence`.

Extracted modules are imported by the facade and re-exported where they form part of the snapshot
type (e.g. `LocalAssetStorageHealth`), so no caller repoints when a concern moves.

## Verification

定向检查与测试范围统一见 [AGENTS.md](../../../AGENTS.md)。只验本次受影响的模块，除发布或大范围整合外，不默认运行全量测试或构建。

When a concern is extracted, the facade snapshot test proves output parity end-to-end and the
extracted module gets a focused responsibility test (e.g. `assetHealth.test.ts`). Do not replace
those with one fragile golden snapshot.
