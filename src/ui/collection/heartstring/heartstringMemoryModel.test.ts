import { describe, expect, it } from 'vitest';
import type { Persona } from '../../../types/domain';
import { buildMemoryStars, countMemoryAtlasSources, resolveMemoryStarSelection } from './heartstringMemoryModel';

function memory(patch: Partial<Persona['memory']> = {}): Persona['memory'] {
  return {
    inheritGlobal: true,
    crossConversationRecallEnabled: false,
    conversationSummaries: [],
    excludedGlobalIds: [],
    personalMemories: [],
    referenceDocs: [],
    ...patch
  };
}

describe('Heartstring memory source diagram', () => {
  it('counts stored entries, reference documents and conversation summaries without reading document bodies', () => {
    const actual = countMemoryAtlasSources(memory({
      personalMemories: ['喜欢弦乐', ' ', '重要的生日'],
      referenceDocs: [{ id:'doc', title:'资料', summary:'', content:'', contentLoaded:false, source:'user', updatedAt:0 }],
      conversationSummaries: [{ id:'summary', kind:'recent_topic', title:'讨论', content:'', sequence:1, sourceConversationIds:[], sourceMessageIds:[], sourceCharCount:0, generator:'manual', generatedAt:0, updatedAt:0 }],
      vectorIndex: { enabled:false, status:'idle', indexedChunkCount:2, totalChunkCount:3, lastIndexedAt:0, lastError:'' }
    }));
    expect(actual).toEqual({ entries:2, docs:1, summaries:1, indexed:2 });
  });

  it('shows zeros for an empty persona without triggering indexing', () => {
    expect(countMemoryAtlasSources(memory())).toEqual({ entries:0, docs:0, summaries:0, indexed:0 });
  });

  it('preserves duplicate entries and original indices without manufacturing vector entities', () => {
    const stars = buildMemoryStars({ id: 'p', name: '角色', memory: memory({ personalMemories: ['同一句', ' ', '同一句'], vectorIndex: { enabled: false, indexedChunkCount: 5000 } }) });
    expect(stars.map((star) => star.kind)).toEqual(['persona', 'entry', 'entry']);
    expect(stars.slice(1).map((star) => star.originalIndex)).toEqual([0, 2]);
    expect(new Set(stars.map((star) => star.id)).size).toBe(3);
    expect(stars.every((star) => star.position.every(Number.isFinite))).toBe(true);
  });

  it('invalidates a shifted/deleted string selection and a switched persona', () => {
    const persona = { id: 'p', name: '角色', memory: memory({ personalMemories: ['前一条', '后一条'] }) };
    const selected = buildMemoryStars(persona)[1];
    const afterDeletion = buildMemoryStars({ ...persona, memory: memory({ personalMemories: ['后一条'] }) });
    expect(resolveMemoryStarSelection(afterDeletion, selected)).toBeNull();
    expect(resolveMemoryStarSelection(buildMemoryStars({ ...persona, id: 'other' }), selected)).toBeNull();
    expect(resolveMemoryStarSelection(buildMemoryStars(persona), selected)?.content).toBe('前一条');
  });

  it('does not read unloaded document bodies or infer summary source edges', () => {
    const stars = buildMemoryStars({ id: 'p', name: '角色', memory: memory({
      referenceDocs: [{ id:'doc', title:'资料', summary:'可用摘要', get content(): string { throw new Error('must not read'); }, contentLoaded:false, source:'upload', updatedAt:0 }],
      conversationSummaries: [{ id:'summary', kind:'recent_topic', title:'讨论', content:'原文', sequence:1, sourceConversationIds:['missing'], sourceMessageIds:['unloaded'], sourceCharCount:0, generator:'manual', generatedAt:0, updatedAt:0 }]
    }) });
    expect(stars[1]).toMatchObject({ content:'可用摘要', bodyLoaded:false, recordId:'doc' });
    expect(stars[2]).toMatchObject({ content:'原文', sourceConversationIds:['missing'], sourceMessageIds:['unloaded'] });
    expect(stars).toHaveLength(3);
  });

  it('keeps only the role core for empty data and reads loaded body exactly', () => {
    expect(buildMemoryStars({ id:'p', name:'空', memory:memory() })).toHaveLength(1);
    expect(buildMemoryStars({ id:'p', name:'文档', memory:memory({ referenceDocs:[{ id:'doc', title:'资料', summary:'摘要', content:'完整正文', contentLoaded:true, source:'user', updatedAt:0 }] }) })[1].content).toBe('完整正文');
  });
});
