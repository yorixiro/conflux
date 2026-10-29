import { describe, expect, it } from 'vitest';
import type { Persona } from '../../../types/domain';
import { countMemoryAtlasSources } from './heartstringMemoryModel';

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
});
