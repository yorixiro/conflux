import { useEffect, useMemo, useRef, useState } from 'react';
import { usePersonaStore } from '../../../stores/personaStore';
import { MemorySettingsTab, type MemoryEditorFocus } from '../../shell/persona/settings/MemorySettingsTab';
import { buildMemoryStars, countMemoryAtlasSources, MEMORY_STAR_META, resolveMemoryStarSelection, type MemoryStar, type MemoryStarKind } from './heartstringMemoryModel';
import { createMemoryGalaxyScene, memoryGalaxyBudget } from './memoryGalaxyScene';
import { Icon } from '../../Icon';
import type { MemoryView, MemoryViewNavigation } from './memoryViewNavigation';

type ViewProps = { navigation: MemoryViewNavigation; view: MemoryView };

function ReturnToHeartstring({ navigation }: Pick<ViewProps, 'navigation'>) {
  return <button type="button" className="memory-galaxy__back" autoFocus onClick={() => navigation.exit()}>‹ <span>返回心弦</span></button>;
}

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
  }, []);
  useEffect(() => { scene.current?.setStars(stars); }, [layout]);
  useEffect(() => { scene.current?.select(selected); }, [selected, layout]);
  useEffect(() => { scene.current?.setPaused(paused); }, [paused, layout]);
  useEffect(() => { scene.current?.reset(); }, [resetVersion]);
  return <div className="memory-galaxy__canvas" ref={host} />;
}

export function HeartstringMemoryAtlas({ navigation, view }: ViewProps) {
  const personas = usePersonaStore((state) => state.personas);
  const activeCollaboratorId = usePersonaStore((state) => state.activeCollaboratorId);
  const updateCollaborator = usePersonaStore((state) => state.updateCollaborator);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const persona = personas.find((item) => item.id === (chosenId ?? activeCollaboratorId)) ?? personas[0] ?? null;
  if (!persona) return <div className="memory-galaxy memory-galaxy__empty"><ReturnToHeartstring navigation={navigation} /><h3>记忆星河</h3><p>当前没有可管理的 AI 角色。请先在「对话」里创建角色。</p></div>;
  return <PersonaMemoryAtlas key={persona.id} navigation={navigation} view={view} persona={persona} personas={personas} onChoose={setChosenId} onUpdate={(patch) => updateCollaborator(persona.id, patch)} />;
}

type Persona = ReturnType<typeof usePersonaStore.getState>['personas'][number];
type Update = Parameters<ReturnType<typeof usePersonaStore.getState>['updateCollaborator']>[1];

function PersonaMemoryAtlas({ persona, personas, onChoose, onUpdate, navigation, view }: ViewProps & {
  persona: Persona; personas: Persona[]; onChoose: (id: string) => void; onUpdate: (patch: Update) => void;
}) {
  const stars = useMemo(() => buildMemoryStars(persona), [persona.id, persona.name, persona.memory]);
  const counts = countMemoryAtlasSources(persona.memory);
  const [selection, setSelection] = useState<MemoryStar | null>(null);
  const [kind, setKind] = useState<MemoryStarKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [focusTarget, setFocusTarget] = useState<MemoryEditorFocus | null>(null);
  const directoryOpen = view === 'directory';
  const editorOpen = view === 'editor';
  const [pageSize, setPageSize] = useState(240);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (skyRef.current) skyRef.current.inert = editorOpen;
    const target = editorOpen ? '.memory-galaxy__management header button'
      : directoryOpen ? '.memory-galaxy__directory button' : '.memory-galaxy__back';
    wrapperRef.current?.querySelector<HTMLElement>(target)?.focus({ preventScroll: true });
  }, [view]);
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
  const selected = resolveMemoryStarSelection(visibleStars, selection);
  useEffect(() => {
    if (selection && !selected) setSelection(null);
  }, [selection, selected]);
  function select(star: MemoryStar) {
    setSelection(star);
    if (directoryOpen) navigation.back();
  }
  function openEditor() {
    if (!selected || selected.kind === 'persona') return;
    const target: MemoryEditorFocus = selected.kind === 'entry'
      ? { personaId: persona.id, kind: 'entry', index: selected.originalIndex!, expectedText: selected.content }
      : { personaId: persona.id, kind: selected.kind, id: selected.recordId! };
    setFocusTarget(target);
    navigation.open('editor');
  }
  return (
    <div className="heartstring-memory memory-galaxy" ref={wrapperRef} data-memory-count={stars.length - 1}>
      <div className="memory-galaxy__sky" ref={skyRef} aria-hidden={editorOpen || undefined}>
      <div className="memory-galaxy__stage">
        {!failed && <MemoryGalaxy stars={visibleStars} selected={selected?.id ?? null} paused={paused || editorOpen} resetVersion={resetVersion} onSelect={select} onFailure={() => setFailed(true)} />}
        <div className="memory-galaxy__masthead"><h4>Memory</h4><span>A constellation of memories</span><p>{persona.name} · {stars.length - 1} 颗记忆星</p></div>
      </div>
      <header className="memory-galaxy__topbar">
        <ReturnToHeartstring navigation={navigation} />
        <label className="memory-galaxy__persona"><select aria-label="查看 AI" value={persona.id} onChange={(event) => onChoose(event.target.value)}>{personas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </header>
      <div className="memory-galaxy__dock">
        {!directoryOpen && selected && <div className="memory-galaxy__reader"><MemoryReadingCard key={selected.id} star={selected} onClose={() => setSelection(null)} onEdit={openEditor} /></div>}
        {directoryOpen && <section id="memory-star-directory" className="memory-galaxy__directory" aria-label="记忆星点目录">
          <div className="memory-galaxy__panel-heading"><h3>星点目录</h3><button type="button" onClick={() => navigation.back()} aria-label="收起星点目录"><Icon name="x" size={18} /></button></div>
          <label>查找记忆<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setSelection(null); }} placeholder="查找当前已加载的文字" /></label>
          <p>{filtered.length} 条匹配记忆{pages > 1 ? `，当前星域显示 ${pageStars.length} 条` : ''}</p>
          <div className="memory-galaxy__list">{pageStars.map((star) => <button key={star.id} type="button" aria-pressed={selected?.id === star.id} onClick={() => select(star)}><span style={{ color: MEMORY_STAR_META[star.kind].color }}>✦</span><span><small>{MEMORY_STAR_META[star.kind].label}</small>{star.title}</span></button>)}</div>
          {!filtered.length && <p>还没有匹配的记忆，可以在记忆库中添加。</p>}
          {pages > 1 && <div className="memory-galaxy__pagination"><button type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelection(null); }}>上一片星域</button><span>{currentPage + 1} / {pages}</span><button type="button" disabled={currentPage + 1 === pages} onClick={() => { setPage(currentPage + 1); setSelection(null); }}>下一片星域</button></div>}
          <p>归属连线仅表示当前角色。向量索引：{counts.indexed} 个片段，不计作记忆。</p>
        </section>}
        {!selected && !directoryOpen && <p className="memory-galaxy__hint">{failed ? '星空暂不可用，可从星点目录阅读与编辑记忆' : stars.length === 1 ? '尚未保存记忆，星光静候于此' : '拖动旋转 · 双指缩放 · 点亮记忆'}</p>}
        <div className="memory-galaxy__navigation">
          <div className="memory-galaxy__legend" aria-label="按记忆类型筛选">{(['all', 'entry', 'doc', 'summary'] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setPage(0); setSelection(null); navigation.open('directory'); }}><i style={{ background: value === 'all' ? '#e9cfef' : MEMORY_STAR_META[value].color }} />{value === 'all' ? '全部' : MEMORY_STAR_META[value].label} <span>{value === 'all' ? stars.length - 1 : value === 'entry' ? counts.entries : value === 'doc' ? counts.docs : counts.summaries}</span></button>)}</div>
        </div>
        <div className="memory-galaxy__tools">
          <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} disabled={failed}>{paused ? '继续流转' : '暂停流转'}</button>
          <button type="button" onClick={() => setResetVersion((value) => value + 1)} disabled={failed}>重置视角</button>
          <button type="button" aria-expanded={directoryOpen} aria-controls="memory-star-directory" onClick={() => directoryOpen ? navigation.back() : navigation.open('directory')}>星点目录</button>
          <button type="button" onClick={() => { setFocusTarget(null); navigation.open('editor'); }}>记忆库</button>
        </div>
      </div>
      </div>
      {editorOpen && <section className="memory-galaxy__management heartstring-memory__editor" aria-label="记忆管理">
        <header className="memory-galaxy__panel-heading"><button type="button" onClick={() => navigation.back()}>‹ 返回星河</button><h3>{persona.name} 的记忆库</h3></header>
        <div className="memory-galaxy__management-content"><MemorySettingsTab activeCollaboratorId={persona.id} activePersona={persona} focusTarget={focusTarget} onUpdatePersona={onUpdate} /></div>
      </section>}
    </div>
  );
}

export function MemoryReadingCard({ star, onClose, onEdit }: { star: MemoryStar; onClose: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const long = star.content.length > 240;
  const date = star.updatedAt && Number.isFinite(star.updatedAt) && star.updatedAt > 0 ? new Date(star.updatedAt).toLocaleDateString('zh-CN') : null;
  return <section className="memory-galaxy__reading" aria-label="选中的记忆">
    <div className="memory-galaxy__reading-heading"><span className="memory-galaxy__reading-star" style={{ color: MEMORY_STAR_META[star.kind].color }} aria-hidden="true">✦</span><h4>{star.title}</h4><button type="button" aria-label="关闭记忆详情" onClick={onClose}><Icon name="x" size={18} /></button></div>
    <div className="memory-galaxy__reading-meta"><span>{MEMORY_STAR_META[star.kind].label}</span>{date && <time dateTime={new Date(star.updatedAt!).toISOString()}>更新于 {date}</time>}<span>{star.source}</span></div>
    <p className="memory-galaxy__body">{star.content ? (long && !expanded ? `${star.content.slice(0, 240)}…` : star.content) : '此条记录还没有正文。'}</p>
    {!star.bodyLoaded && <p className="memory-galaxy__notice">当前显示资料摘要，正文尚未加载；编辑时读取完整资料。</p>}
    {star.kind === 'summary' && <p className="memory-galaxy__reading-source">登记来源：{star.sourceConversationIds.length} 个对话 / {star.sourceMessageIds.length} 条消息。来源记录未在图中展开。</p>}
    <div className="memory-galaxy__reading-actions">{star.kind !== 'persona' && <button type="button" aria-label="编辑这条记忆" onClick={onEdit}><Icon name="edit" size={18} /><span>编辑</span></button>}{long && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起正文' : '展开完整记忆'}</button>}<button type="button" onClick={onClose}>返回银河</button></div>
  </section>;
}
