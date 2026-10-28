import { useMemo, type CSSProperties } from 'react';
import { buildKekePaperSvg } from './kekePaper';

export const KEKE_APP_STYLE = {
  '--p': 0,
  '--kbun': 'url(/theme-assets/keke-original/36ffc12835.webp)',
  '--kcat': 'url(/theme-assets/keke-original/0f17f7606e.webp)'
} as CSSProperties;

/** Background layers exactly as the original prototype's chat `.app` builds them. */
export function KekeOriginalLayers() {
  const paper = useMemo(() => `url("data:image/svg+xml,${encodeURIComponent(buildKekePaperSvg())}")`, []);
  return <>
    <div className="layer kk-paper" style={{ '--pp': paper } as CSSProperties} aria-hidden="true" />
    <div className="layer bgi" aria-hidden="true" />
    <div className="layer veil" aria-hidden="true" />
    <div className="layer fog" aria-hidden="true"><i /><i /></div>
    <div className="layer petals" aria-hidden="true" />
    <div className="layer poem" aria-hidden="true" />
    <div className="layer grain" aria-hidden="true" />
    <div className="layer wipe" aria-hidden="true" />
  </>;
}
