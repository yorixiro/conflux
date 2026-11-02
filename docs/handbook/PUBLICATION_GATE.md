# Publication Gate

Polaris is licensed as public source. Its source license is AGPL-3.0-only, and this gate is
required before any public archive, public branch, or release claim.

## Source Gate

- `git status --short` is clean.
- `npm run publication:hygiene` passes.
- `npm run test:data-boundary` passes.
- `npm run verify` passes.
- `README.md`, `docs/README.md`, and this handbook describe current source, not stale plans.
- `docs/PROVENANCE.md` documents inherited code and unresolved third-party reuse conditions; historical storage proof remains accessible as reference, not an extra publication gate.
- Worker developer dependency audit is reviewed separately with `npm --prefix workers/polaris-api audit`; any Wrangler major upgrade is handled as its own toolchain pass.

## Data And Credential Gate

Check the working tree with the executable gate:

```bash
npm run publication:hygiene
```

It checks file classes, generated artifact patterns, credential-shaped text, and
repository-root Markdown allowlists.

## Architecture Gate

- Ordinary startup and ordinary saves do not depend on old recovery paths.
- Import/migration/recovery concepts are named and fenced.
- Tool changes close schema, prompt, parser, executor, UI evidence, replay, and tests.
- Platform behavior is fixed in shared `src/` unless a real native capability is involved.
- Public docs do not claim a channel has shipped unless that channel has proof.

## Channel Gate

Report readiness by channel:

- Source
- Web selfhost
- Android APK
- iOS/TestFlight
- App Store

Do not collapse source-green into shipped-green.

## License Gate

Confirm `LICENSE` exists, `package.json` declares `AGPL-3.0-only`, and docs keep
license status separate from release-channel status. Do not let package metadata
or README copy imply that unsupported release targets have shipped.
