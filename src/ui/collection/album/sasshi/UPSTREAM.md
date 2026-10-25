# Sasshi booklet component

Upstream: https://github.com/qzz0518/sasshi

Source revision: `944b5e825ce53be4df5ab770afa86ba363dc63f7`

License: AGPL-3.0-only (same as Conflux).

Copied and adapted upstream `src/book/FlatBook.tsx`, `CoverPreview.tsx`, `layout.ts`, `cover.ts`, `cover-style.ts`, `labels.ts`, and `book.css` for the Archive album. The 3D/physics renderer is not included: this integration uses Sasshi's real CSS/canvas fallback booklet, with Conflux LocalData supplying the images and ownership. `content.ts` is the Conflux adapter.

The album is a view of existing collection image cards; it does not change or migrate existing saved data.
