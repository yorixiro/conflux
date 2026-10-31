# Conflux: instructions for coding agents

Conflux is the user's independently directed local-first AI conversation and workspace product. Its product, UI and architecture decisions are owned by the Conflux project, not by a previous upstream design.

## Read first
- docs/UI_LAYOUT_SPEC.md
- docs/roadmap/CONFLUX_USABILITY_INTEGRATION.md (for usability/navigation work; check current status and pending PRs before starting)
- docs/CONFLUX_INDEPENDENCE_PLAN.md
- docs/handbook/DATA_AND_STORAGE.md
- docs/PROVENANCE.md
- package.json and capacitor.config.ts
- Read older docs only as technical/historical references; do not treat their Polaris-era visual or product preferences as current requirements.

## Product and interface
- Never restore upstream brand, UI styling, navigation conventions or arbitrary product rules merely because they existed in the inherited source.
- Prioritize the currently selected, user-provided theme/prototype. Preserve its real assets and CSS when adapting to the React DOM; never imitate instead of porting.
- Use the layout contract for meaningful sizing and device adaptation. Themes may have their own presentation variants; do not sacrifice touchability, keyboard avoidance or readable content.
- Fix root causes of broken UX (conversation/persona identity, routing, overlays, responsiveness), not cosmetic symptoms alone.
- Do not create new visual frameworks or duplicate components for small layout fixes; change only the relevant implementation.

## Architecture and technical independence
- New product direction is unconstrained by upstream architecture preferences. Audit inherited modules, replace poor abstractions incrementally, and maintain an explicit dependency/removal list.
- Current facts still matter: keep chat sessions, data ownership, context compilation, tool receipts and the existing LocalData boundaries working until a replacement is implemented and verified.
- Do not silently delete user data, reassign conversation/persona ownership or rename persistence keys. Migrations require a defined compatibility strategy and readback.
- Prefer one implementation for shared Android and Web/PWA features, with thin platform adapters.
- Do not change unrelated repositories, expose secrets, or send private data to external models without explicit scope.

## Independent repository and attribution
- Independent GitHub ownership and visual identity do not require a GitHub fork relationship. The eventual new repository starts from a verified Conflux snapshot, **not** an obsolete default main.
- Keep applicable original copyright, AGPL-3.0-only and third-party notices; see LICENSE and docs/PROVENANCE.md. These belong in technical/legal documentation, not in the product's branding or UI.
- Historical function names and filenames may stay temporarily while dependencies are unwound. Do not mass-rename storage keys, packages or APIs just to change the logo.

## Process and delivery
- Make small, reviewable changes. Keep current theme, user data, ACP and Android/PWA functionality intact.
- Check status and exact base commit before code edits. No force push/reset, branch deletion, or PR merge unless explicitly requested.
- For UI changes run relevant typecheck/build and focused tests, then provide mobile/tablet acceptance steps. For storage or request changes, run corresponding stronger verification.
- Never claim tests or real-device checks that did not occur. State commit SHA, changed files, and remaining blockers.
- At the end of every Work ticket, update the ticket's progress and the relevant roadmap entry with PR URL, Commit SHA, completed/unresolved scope, test results and actual Android validation status. A submitted PR is 'PR 待验收', not '已验收'. Ensure the progress update is visible on the shared development branch (or explicitly create a doc-only PR and report pending synchronization).
