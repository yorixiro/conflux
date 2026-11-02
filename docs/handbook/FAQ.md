# FAQ

## Is Polaris the live release source?

No. It is the source tree. A source fix here is not automatically a web
selfhost, Android APK, iOS/TestFlight, or App Store release.

## Is the repository open-source licensed?

Yes. The source license is AGPL-3.0-only; see the root `LICENSE` file.

## Why keep shims after moving persistence files?

The shims are import-stability doors inside this repository. They are not compatibility promises
for external API consumers and they do not preserve old storage behavior. New code should import
from the per-domain folder.

## Can old data still be read?

Only through explicit import, migration, census, health, or recovery boundaries. Ordinary startup
and ordinary saves should use current LocalData facts.

## Why are document bodies separate from collection and persona?

Collection and persona own directory/head facts. Long body content is a document-domain fact. This
keeps directory rows, body rows, and owner relationships independently testable.

## Does splitting CSS/theme files affect skinning?

Not by itself. Theme action descriptions, selector catalogs, CSS generation, preview transactions,
store persistence, and UI application are separate responsibilities. A split is safe when the
preview metadata and execution paths stay intact and the theme tests pass.

## Where should a new model tool be added?

First reuse an existing tool when possible. For a real new capability, connect model visibility,
parsing, execution, and visible results. Verify that the off switch blocks execution. The only
daily workflow is in [AGENTS.md](../../AGENTS.md).

## Where should a new visual component go?

Controllers and effects belong in `src/app/`. React presentation belongs in `src/ui/`. Styles
belong in `src/styles/` unless the local pattern already scopes them differently.

## Which test should I run?

Follow [AGENTS.md](../../AGENTS.md): use typecheck and a relevant focused test for TypeScript
changes; inspect the affected page for visual changes. Full tests, builds, and release checks
are reserved for changes that actually need them.
