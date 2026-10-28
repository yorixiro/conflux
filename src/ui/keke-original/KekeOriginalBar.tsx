import type { CSSProperties, ReactNode } from 'react';

const icon = (name: string, w: string, h?: string) => ({ '--u': `var(--pi-${name})`, '--w': w, ...(h ? { '--h': h } : {}) }) as CSSProperties;

export function KekeBarTapes() {
  return <>
    <i className="dd tape t1" /><i className="dd tape t2" />
    <i className="pp ptape p1" /><i className="pp ptape p2" />
  </>;
}

const DECO = '‧₊˚ ✲ ⊹ ๐·° ˚̥ ∗ ˚₊๑ ‧₊˚ ♡ ˚₊‧ ⊹ ✲ ·°๐ ˚̥ ∗ ₊˚๑ ☆ ';

export function KekeBarDeco() {
  return <div className="fam deco" aria-hidden="true"><span>{DECO}</span><span>{DECO}</span></div>;
}

type ModeKey = 's' | 'l' | 'b';
const MODE_ART: Record<ModeKey, { ic: CSSProperties; svg: ReactNode; fam: string }> = {
  s: {
    ic: icon('bubble', '15px'), fam: '˚₊',
    svg: <svg className="dd ico" viewBox="0 0 16 16"><path d="M2.8 4.6Q2.8 3 4.4 3h7.2q1.6 0 1.6 1.6v4.3q0 1.6-1.6 1.6H8.2l-3 2.6.4-2.6h-1.2q-1.6 0-1.6-1.6Z" /><path d="M5.6 6.8h4.8" /></svg>
  },
  l: {
    ic: icon('mail', '16px', '11px'), fam: '✲',
    svg: <svg className="dd ico" viewBox="0 0 16 16"><path d="M2.4 4.4h11.2v8.2H2.4Z" /><path d="m2.6 4.7 5.4 4.1 5.4-4.1" /></svg>
  },
  b: {
    ic: icon('cloud', '17px', '12px'), fam: '⊹',
    svg: <svg className="dd ico" viewBox="0 0 16 16"><path d="M5.2 2.2l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8ZM11.3 7l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6Z" /><circle cx="5" cy="12.2" r="1.1" /></svg>
  }
};

type ModeButtonProps = { k: ModeKey; word: string; label: string; hit?: boolean; disabled?: boolean; onClick: () => void };

/** One `.mode` chip with the prototype's exact markup; the label text is the only real-app difference. */
export function KekeModeButton({ k, word, label, hit, disabled, onClick }: ModeButtonProps) {
  const art = MODE_ART[k];
  return <button type="button" className={`mode${hit ? ' hit' : ''}`} data-k={k} disabled={disabled} onClick={onClick}>
    <i className="pp ic" style={art.ic} />{art.svg}<i>{word}</i>{label}<b className="fam">{art.fam}</b>
  </button>;
}

export function KekeFolderArt() {
  return <>
    <span className="pp fish"><i className="ic" style={icon('fish', '34px')} /><i className="ic fold" style={icon('folder', '19px', '16px')} /></span>
    <svg className="dd" width="22" height="20" viewBox="0 0 22 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M2.5 4.5Q2.5 3 4 3H8.2L10 5H18Q19.5 5 19.5 6.5V15Q19.5 17 18 17H4Q2.5 17 2.5 15.5Z" /><path d="M14.5 10.2L16.5 12.3 14.5 14.4 12.5 12.3Z" fill="currentColor" stroke="none" /></svg>
    <svg className="nd" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5c.5 4.4 2.6 6.6 7.5 7.5-4.9.9-7 3.1-7.5 7.5-.5-4.4-2.6-6.6-7.5-7.5 4.9-.9 7-3.1 7.5-7.5Z" /></svg>
  </>;
}

export function KekeSendArt() {
  return <>
    <span className="seal nd">K</span>
    <i className="pp ic" style={icon('heart', '34px')} />
    <svg className="dd heart" viewBox="0 0 20 20"><path d="M10 16.8C3.2 12.4 2.6 7.6 5.1 5.6s4.2-.4 4.9 1.4c.7-1.8 2.5-3.4 4.9-1.4s1.9 6.8-4.9 11.2Z" /><path d="M6.6 7.6q.6-.9 1.5-.8" strokeLinecap="round" /></svg>
  </>;
}

export function KekeFieldDecor() {
  return <>
    <i className="ln" />
    <span className="fam spk k1">✲</span><span className="fam spk k2">⊹</span><span className="fam spk k3">˚₊</span>
  </>;
}
