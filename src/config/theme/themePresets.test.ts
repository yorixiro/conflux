import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeThemeCssForRuntime } from '../../engines/themeCssRuntime';
import { buildThemeFrameFromPresetId, DEFAULT_THEME_PRESET_ID, listStudioThemePresets } from './themePresets';

describe('themePresets', () => {
  it('offers the default plus both extracted Keke skins without surfacing legacy experiments', () => {
    const presets = listStudioThemePresets();
    expect(presets.map((preset) => preset.id)).toEqual([DEFAULT_THEME_PRESET_ID, 'keke-doodle', 'keke-pois']);
  });

  it.each([
    ['keke-doodle', 'doodle-lettering.svg', 'doodle-paper-cat.webp'],
    ['keke-pois', 'pois-background.jpg', 'pois-sticker-1.png']
  ])('keeps %s art and real-chat selectors after runtime CSS normalization', (id, background, sticker) => {
    const frame = buildThemeFrameFromPresetId(id);
    // Vitest stubs CSS imports (including ?raw); read the actual source to test the layer.
    const sharedCss = readFileSync(new URL('./keke-shared.css', import.meta.url), 'utf8');
    const variantCss = readFileSync(new URL(`./${id}.css`, import.meta.url), 'utf8');
    const runtimeCss = normalizeThemeCssForRuntime(`${sharedCss}\n${variantCss}`);
    expect(frame.activePresetId).toBe(id);
    expect(runtimeCss).toContain(background);
    expect(runtimeCss).toContain(sticker);
    expect(runtimeCss).toContain('.app-shell.chat .chat-box-shell');
    expect(runtimeCss).toContain('.app-shell.chat .msg-row');
  });
});
