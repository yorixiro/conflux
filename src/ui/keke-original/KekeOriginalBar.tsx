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

// Use the same flat, single-color Phosphor Fill icons across the Keke theme tabs.
// Source and MIT notice: src/ui/app-shell/PHOSPHOR_ICONS_LICENSE.txt
const TAB_SOLID: Record<string, ReactNode> = {
  chat: <path d="M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86Zm-16.25,1.47L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z" />,
  group: <path d="M64.12,147.8a4,4,0,0,1-4,4.2H16a8,8,0,0,1-7.8-6.17,8.35,8.35,0,0,1,1.62-6.93A67.79,67.79,0,0,1,37,117.51a40,40,0,1,1,66.46-35.8,3.94,3.94,0,0,1-2.27,4.18A64.08,64.08,0,0,0,64,144C64,145.28,64,146.54,64.12,147.8Zm182-8.91A67.76,67.76,0,0,0,219,117.51a40,40,0,1,0-66.46-35.8,3.94,3.94,0,0,0,2.27,4.18A64.08,64.08,0,0,1,192,144c0,1.28,0,2.54-.12,3.8a4,4,0,0,0,4,4.2H240a8,8,0,0,0,7.8-6.17A8.33,8.33,0,0,0,246.17,138.89Zm-89,43.18a48,48,0,1,0-58.37,0A72.13,72.13,0,0,0,65.07,212,8,8,0,0,0,72,224H184a8,8,0,0,0,6.93-12A72.15,72.15,0,0,0,157.19,182.07Z" />,
  home: <path d="M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z" />,
  archive: <path d="M208,24H72A32,32,0,0,0,40,56V224a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16H56a16,16,0,0,1,16-16H208a8,8,0,0,0,8-8V32A8,8,0,0,0,208,24Zm-24,96-25.61-19.2a4,4,0,0,0-4.8,0L128,120V40h56Z" />,
  workshop: <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM92.8,145.6a8,8,0,1,1-9.6,12.8l-32-24a8,8,0,0,1,0-12.8l32-24a8,8,0,0,1,9.6,12.8L69.33,128Zm58.89-71.4-32,112a8,8,0,1,1-15.38-4.4l32-112a8,8,0,0,1,15.38,4.4Zm53.11,60.2-32,24a8,8,0,0,1-9.6-12.8L186.67,128,163.2,110.4a8,8,0,1,1,9.6-12.8l32,24a8,8,0,0,1,0,12.8Z" />,
  settings: <path d="M32,80a8,8,0,0,1,8-8H77.17a28,28,0,0,1,53.66,0H216a8,8,0,0,1,0,16H130.83a28,28,0,0,1-53.66,0H40A8,8,0,0,1,32,80Zm184,88H194.83a28,28,0,0,0-53.66,0H40a8,8,0,0,0,0,16H141.17a28,28,0,0,0,53.66,0H216a8,8,0,0,0,0-16Z" />
};

/** Unified solid tabs for both the Keke doodle and pois theme. */
export function KekeTabArt({ id }: { id: string }) {
  return <svg className="keke-nav-solid" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true">{TAB_SOLID[id]}</svg>;
}
