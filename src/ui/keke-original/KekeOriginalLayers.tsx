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
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><filter id="wob" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" /></filter></svg>
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
