# Conflux repository instructions for Codex / coding agents

This is a personal, local-first Polaris fork targeting Android APK and Web/PWA from one shared React/TypeScript core.

## Read first
- docs/CONFLUX_ARCHITECTURE.md
- docs/CONFLUX_MIGRATION_MATRIX.md
- docs/CONFLUX_CODEX_HANDOFF.md
- docs/open-source/architecture-overview.md
- docs/handbook/DATA_AND_STORAGE.md
- package.json and capacitor.config.ts

## Hard rules
- Use the existing Polaris domain owners: chat, group, persona, collection, runtime, tool-protocol, request, and LocalData. One canonical chat engine, one context compiler, one tool ledger and one data source.
- Preserve Polaris visual style and responsive shell; port useful InternalBeyond functionality, NOT its iOS-like home/lock/wallet/skins. This product is Conflux; don't call it Nightward.
- Keep the business implementation shared between Android and Web/PWA. Platform-dependent storage, secure credentials, permissions, background work, push and media go through explicit adapters.
- Never edit the original InternalBeyond, huaxin or EH-UI repositories as part of this migration.
- Do not add unreviewed old-storage fallbacks or startup auto-migration. Import external backups through staging, validation, preview, user confirmation, readback and rollback.
- Never embed API keys or tokens in browser bundles, UI state, logs or exports. Never send private journal content or local files to AI/Host without explicit scope consent.
- Do not claim Aru Host/iPhone protocol compatibility until verified against the published Host contract.
- Treat third-party license boundaries seriously (Polaris AGPL-3.0-only, IB-Mobile PolyForm Noncommercial, Aru Host Apache-2.0); review before copying source across them.
- Do not delete, overwrite or silently refactor existing user content. No duplicate implementation of memory, tool registry or local storage.
- Do not report fake passing builds. State exactly which commands ran and which platforms were tested.

## Work order
P0 baseline -> P1 shared platform/xAI -> P2 IB staged import/memory -> P3 journal/letters/calendar/coread -> P4 social/media -> P5 optional Aru Host -> P6 release/sync.
Implement one phase at a time in a small reviewable PR, with durable data/permission tests and a rollback path. Begin with P0 baseline only.

## Verification
Read package.json for current scripts; baseline includes npm ci, npm run verify, and (when Android SDK available) npm run android:build-debug. Browser installation and Android actual-device testing are distinct acceptance gates. Every PR must state verified, blocked and untested steps separately.
