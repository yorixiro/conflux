import { useEffect, useMemo, useRef, useState } from 'react';
import { usePersonaStore } from '../../../stores/personaStore';
import { MemorySettingsTab, type MemoryEditorFocus } from '../../shell/persona/settings/MemorySettingsTab';
import { buildMemoryStars, countMemoryAtlasSources, MEMORY_STAR_META, resolveMemoryStarSelection, type MemoryStar, type MemoryStarKind } from './heartstringMemoryModel';
import { createMemoryGalaxyScene, memoryGalaxyBudget } from './memoryGalaxyScene';

type Scene = ReturnType<typeof createMemoryGalaxyScene>;

function MemoryGalaxy({ stars, selected, paused, resetVersion, onSelect, onFailure }: {
  stars: MemoryStar[]; selected: string | null; paused: boolean; resetVersion: number;
  onSelect: (star: MemoryStar) => void; onFailure: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const callbacks = useRef({ onSelect, onFailure, stars });
  callbacks.current = { onSelect, onFailure, stars };
  const layout = JSON.stringify(stars.map((star) => [star.id, star.kind, star.position]));
  useEffect(() => {
    if (!host.current) return;
    try {
      scene.current = createMemoryGalaxyScene(host.current, stars,
        (star) => {
          const current = callbacks.current.stars.find((item) => item.id === star.id);
          if (current) callbacks.current.onSelect(current);
        }, () => callbacks.current.onFailure());
    } catch { callbacks.current.onFailure(); }
    return () => { scene.current?.dispose(); scene.current = null; };
  }, [layout]);
  useEffect(() => { scene.current?.select(selected); }, [selected, layout]);
  useEffect(() => { scene.current?.setPaused(paused); }, [paused, layout]);
  useEffect(() => { scene.current?.reset(); }, [resetVersion]);
  return <div className="memory-galaxy__canvas" ref={host} />;
}

export function HeartstringMemoryAtlas() {
  const personas = usePersonaStore((state) => state.personas);
  const activeCollaboratorId = usePersonaStore((state) => state.activeCollaboratorId);
  const updateCollaborator = usePersonaStore((state) => state.updateCollaborator);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const persona = personas.find((item) => item.id === (chosenId ?? activeCollaboratorId)) ?? personas[0] ?? null;
  if (!persona) return <div className="heartstring-future"><h3>记忆图谱</h3><p>当前没有可管理的 AI 角色。请先在「对话」里创建角色。</p></div>;
  return <PersonaMemoryAtlas key={persona.id} persona={persona} personas={personas} onChoose={setChosenId} onUpdate={(patch) => updateCollaborator(persona.id, patch)} />;
}

type Persona = ReturnType<typeof usePersonaStore.getState>['personas'][number];
type Update = Parameters<ReturnType<typeof usePersonaStore.getState>['updateCollaborator']>[1];

function PersonaMemoryAtlas({ persona, personas, onChoose, onUpdate }: {
  persona: Persona; personas: Persona[]; onChoose: (id: string) => void; onUpdate: (patch: Update) => void;
}) {
  const stars = useMemo(() => buildMemoryStars(persona), [persona.id, persona.name, persona.memory]);
  const counts = countMemoryAtlasSources(persona.memory);
  const [selection, setSelection] = useState<MemoryStar | null>(null);
  const selected = resolveMemoryStarSelection(stars, selection);
  const [kind, setKind] = useState<MemoryStarKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [focusTarget, setFocusTarget] = useState<MemoryEditorFocus | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const [pageSize, setPageSize] = useState(240);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const resize = new ResizeObserver(() => setPageSize(memoryGalaxyBudget(element.clientWidth, devicePixelRatio, matchMedia('(pointer: coarse)').matches).nodes));
    resize.observe(element); return () => resize.disconnect();
  }, []);
  const filtered = useMemo(() => stars.slice(1).filter((star) =>
    (kind === 'all' || star.kind === kind) && (!query.trim() || `${star.title}\n${star.content}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [stars, kind, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const pageStars = useMemo(() => filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize), [filtered, currentPage, pageSize]);
  const visibleStars = useMemo(() => [stars[0], ...pageStars], [stars, pageStars]);
  function select(star: MemoryStar) {
    setSelection(star);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      detailRef.current?.focus({ preventScroll: true });
    });
  }
  function openEditor() {
    if (!selected || selected.kind === 'persona') return;
    const target: MemoryEditorFocus = selected.kind === 'entry'
      ? { personaId: persona.id, kind: 'entry', index: selected.originalIndex!, expectedText: selected.content }
      : { personaId: persona.id, kind: selected.kind, id: selected.recordId! };
    setFocusTarget(target);
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  return (
    <div className="heartstring-memory" ref={wrapperRef}>
      <header className="heartstring-memory__heading">
        <div><span className="heartstring-eyebrow">HEARTSTRING / MEMORY GALAXY</span><h3>记忆图谱</h3><p>点亮一颗星，读一段留在这里的记忆。</p></div>
        <label className="heartstring-memory__persona"><span>查看 AI</span><select value={persona.id} onChange={(event) => onChoose(event.target.value)}>{personas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </header>
      <div className="memory-galaxy" data-memory-count={stars.length - 1}>
        {!failed && <MemoryGalaxy stars={visibleStars} selected={selected?.id ?? null} paused={paused} resetVersion={resetVersion} onSelect={select} onFailure={() => { setFailed(true); setDirectoryOpen(true); }} />}
        <div className="memory-galaxy__masthead"><span>THE MEMORY ATLAS</span><h4>{persona.name}的记忆银河</h4><p>{stars.length - 1} 颗记忆星 · 每一颗都有归处</p></div>
        <div className="memory-galaxy__tools">
          <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} disabled={failed}>{paused ? '继续流转' : '暂停流转'}</button>
          <button type="button" onClick={() => setResetVersion((value) => value + 1)} disabled={failed}>重置视角</button>
          <button type="button" aria-expanded={directoryOpen} aria-controls="memory-star-directory" onClick={() => setDirectoryOpen(!directoryOpen)}>星点目录</button>
        </div>
        {failed ? <div className="memory-galaxy__empty" role="status">当前设备未能显示星系。<br />下方星点目录和记忆编辑器仍可使用。</div>
          : stars.length === 1 ? <div className="memory-galaxy__empty">星系静候第一颗记忆。<br /><span>在下方保存记忆后，它会在这里亮起。</span></div> : null}
        {selected && <aside className="memory-galaxy__detail" tabIndex={-1} ref={detailRef} aria-label="选中的记忆" onKeyDown={(event) => { if (event.key === 'Escape') setSelection(null); }}>
          <div className="memory-galaxy__detail-head"><span style={{ color: MEMORY_STAR_META[selected.kind].color }}>{MEMORY_STAR_META[selected.kind].label}</span><button type="button" onClick={() => setSelection(null)}>返回图谱</button></div>
          <h4>{selected.title}</h4><p className="memory-galaxy__body">{selected.content || '此条记录还没有正文。'}</p>
          {!selected.bodyLoaded && <p className="memory-galaxy__notice">当前显示资料摘要，正文尚未加载；打开编辑器后读取完整资料。</p>}
          <small>{selected.source}</small>
          {selected.kind === 'summary' && <small>登记来源：{selected.sourceConversationIds.length} 个对话 / {selected.sourceMessageIds.length} 条消息。来源记录未在图中展开。</small>}
          {selected.kind !== 'persona' && <button className="memory-galaxy__edit" type="button" onClick={openEditor}>在记忆库中编辑</button>}
        </aside>}
        <div className="memory-galaxy__caption"><span>拖动旋转 · 双指缩放 · 点按光环星点</span><span>光环是记忆，微光是星尘</span></div>
      </div>
      <div className="memory-galaxy__navigation">
        <div className="memory-galaxy__legend" aria-label="按记忆类型筛选">{(['all', 'entry', 'doc', 'summary'] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setPage(0); setSelection(null); }}><i style={{ background: value === 'all' ? '#e9cfef' : MEMORY_STAR_META[value].color }} />{value === 'all' ? '全部' : MEMORY_STAR_META[value].label} <span>{value === 'all' ? stars.length - 1 : value === 'entry' ? counts.entries : value === 'doc' ? counts.docs : counts.summaries}</span></button>)}</div>
        {pages > 1 && <div className="memory-galaxy__pagination"><button type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelection(null); }}>上一片星域</button><span>{currentPage + 1} / {pages}</span><button type="button" disabled={currentPage + 1 === pages} onClick={() => { setPage(currentPage + 1); setSelection(null); }}>下一片星域</button></div>}
      </div>
      {(directoryOpen || failed) && <section id="memory-star-directory" className="memory-galaxy__directory" aria-label="记忆星点目录"><label>查找记忆<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setSelection(null); }} placeholder="查找当前已加载的文字" /></label><p>{filtered.length} 条匹配记忆{pages > 1 ? `，当前星域显示 ${pageStars.length} 条` : ''}</p><div className="memory-galaxy__list">{pageStars.map((star) => <button key={star.id} type="button" aria-pressed={selected?.id === star.id} onClick={() => select(star)}><span style={{ color: MEMORY_STAR_META[star.kind].color }}>✦</span><span><small>{MEMORY_STAR_META[star.kind].label}</small>{star.title}</span></button>)}</div>{!filtered.length && <p>还没有匹配的记忆，可以在下方添加。</p>}</section>}
      <p className="heartstring-memory__disclaimer">选中星点的连线表示角色归属。向量索引：{counts.indexed} 个片段，仅为索引状态。</p>
      <div className="heartstring-memory__editor" ref={editorRef}><div className="memory-galaxy__editor-heading"><h4>管理 {persona.name} 的记忆</h4><button type="button" onClick={() => { setSelection(null); wrapperRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>回到星系</button></div><MemorySettingsTab activeCollaboratorId={persona.id} activePersona={persona} focusTarget={focusTarget} onUpdatePersona={onUpdate} /></div>
    </div>
  );
}
