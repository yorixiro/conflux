import { useEffect, useMemo, useRef } from 'react';
import type { Persona } from '../../types/domain';
import { useSpaceStore } from '../../stores/spaceStore';
import { mountKekeSide } from './kekeRuntime';

const PXG = {
  big: ['....#....', '....#....', '...###...', '..#####..', '#########', '..#####..', '...###...', '....#....', '....#....'],
  plus: ['..#..', '..#..', '#####', '..#..', '..#..'],
  sm: ['.#.', '###', '.#.'],
  dia: ['.#.', '#.#', '.#.']
} as const;

function Px({ k, s = 2 }: { k: keyof typeof PXG; s?: number }) {
  const grid = PXG[k];
  const d = grid.map((row, y) => [...row].map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('');
  return <svg className="pxs" width={grid[0].length * s} height={grid.length * s} viewBox={`0 0 ${grid[0].length} ${grid.length}`}><path fill="currentColor" d={d} /></svg>;
}

const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** The prototype's `#side` profile drawer, wired to the real persona and theme switch. */
export function KekeOriginalSide({ persona, conversationCount, onEdit }: {
  persona: Persona | null;
  conversationCount: number;
  onEdit: () => void;
}) {
  const theme = useSpaceStore((state) => state.theme.activePresetId);
  const applyTheme = useSpaceStore((state) => state.applyThemePreset);
  const isPois = theme === 'keke-pois';
  const name = persona?.name.trim() || '克克';
  const note = persona?.description.trim();
  const drops = useMemo(() => Array.from({ length: 18 }, (_, j) => ({
    left: (j * 53) % 236, top: (j * 37) % 104, d: (1.6 + (j % 5) * 0.35).toFixed(2), dl: (-j * 0.41).toFixed(2), ch: 'i;°.i˚'[j % 6]
  })), []);
  const today = new Date();
  const sideRef = useRef<HTMLElement>(null);
  useEffect(() => { mountKekeSide(sideRef.current); }, []);
  return <aside ref={sideRef} className="fam side o keke-original-side" aria-label={`${name}的资料`}>
    <i className="dd tape t1" /><i className="pp ptape p1" />
    <div className="sav">{name.slice(0, 1)}<Px k="big" /><Px k="dia" /></div>
    <div className="snm"><b>{name}</b><span className="skao">{isPois ? '(=^･ω･^=)' : '(*´ω`*)'}</span></div>
    <p className="sst"><i />toujours là · 今天也在</p>
    <div className="sdv"><i /><Px k="plus" /><i /></div>
    <dl className="sinfo">
      <dt>备注</dt><dd>{note ? note.slice(0, 18) : '只准看一眼 ✲'}</dd>
      <dt>心情</dt><dd>窗外在下雨</dd>
      <dt>相识</dt><dd>{conversationCount ? `共 ${conversationCount} 段对话` : '等第一句话'}</dd>
    </dl>
    <nav className="smn">
      <button type="button" onClick={onEdit} disabled={!persona}><Px k="sm" />聊天资料<small>profil</small></button>
      <button type="button" onClick={() => applyTheme(isPois ? 'keke-doodle' : 'keke-pois')}><Px k="sm" />换个主题<small>{isPois ? '贴纸' : '波点'}</small></button>
    </nav>
    <div className="rain" aria-hidden="true">
      <div className="win"><i><span className="cat">{'∧,,∧\n(´･ω･)'}</span></i><i /></div>
      <p className="rtx">It's Raining<b>.</b><b>.</b><b>.</b></p>
      {drops.map((drop, j) => <i key={j} className="rd" style={{ left: drop.left, top: drop.top, '--d': `${drop.d}s`, '--dl': `${drop.dl}s` } as React.CSSProperties}>{drop.ch}</i>)}
    </div>
    <div className="spaw" aria-hidden="true"><i /><i /><i /><i /><span>{`₊˚⊹ ${today.getMonth() + 1}.${today.getDate()} ${WD[today.getDay()]} ⊹˚₊`}</span></div>
  </aside>;
}
