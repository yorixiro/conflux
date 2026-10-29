import type { Persona } from '../../../types/domain';

export type MemoryAtlasCounts = {
  entries: number;
  docs: number;
  summaries: number;
  indexed: number;
};

/** Counts only the currently stored metadata; does not infer relationships or read unloaded document bodies. */
export function countMemoryAtlasSources(memory: Persona['memory']): MemoryAtlasCounts {
  return {
    entries: memory.personalMemories.filter((entry) => entry.trim().length > 0).length,
    docs: memory.referenceDocs.length,
    summaries: memory.conversationSummaries.length,
    indexed: Math.max(0, memory.vectorIndex?.indexedChunkCount ?? 0)
  };
}

export type MemoryStarKind = 'persona' | 'entry' | 'doc' | 'summary';
export type MemoryStar = {
  id: string;
  personaId: string;
  kind: MemoryStarKind;
  title: string;
  content: string;
  source: string;
  originalIndex?: number;
  recordId?: string;
  bodyLoaded: boolean;
  sourceConversationIds: string[];
  sourceMessageIds: string[];
  position: [number, number, number];
};
export const MEMORY_STAR_META = {
  persona: { label: '记忆归属', color: '#ffe3b1' },
  entry: { label: '记忆条目', color: '#ffa9d6' },
  doc: { label: '长期资料', color: '#acbaff' },
  summary: { label: '对话摘要', color: '#86e3e0' }
} as const;

/** View-local entry indices are never persisted or treated as stable memory IDs. */
export function buildMemoryStars(persona: Pick<Persona, 'id' | 'name' | 'memory'>): MemoryStar[] {
  const root: MemoryStar = {
    id: `${persona.id}:persona`, personaId: persona.id, kind: 'persona', title: persona.name,
    content: '星光汇聚于此。每一颗有光环的星，都是这个角色实际保存的记忆。',
    source: '当前角色', bodyLoaded: true, sourceConversationIds: [], sourceMessageIds: [], position: [0, 0, 0]
  };
  const stars: MemoryStar[] = [];
  persona.memory.personalMemories.forEach((content, originalIndex) => {
    if (!content.trim()) return;
    stars.push({ ...root, id: `${persona.id}:entry:${originalIndex}`, kind: 'entry',
      title: content.trim().slice(0, 48), content, source: '角色的长期记忆条目 · 暂无来源记录', originalIndex });
  });
  persona.memory.referenceDocs.forEach((doc) => {
    stars.push({ ...root, id: `${persona.id}:doc:${doc.id}`, kind: 'doc', recordId: doc.id,
      title: doc.title || '未命名资料', content: doc.contentLoaded ? doc.content : doc.summary,
      source: `资料来源：${({ user:'手动保存', collaborator:'角色资料', conversation:'对话', workspace:'工作区', upload:'上传文档' } as const)[doc.source]}`, bodyLoaded: doc.contentLoaded === true });
  });
  persona.memory.conversationSummaries.forEach((summary) => {
    stars.push({ ...root, id: `${persona.id}:summary:${summary.id}`, kind: 'summary', recordId: summary.id,
      title: summary.title || '未命名摘要', content: summary.content,
      source: summary.generator === 'manual' ? '手动维护的对话摘要' : '已保存的模型摘要',
      sourceConversationIds: summary.sourceConversationIds, sourceMessageIds: summary.sourceMessageIds });
  });
  stars.forEach((star, index) => {
    const arm = star.kind === 'entry' ? 0 : star.kind === 'doc' ? 1 : 2;
    const radius = 1.3 + 4.4 * Math.sqrt((index + .5) / Math.max(1, stars.length));
    const angle = arm * Math.PI * 2 / 3 + radius * .95 + index * 2.39996;
    star.position = [Math.cos(angle) * radius, Math.sin(index * 1.7) * .35, Math.sin(angle) * radius];
  });
  return [root, ...stars];
}

/** A shifted/deleted string entry must never silently select or edit its neighbour. */
export function resolveMemoryStarSelection(stars: MemoryStar[], previous: MemoryStar | null) {
  if (!previous) return null;
  const current = stars.find((star) => star.id === previous.id);
  if (!current || (current.kind === 'entry' && current.content !== previous.content)) return null;
  return current;
}
