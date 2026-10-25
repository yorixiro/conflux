# Sasshi booklet component

Upstream: https://github.com/qzz0518/sasshi

Source revision: `944b5e825ce53be4df5ab770afa86ba363dc63f7`

License: AGPL-3.0-only (same as Conflux).

The Archive album includes Sasshi's actual WebGL 3D renderer (`scene.ts`), physical sheet and ring mechanics (`physics.ts`, `sheet.ts`, `binder.ts`), lighting/materials, and its `BookView` host. The upstream `FlatBook` remains the fallback for unsupported WebGL devices. Conflux's React 18 uses a `forwardRef` wrapper; the host accepts the single Conflux `ContentSource` instead of Sasshi's example profile albums. To keep the offline PWA install small, cover text uses platform serif fonts through `../fonts/index.ts` in place of the standalone portfolio's multi-megabyte font bundles.

`content.ts` adapts Conflux's existing LocalData image cards to both render paths; owner scope and photo uploads remain in Conflux's canonical Collection domain.

The album is a view of existing collection image cards; it does not change or migrate existing saved data.
