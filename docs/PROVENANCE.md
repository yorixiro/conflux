# Conflux code provenance

Conflux is an independently directed product. Its earlier codebase originated as modifications to [Aevella/polaris-local-first](https://github.com/Aevella/polaris-local-first). This note documents the technical origin and relevant obligations; it does **not** impose the original project's product vision, interface or branding on Conflux.

Inherited code remains subject to applicable AGPL-3.0-only terms, existing copyright/modification notices, and third-party licensing. See [LICENSE](../LICENSE). The origin of any additional third-party assets or copied code needs to be checked separately.

An independent GitHub repository can remove the fork relationship and old product branding. It does not retroactively turn inherited code into newly authored source or extinguish applicable license obligations.

Renaming internal code IDs, data keys, package names, icons or native app metadata is a separate compatibility step. The old project is retained as a temporary rollback reference during migration.

## Memory Galaxy tutorial visual layer (PR #8)

`src/ui/collection/heartstring/galaxyTemplateVisual.ts` adapts the visual layer from
[Memory Galaxy's downloadable template](https://chat.xiaoke.love/galaxy-tutorial/galaxy-template.html),
provided with the author's [AI customization guide](https://chat.xiaoke.love/galaxy-tutorial/).
The guide explicitly invites readers to give the template to an AI to customize it.
The retrieved page credits the author's collaboration with “小克”; it does not identify
an individual legal name or include a standalone open-source license/SPDX grant.
This attribution records that limited customization context, not an assertion that the
author granted general AGPL redistribution rights. Original rights remain with the author;
a public redistribution license remains unresolved before broader distribution.

Conflux retains the template's two-arm distribution, palette, particle shader, core
sprite/texture, orbit rings, meteors, camera and Bloom settings. Adaptations use the
installed Three.js 0.186.0, an owning React lifecycle, DPR/frame budgets, and Conflux's
real-memory adapter; no tutorial demo memories or fake “like” state are persisted.
