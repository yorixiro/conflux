import { describe, expect, it } from 'vitest';
import { planOneMemoryRequestRecall } from './requestOneMemoryRecall';
import type { AssistantSemanticRecallContextCandidate } from './requestSemanticRecallPlan';

const candidate = (id: string, kind: AssistantSemanticRecallContextCandidate['kind'], score: number | null): AssistantSemanticRecallContextCandidate => ({
  id,
  kind,
  label: id,
  sourceConversationId: 'old-conversation',
  sourceMessageIds: [`message-${id}`],
  score,
  text: `${id} was a story we discussed before`
});

describe('one-memory Polaris request adapter', () => {
  it('selects one relevant vector memory while ignoring unconditional recent tails', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [
        candidate('recent', 'recent_tail', null),
        candidate('vector', 'vector_match', 0.9),
        candidate('lexical', 'matched_context', 0.88)
      ],
      recentContext: 'Tell me about that story',
      now: 1000
    });
    expect(result.semanticCandidates).toHaveLength(1);
    expect(result.semanticCandidates[0]?.id).toBe('vector');
    expect(result.plan.selected?.sourceRef).toBe('old-conversation:message-vector');
  });

  it('rejects low-similarity candidates without injecting a fallback', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [candidate('weak', 'vector_match', 0.2)],
      recentContext: 'A new unrelated topic',
      now: 1000
    });
    expect(result.semanticCandidates).toEqual([]);
    expect(result.plan.selected).toBeNull();
  });

  it('fuses two ranking lanes that refer to the same original message', async () => {
    const lexical = candidate('lexical-hit', 'matched_context', 0.9);
    const semantic = { ...candidate('vector-hit', 'vector_match', 0.95), sourceMessageIds: lexical.sourceMessageIds, text: lexical.text };
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [lexical, semantic],
      recentContext: 'Find an earlier story',
      now: 1000
    });
    expect(result.plan.selected?.lanes).toEqual(['lexical', 'semantic']);
    expect(result.semanticCandidates).toHaveLength(1);
  });

  it('routes an explicit worldbook hit through the same gate', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [],
      exact: [{ id: 'worldbook:moon', scopeId: 'persona-a', sourceRef: 'book:moon', text: 'The moon is an archive.', confidence: 1 }],
      recentContext: 'Where did the moon story come from?',
      now: 1000
    });
    expect(result.semanticCandidates).toHaveLength(0);
    expect(result.exactMemoryLines).toEqual(['The moon is an archive.']);
  });
});
