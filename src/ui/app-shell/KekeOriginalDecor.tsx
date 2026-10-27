import { useEffect, useRef } from 'react';

type SketchName = 'heart' | 'cloud' | 'cherry' | 'cat' | 'bunny' | 'note';

function KekeSketch({ name, size = 19 }: { name: SketchName; size?: number }) {
  return <svg className={`keke-original-sketch keke-original-sketch--${name}`} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    {name === 'heart' ? <path d="M10 17C3 12 2 7.5 5 5.5c2-1.3 4 0 5 2 1-2 3-3.3 5-2 3 2 2 6.5-5 11.5z" /> : null}
    {name === 'cloud' ? <path d="M5 15c-3 0-3.5-4 0-4.5C5 7 9 6 11 8.5c1.5-1.5 5-.5 4.5 3 3 .3 3 3.5.5 3.5z" /> : null}
    {name === 'cherry' ? <><path d="M6 10.5C7 6 10 3 12 2.5M14 12C13 7 12.5 4 12 2.5" fill="none" /><path d="M12 2.5c2-1 4 0 5 1.5-2 .5-4 .3-5-1.5z" /><circle cx="6" cy="14" r="3.4" /><circle cx="14" cy="15" r="3.2" /></> : null}
    {name === 'cat' ? <><path d="M3 8l1-5 4 2.5h4L16 3l1 5c1 4-1 9-7 9S2 12 3 8z" /><circle cx="7" cy="11" r=".9" /><circle cx="13" cy="11" r=".9" /><path d="M9.3 13.3h1.4" fill="none" /></> : null}
    {name === 'bunny' ? <><path d="M6.5 9C4.5 3.5 5 1.8 7 2.6 8.5 3.6 8.6 7 8.2 9M13.5 9c2-5.5 1.5-7.2-.5-6.4-1.5 1-1.6 4.4-1.2 6.4" /><ellipse cx="10" cy="13.3" rx="6" ry="4.8" /><circle cx="7.8" cy="12.6" r=".8" /><circle cx="12.2" cy="12.6" r=".8" /></> : null}
    {name === 'note' ? <><path d="M7 15V4.5l8-1.5V13" fill="none" /><circle cx="5.2" cy="15" r="2.2" /><circle cx="13.2" cy="13" r="2.2" /></> : null}
  </svg>;
}

const CHARM_ITEMS: Array<{ left: number; kind: 'icon' | 'glyph' | 'art' | 'label'; content: string; stringLength: number }> = [
  { left: 5, kind: 'icon', content: 'heart', stringLength: 12 },
  { left: 11, kind: 'icon', content: 'cloud', stringLength: 28 },
  { left: 18, kind: 'label', content: '(๑•ᴗ•๑)', stringLength: 4 },
  { left: 26, kind: 'icon', content: 'cherry', stringLength: 24 },
  { left: 31, kind: 'label', content: '(=^･ω･^=)', stringLength: 2 },
  { left: 40, kind: 'glyph', content: '✦', stringLength: 0 },
  { left: 46, kind: 'glyph', content: '♡', stringLength: 2 },
  { left: 52, kind: 'glyph', content: '˚₊', stringLength: 0 },
  { left: 58, kind: 'glyph', content: '⋆', stringLength: 2 },
  { left: 64, kind: 'glyph', content: '✧', stringLength: 0 },
  { left: 69, kind: 'icon', content: 'cat', stringLength: 4 },
  { left: 74, kind: 'art', content: 'charm', stringLength: 0 },
  { left: 83, kind: 'label', content: 'ʕ•ᴥ•ʔ', stringLength: 6 },
  { left: 89, kind: 'icon', content: 'bunny', stringLength: 28 },
  { left: 94, kind: 'icon', content: 'note', stringLength: 12 },
  { left: 98, kind: 'art', content: 'thumb', stringLength: 6 }
];

/** Original animated charm garland from Claude's title paper. */
export function KekeTopGarland({ pois }: { pois: boolean }) {
  return <div className={`keke-original-garland${pois ? ' pois' : ''}`} aria-hidden="true">
    <svg className="keke-garland-thread" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 0Q50 16 100 0" /></svg>
    <u className="keke-garland-pin" /><u className="keke-garland-pin right" />
    {CHARM_ITEMS.map((item, index) => {
      const top = Math.round(32 * (item.left / 100) * (1 - item.left / 100));
      const src = item.content === 'thumb'
        ? (pois ? '/theme-assets/keke/pois-scroll-thumb.webp' : '/theme-assets/keke/doodle-scroll-thumb.webp')
        : (pois ? '/theme-assets/keke/pois-charm.webp' : '/theme-assets/keke/doodle-charm.webp');
      return <i key={index} style={{ left: `${item.left}%`, top, animationDelay: `${-index * .9}s`, animationDuration: `${4.6 + (index * 37 % 29) / 10}s` }}>
        <span className="keke-garland-string" style={{ height: item.stringLength }} />
        {item.kind === 'art' ? <img src={src} alt="" style={{ height: item.content === 'thumb' ? 22 : 86 }} /> : item.kind === 'icon' ?
          <KekeSketch name={item.content as SketchName} /> :
          <b className={item.kind === 'label' ? 'keke-garland-label' : 'keke-garland-glyph'}>{item.content}</b>}
      </i>;
    })}
  </div>;
}

const WALL_SYMBOLS = [
  { x: 8, y: 26, size: 20, rotate: -14, symbol: 'heart' },
  { x: 88, y: 34, size: 22, rotate: 10, symbol: 'cloud' },
  { x: 14, y: 52, size: 18, rotate: 12, symbol: 'note' },
  { x: 82, y: 60, size: 20, rotate: -8, symbol: 'cherry' },
  { x: 6, y: 78, size: 22, rotate: 8, symbol: 'bunny' },
  { x: 90, y: 82, size: 18, rotate: -12, symbol: 'cat' },
  { x: 48, y: 70, size: 16, rotate: 16, symbol: 'heart' },
  { x: 44, y: 30, size: 16, rotate: -6, symbol: 'note' }
];

/** Decorative wall and animated scroll charm; the real Conflux timeline keeps its own state. */
export function KekeChatMotionLayers({ pois }: { pois: boolean }) {
  const trackRef = useRef<HTMLImageElement>(null);
  const thumbRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const flow = document.querySelector<HTMLElement>('.chat-flow');
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!flow || !track || !thumb) return;
    let hideTimer: number | undefined;
    const onScroll = () => {
      const distance = flow.scrollHeight - flow.clientHeight;
      if (distance < 60) return;
      const ratio = Math.min(1, Math.max(0, flow.scrollTop / distance));
      thumb.style.top = `${118 + ratio * 98}px`;
      thumb.style.rotate = `${ratio * 300}deg`;
      track.classList.add('visible');
      thumb.classList.add('visible');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => { track.classList.remove('visible'); thumb.classList.remove('visible'); }, 900);
    };
    flow.addEventListener('scroll', onScroll, { passive: true });
    return () => { flow.removeEventListener('scroll', onScroll); window.clearTimeout(hideTimer); };
  }, [pois]);

  return <div className="keke-original-chat-decor" aria-hidden="true">
    <div className="keke-original-wall">{WALL_SYMBOLS.map((item, index) => <span key={index} style={{ left: `${item.x}%`, top: `${item.y}%`, rotate: `${item.rotate}deg` }}><KekeSketch name={item.symbol as SketchName} size={item.size} /></span>)}</div>
    <img ref={trackRef} className="keke-original-scroll-track" alt="" src="/theme-assets/keke/doodle-scroll-track.webp" />
    <img ref={thumbRef} className="keke-original-scroll-thumb" alt="" src={pois ? '/theme-assets/keke/pois-scroll-thumb.webp' : '/theme-assets/keke/doodle-scroll-thumb.webp'} />
  </div>;
}
