/**
 * System-font adapter for Sasshi's 3D engine inside Conflux.
 * The original portfolio lazily loads thousands of CJK font slices. Conflux's
 * offline PWA precaches every generated asset, so use device fonts instead.
 * This changes only cover lettering, never materials, lighting or page physics.
 */
export type Role = 'serif' | 'sans' | 'hand';
export type HanLang = 'ja' | 'zh-Hans' | 'zh-Hant';
export type FontRun = { role: Role; weight: number; text: string; han: HanLang };

export function hanLangOf(text: string, lang?: string): HanLang {
  if (/[ぁ-ゖゝ-ゟァ-ヺー-ヿㇰ-ㇿｦ-ﾟ]/.test(text) || /^ja(?:-|$)/i.test(lang ?? '')) return 'ja';
  if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/i.test(lang ?? '')) return 'zh-Hant';
  return 'zh-Hans';
}

export function stack(role: Role, han: HanLang): string {
  if (role === 'serif') return han === 'ja'
    ? '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", Georgia, serif'
    : '"Songti SC", "Noto Serif CJK SC", "Noto Serif SC", "STSong", Georgia, serif';
  if (role === 'hand') return '"Kaiti SC", "STKaiti", "KaiTi", cursive';
  return '"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
}

export function canvasFont(role: Role, weight: number, px: number, han: HanLang, _o?: { latin?: boolean }): string {
  return `${weight} ${Math.round(px * 100) / 100}px ${stack(role, han)}`;
}

export const canvasFontLocal = canvasFont;

// Device fonts are already available; neither paints nor PWA updates need network downloads.
export function fontsLoadedFor(_runs: FontRun[]): boolean { return true; }
export function ensureFonts(_runs: FontRun[]): Promise<void> { return Promise.resolve(); }
