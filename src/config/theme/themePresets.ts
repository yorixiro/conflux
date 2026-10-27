import type { ThemeFrame, ThemePreset } from '../../types/domain';
import { LEGACY_THEME_PRESET_ID_ALIASES, THEME_PRESETS } from './themePresetCatalog';
import { PURE_CANVAS_THEME_VARIABLES, normalizeThemeVariables } from './themePresetVariables';

export { THEME_PRESETS, PURE_CANVAS_THEME_VARIABLES };

export const DEFAULT_THEME_PRESET_ID = 'polaris-default';

function normalizePresetId(presetId: string | null | undefined) {
  if (!presetId) return null;
  return LEGACY_THEME_PRESET_ID_ALIASES[presetId] ?? presetId;
}

export function getThemePresetById(presetId: string | null | undefined): ThemePreset | null {
  const resolvedPresetId = normalizePresetId(presetId);
  if (!resolvedPresetId) return null;
  return THEME_PRESETS.find((preset) => preset.id === resolvedPresetId) ?? null;
}

export function listThemePresetIds() {
  return THEME_PRESETS.map((preset) => preset.id);
}

export function listStudioThemePresets() {
  // Keep legacy experimental presets hidden while exposing the two user-provided skins.
  return THEME_PRESETS.filter((preset) =>
    preset.id === DEFAULT_THEME_PRESET_ID || preset.id === 'keke-doodle' || preset.id === 'keke-pois'
  );
}

export function buildThemeFrameFromPresetId(presetId: string = DEFAULT_THEME_PRESET_ID): ThemeFrame {
  const preset = getThemePresetById(presetId) ?? THEME_PRESETS[0];
  return {
    activePresetId: preset.id,
    activeSavedSkinId: null,
    cssVariables: normalizeThemeVariables(preset.cssVariables),
    presetCSS: preset.css,
    customCSS: '',
    generatedCSS: '',
    recipe: preset.recipe ? { ...preset.recipe } : undefined
  };
}

export function buildCustomThemeFrame(): ThemeFrame {
  return {
    activePresetId: null,
    activeSavedSkinId: null,
    cssVariables: normalizeThemeVariables(PURE_CANVAS_THEME_VARIABLES),
    presetCSS: '',
    customCSS: '',
    generatedCSS: '',
    recipe: undefined
  };
}
