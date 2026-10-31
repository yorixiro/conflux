import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { recordThemeSync } from '../app/developer/runtime-performance/runtimePerformanceDebug';
import { normalizeThemeCssForRuntime } from '../engines/themeCssRuntime';
import { buildThemeBlankBaseCss } from '../engines/themeBlankBaseCss';
import { resolveThemeAssetUrls } from './themeAssetCss';
import { buildThemeDomSnapshot, shouldAnimateThemeTransition, type ThemeDomSnapshot } from './themeDomSteadyState';
import { hasCreativeBackgroundOverride } from './themeBackgroundOverride';
import { CHAT_THEME_PALETTE_SELECTOR, reconcileChatThemeVariables } from './chatThemePalette';
import type { ThemeState, ThemeVariables, World } from '../types/domain';

const THEME_TRANSITION_ENTER_MS = 96;
const THEME_TRANSITION_EXIT_MS = 140;
const STYLE_LAYER_ORDER = ['blank-base', 'preset', 'custom', 'generated', 'protected'] as const;
const THEME_PROTECTED_SURFACE_CSS = `
.persona-builder-sheet {
  --builder-space-void: #08091a !important;
  --builder-space-deep: #0c0e24 !important;
  --builder-space-surface: rgba(18, 21, 46, 0.72) !important;
  --builder-space-surface-elevated: rgba(24, 28, 58, 0.68) !important;
  --builder-gold-bright: #d3ad66 !important;
  --builder-gold: #b59154 !important;
  --builder-gold-muted: rgba(184, 151, 95, 0.64) !important;
  --builder-violet-bright: #a78bda !important;
  --builder-violet-muted: rgba(139, 111, 191, 0.48) !important;
  --builder-gradient-accent: linear-gradient(135deg, #d3ad66, #a78bda) !important;
  --builder-border-subtle: rgba(167, 139, 218, 0.12) !important;
  --builder-border-hover: rgba(211, 173, 102, 0.32) !important;
  --builder-border-active: rgba(211, 173, 102, 0.48) !important;
  --builder-ink: rgba(255, 255, 255, 0.92) !important;
  --builder-muted: rgba(255, 255, 255, 0.32) !important;
  --builder-soft: rgba(255, 255, 255, 0.58) !important;
  background: #08091a !important;
  color: rgba(255, 255, 255, 0.92) !important;
  font-family: var(--font-ui) !important;
}

.persona-builder-sheet::before {
  opacity: 1 !important;
}

.persona-builder-sheet::after {
  opacity: 1 !important;
}

.persona-builder-sheet button,
.persona-builder-sheet input,
.persona-builder-sheet textarea,
.persona-builder-sheet select {
  font-family: inherit !important;
}

.persona-builder-sheet .ps-topbar-title,
.persona-builder-sheet .ps-topbar-sub,
.persona-builder-sheet .ps-topbar-close,
.persona-builder-sheet .pb-header-label,
.persona-builder-sheet .pb-kicker,
.persona-builder-sheet .pb-preview-kicker,
.persona-builder-sheet .pb-bridge-kicker,
.persona-builder-sheet .pb-hero h3,
.persona-builder-sheet .pb-hero p,
.persona-builder-sheet .pb-flow-nav button,
.persona-builder-sheet .pb-flow-nav span,
.persona-builder-sheet .pb-flow-nav small,
.persona-builder-sheet .pb-block-head strong,
.persona-builder-sheet .pb-block-head span,
.persona-builder-sheet .pb-direction-card,
.persona-builder-sheet .pb-direction-card span,
.persona-builder-sheet .pb-direction-card small,
.persona-builder-sheet .pb-choice-card,
.persona-builder-sheet .pb-choice-card strong,
.persona-builder-sheet .pb-choice-card span,
.persona-builder-sheet .pb-starter-card,
.persona-builder-sheet .pb-starter-card strong,
.persona-builder-sheet .pb-starter-card span,
.persona-builder-sheet .pb-chip,
.persona-builder-sheet .pb-preset,
.persona-builder-sheet .pb-preset-head strong,
.persona-builder-sheet .pb-preset-head span,
.persona-builder-sheet .pb-section-head strong,
.persona-builder-sheet .pb-section-head span,
.persona-builder-sheet .pb-step-actions .compact-btn,
.persona-builder-sheet .pb-preview-card p,
.persona-builder-sheet .pb-summary-section strong,
.persona-builder-sheet .pb-summary-section span,
.persona-builder-sheet .pb-result-head strong,
.persona-builder-sheet .pb-result-summary,
.persona-builder-sheet .pb-result-identity strong,
.persona-builder-sheet .ps-input,
.persona-builder-sheet .ps-textarea {
  font-family: var(--font-ui) !important;
}

.persona-builder-sheet .ps-topbar-title,
.persona-builder-sheet .ps-topbar-sub,
.persona-builder-sheet .pb-header-label,
.persona-builder-sheet .pb-kicker,
.persona-builder-sheet .pb-preview-kicker,
.persona-builder-sheet .pb-bridge-kicker,
.persona-builder-sheet .pb-block-head span,
.persona-builder-sheet .pb-choice-card span,
.persona-builder-sheet .pb-starter-card span,
.persona-builder-sheet .pb-chip,
.persona-builder-sheet .pb-preview-card p,
.persona-builder-sheet .pb-summary-section span,
.persona-builder-sheet .pb-result-summary,
.persona-builder-sheet .ps-input::placeholder,
.persona-builder-sheet .ps-textarea::placeholder {
  color: var(--builder-soft) !important;
}

.persona-builder-sheet .pb-hero h3,
.persona-builder-sheet .pb-hero p,
.persona-builder-sheet .pb-block-head strong,
.persona-builder-sheet .pb-choice-card strong,
.persona-builder-sheet .pb-starter-card strong,
.persona-builder-sheet .pb-preview-head span,
.persona-builder-sheet .pb-result-head strong,
.persona-builder-sheet .pb-summary-section strong,
.persona-builder-sheet .pb-result-identity strong,
.persona-builder-sheet .ps-input,
.persona-builder-sheet .ps-textarea {
  color: var(--builder-ink) !important;
}

.persona-builder-sheet .pb-direction-card,
.persona-builder-sheet .pb-choice-card,
.persona-builder-sheet .pb-starter-card,
.persona-builder-sheet .pb-preview-card,
.persona-builder-sheet .pb-summary-card,
.persona-builder-sheet .pb-deep-purpose,
.persona-builder-sheet .pb-deep-section,
.persona-builder-sheet .pb-bridge-card,
.persona-builder-sheet .pb-subtle-block,
.persona-builder-sheet .pb-prompt-dock,
.persona-builder-sheet .ps-input,
.persona-builder-sheet .ps-textarea {
  background: var(--builder-space-surface) !important;
  border-color: var(--builder-border-subtle) !important;
}

.persona-builder-sheet .pb-direction-card.active,
.persona-builder-sheet .pb-choice-card.active,
.persona-builder-sheet .pb-starter-card.active,
.persona-builder-sheet .pb-chip.active,
.persona-builder-sheet .pb-summary-section.ready {
  border-color: var(--builder-border-active) !important;
  color: var(--builder-ink) !important;
}
`;

export type ThemeTransitionPhase = 'enter' | 'exit' | null;

function layerIndex(layer: string) {
  const index = STYLE_LAYER_ORDER.indexOf(layer as (typeof STYLE_LAYER_ORDER)[number]);
  return index === -1 ? STYLE_LAYER_ORDER.length : index;
}

function ensureStyleTagOrder(styleTag: HTMLStyleElement, layer: string) {
  const currentIndex = layerIndex(layer);
  const nextSibling = Array.from(document.head.querySelectorAll<HTMLStyleElement>('style[data-polaris]'))
    .find((candidate) => candidate !== styleTag && layerIndex(candidate.dataset.polaris ?? '') > currentIndex);

  if (nextSibling && styleTag.nextSibling !== nextSibling) {
    document.head.insertBefore(styleTag, nextSibling);
    return;
  }

  if (!nextSibling && document.head.lastElementChild !== styleTag) {
    document.head.appendChild(styleTag);
  }
}

function syncStyleTag(layer: string, cssText: string) {
  if (typeof document === 'undefined') return;
  const selector = `style[data-polaris="${layer}"]`;
  const existing = document.head.querySelector<HTMLStyleElement>(selector);
  const styleTag = existing ?? (() => {
    const next = document.createElement('style');
    next.setAttribute('data-polaris', layer);
    return next;
  })();
  ensureStyleTagOrder(styleTag, layer);
  const runtimeCss = normalizeThemeCssForRuntime(cssText);
  const nextCss = runtimeCss.trim() ? runtimeCss : '';
  if (styleTag.textContent !== nextCss) {
    styleTag.textContent = nextCss;
  }
}

function syncThemeVariables(nextVariables: ThemeVariables, prevVariables: ThemeVariables) {
  if (typeof document === 'undefined') return;
  // The chat palette must not change :root: that also colors Home and Settings.
  // CSSOM parses CSS values safely, including user-defined gradients and URLs.
  let paletteStyle = document.head.querySelector<HTMLStyleElement>('style[data-conflux-chat-palette]');
  if (!paletteStyle) {
    paletteStyle = document.createElement('style');
    paletteStyle.setAttribute('data-conflux-chat-palette', '');
    paletteStyle.textContent = `${CHAT_THEME_PALETTE_SELECTOR} {}`;
    document.head.appendChild(paletteStyle);
  }
  const rule = paletteStyle.sheet?.cssRules.item(0);
  if (!rule || !('style' in rule)) return;
  reconcileChatThemeVariables(
    nextVariables,
    prevVariables,
    (rule as CSSStyleRule).style,
    document.documentElement.style
  );
}

function countVariableChanges(nextVariables: ThemeVariables, prevVariables: ThemeVariables) {
  const keys = new Set([...Object.keys(nextVariables), ...Object.keys(prevVariables)]);
  let changed = 0;
  keys.forEach((key) => {
    if (nextVariables[key] !== prevVariables[key]) {
      changed += 1;
    }
  });
  return changed;
}

function resolveRewrittenLayers(previous: ThemeDomSnapshot | null, next: ThemeDomSnapshot) {
  if (!previous) {
    return ['preset', 'custom', 'generated'] as Array<'preset' | 'custom' | 'generated'>;
  }

  const rewrittenLayers: Array<'preset' | 'custom' | 'generated'> = [];
  if (previous.presetCss !== next.presetCss) rewrittenLayers.push('preset');
  if (previous.customCss !== next.customCss) rewrittenLayers.push('custom');
  if (previous.generatedCss !== next.generatedCss) rewrittenLayers.push('generated');
  return rewrittenLayers;
}

function resolveThemeSyncReasons(previous: ThemeDomSnapshot | null, next: ThemeDomSnapshot, varsChanged: number) {
  if (!previous) return ['initial'];

  const reasons: string[] = [];
  if (previous.activePresetId !== next.activePresetId) reasons.push('preset-id');
  if (varsChanged > 0) reasons.push('variables');
  if (previous.presetVisualFingerprint !== next.presetVisualFingerprint) reasons.push('preset-css');
  if (previous.customVisualFingerprint !== next.customVisualFingerprint) reasons.push('custom-css');
  if (previous.generatedVisualFingerprint !== next.generatedVisualFingerprint) reasons.push('generated-css');
  return reasons;
}

function applyThemeSnapshot(snapshot: ThemeDomSnapshot, prevVarsRef: { current: Record<string, string> }) {
  syncThemeVariables(snapshot.cssVariables, prevVarsRef.current);
  prevVarsRef.current = snapshot.cssVariables;
  syncStyleTag('preset', snapshot.presetCss);
  syncStyleTag('custom', snapshot.customCss);
  syncStyleTag('generated', snapshot.generatedCss);
}

async function resolveThemeSnapshotAssets(snapshot: ThemeDomSnapshot): Promise<ThemeDomSnapshot> {
  const [presetCss, customCss, generatedCss] = await Promise.all([
    resolveThemeAssetUrls(snapshot.presetCss),
    resolveThemeAssetUrls(snapshot.customCss),
    resolveThemeAssetUrls(snapshot.generatedCss)
  ]);
  if (
    presetCss === snapshot.presetCss
    && customCss === snapshot.customCss
    && generatedCss === snapshot.generatedCss
  ) {
    return snapshot;
  }
  return {
    ...snapshot,
    presetCss,
    customCss,
    generatedCss
  };
}

function recordAppliedThemeSnapshot({
  previousSnapshot,
  domSnapshot,
  animated,
  prevVarsRef,
  lastSyncAtRef
}: {
  previousSnapshot: ThemeDomSnapshot | null;
  domSnapshot: ThemeDomSnapshot;
  animated: boolean;
  prevVarsRef: { current: Record<string, string> };
  lastSyncAtRef: { current: number | null };
}) {
  const varsChanged = countVariableChanges(domSnapshot.cssVariables, prevVarsRef.current);
  const rewrittenLayers = resolveRewrittenLayers(previousSnapshot, domSnapshot);
  const reasons = resolveThemeSyncReasons(previousSnapshot, domSnapshot, varsChanged);
  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

  applyThemeSnapshot(domSnapshot, prevVarsRef);
  recordThemeSync({
    varsChanged,
    rewrittenLayers,
    animated,
    reasons,
    intervalMs: lastSyncAtRef.current == null ? null : now - lastSyncAtRef.current
  });
  lastSyncAtRef.current = now;
}

export function useThemeDomEffects(theme: ThemeState, activeWorld: World) {
  const prevVarsRef = useRef<Record<string, string>>({});
  const appliedSnapshotRef = useRef<ThemeDomSnapshot | null>(null);
  const lastSyncAtRef = useRef<number | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<ThemeTransitionPhase>(null);
  const domSnapshot = useMemo(
    () => buildThemeDomSnapshot(theme),
    [theme.activePresetId, theme.cssVariables, theme.presetCSS, theme.customCSS, theme.generatedCSS]
  );

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.polarisWorld = activeWorld;
    document.body.dataset.polarisWorld = activeWorld;
    if (hasCreativeBackgroundOverride(theme)) {
      document.body.dataset.polarisBackgroundOverride = 'true';
    } else {
      delete document.body.dataset.polarisBackgroundOverride;
    }
    if (theme.activePresetId) {
      document.body.dataset.polarisPreset = theme.activePresetId;
    } else {
      delete document.body.dataset.polarisPreset;
    }
    if (theme.activePresetId === 'keke-doodle' || theme.activePresetId === 'keke-pois') {
      document.documentElement.dataset.ct = theme.activePresetId === 'keke-pois' ? 'pois' : 'doodle';
      document.documentElement.dataset.cf = 'sticker';
    } else {
      delete document.documentElement.dataset.ct;
      delete document.documentElement.dataset.cf;
    }
    return () => {
      delete document.documentElement.dataset.ct;
      delete document.documentElement.dataset.cf;
      delete document.documentElement.dataset.polarisWorld;
      delete document.body.dataset.polarisWorld;
      delete document.body.dataset.polarisBackgroundOverride;
      delete document.body.dataset.polarisPreset;
    };
  }, [activeWorld, theme.activePresetId, theme.customCSS, theme.generatedCSS]);

  useLayoutEffect(() => {
    syncStyleTag('blank-base', buildThemeBlankBaseCss());
    syncStyleTag('protected', THEME_PROTECTED_SURFACE_CSS);
  }, []);

  useLayoutEffect(() => {
    const previousSnapshot = appliedSnapshotRef.current;
    if (previousSnapshot?.domSignature === domSnapshot.domSignature) {
      return;
    }

    const isInitial = previousSnapshot === null;
    const shouldAnimate = shouldAnimateThemeTransition(previousSnapshot, domSnapshot);

    let cancelled = false;
    if (isInitial || !shouldAnimate) {
      recordAppliedThemeSnapshot({
        previousSnapshot,
        domSnapshot,
        animated: shouldAnimate,
        prevVarsRef,
        lastSyncAtRef
      });
      appliedSnapshotRef.current = domSnapshot;
      setTransitionPhase(null);
      resolveThemeSnapshotAssets(domSnapshot).then((resolvedSnapshot) => {
        if (cancelled) return;
        if (resolvedSnapshot === domSnapshot) return;
        applyThemeSnapshot(resolvedSnapshot, prevVarsRef);
      });
      return () => {
        cancelled = true;
      };
    }

    let exitTimeoutId: number | null = null;
    let rafId: number | null = null;
    setTransitionPhase('enter');
    resolveThemeSnapshotAssets(domSnapshot).then((resolvedSnapshot) => {
      if (cancelled) return;
      rafId = requestAnimationFrame(() => {
        if (cancelled) return;
        recordAppliedThemeSnapshot({
          previousSnapshot,
          domSnapshot: resolvedSnapshot,
          animated: shouldAnimate,
          prevVarsRef,
          lastSyncAtRef
        });
        appliedSnapshotRef.current = domSnapshot;
        setTransitionPhase('exit');
      });
      exitTimeoutId = window.setTimeout(() => {
        setTransitionPhase(null);
      }, THEME_TRANSITION_ENTER_MS + THEME_TRANSITION_EXIT_MS);
    });

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      if (exitTimeoutId != null) window.clearTimeout(exitTimeoutId);
    };
  }, [domSnapshot]);

  return transitionPhase;
}
