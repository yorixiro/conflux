# Keke theme port: handoff

Branch: `feat/keke-original-theme-port` (cut from `fe9d152`, ACP merge/revert history is NOT on it).
Scope: port the user's 10/27 prototype `克克 ˚.ₒ (6).html` (sticker + polka-dot skins) into the real chat UI. The home page is out of scope (user said skip it).

## Rules the user keeps repeating
- Use the prototype's own code/CSS, never an imitation. Do not follow the old GPT-written Keke rules; delete them when they get in the way.
- Read the screenshot yourself: `ls -t /sdcard/DCIM/Screenshots | head`, then read the newest file. Do not ask the user to resend.
- "Left drawer" = the profile tab, "right drawer" = the library tab/quick settings; both drawers must be the same size and the same on phone and tablet. Current width: `min(388px, 100vw - 18px)` (same as the quick-settings drawer, which must not be changed).
- Drawer content must never pan sideways.
- Do not touch ACP (`conflux-acp`, `devin-acp-*`, `keke-before-acp.patch`). Do not merge/reset/rebase.

## Where things live (all under `src/ui/keke-original/` unless noted)
- `original-*.css`: CSS extracted verbatim from the prototype (`tools/extract-keke-original-css.py`); assets in `public/theme-assets/keke-original/`, map in `assets.ts`.
- `adapter.css`: the only hand-written CSS. Retargets prototype selectors at the real DOM (composer textarea, input pill, full-width dock/stage, drawer paper + torn edge, library-tab skin, bubble corner radii). Beats prototype specificity with `:root #chat ...` where needed.
- `kekeRuntime.ts`: the prototype's last script, ported nearly verbatim (`// @ts-nocheck`):
  - `mountKekeSide(sd)`: drawer decorations, calendar heat map, particle pile, sway/jelly, todo note. Called from `KekeOriginalSide.tsx`.
  - `mountKekeHeader(hd, app, hav)`: header garland, scroll charm, scroll progress bar. Called from `src/ui/shell/AppTopbar.tsx`.
  - `mountKekeWall(app)`, `mountKekeAtmos()` (petals/pixel stars/poem lines), `mountKekeSendFx()` (stamp + burst), `mountKekeBubbles()` (position classes, group-end sketch/sticker). Wired in `ChatWorld.tsx` and `KekeOriginalLayers.tsx`.
- `KekeOriginalSide.tsx`: profile drawer markup from the prototype `#side`, wired to the real persona and theme switch (with the 520 ms page-swap transition). Used by `src/ui/app-shell/DesktopAppSidebar.tsx`.
- `KekeOriginalBar.tsx` / `KekeOriginalLayers.tsx`: input bar and background layers.
- `src/ui/app-shell/MobileAppShellFrame.tsx`: left-edge swipe opens the drawer, left swipe closes it.
- `src/ui/app-shell/KekeOriginalChrome.css`: styling for the real top bar (not prototype markup).
- `src/config/theme/keke-{shared,doodle,pois}.css`: remaining old rules for real bubbles/composer/chat-flow. Candidates for deletion once visually checked against the prototype.

## Not done / known gaps
- Nothing here was verified in a browser by the agent (no browser or jsdom in this environment). Everything was checked with `tsc --noEmit`, `vite build`, and unit tests in `src/ui/app-shell` and `src/config/theme`. The user checks on a tablet/phone PWA and sends screenshots.
- Message extras not ported: read receipt, "typing" three dots, per-character reveal of new replies, day separator, group spacing (margin) from the prototype. Bubble radii and group-end decorations are ported.
- Prototype message long-press menu/toast/edit (script2) not ported; the real app has its own message actions.
- Calendar heat map uses the prototype's generated sample data in `localStorage` key `kk-chatcnt`, not real chat counts. Real per-day counts need a new per-day statistic; `window.kkCnt()` exists but nothing calls it.
- Unreferenced assets in `public/theme-assets/keke/` (e.g. `pois-sticker-*.png`, `doodle-hanger.webp`, `pois-hanger.webp`) can be deleted together with their references in `src/config/theme/themePresets.test.ts`.
- Drawer closes without a slide-out animation (native `<dialog>`).
- The gyro tilt of the calendar was calmed (dead zone 0.2, max 4 deg); tune `dz` and `tgt=-sx*4` in `mountKekeSide` if still too lively.

## Verify
```
npx tsc --noEmit
npx vitest run src/config/theme src/ui/app-shell
npx vite build
```
Dev server for the user is already running; they refresh the PWA.
