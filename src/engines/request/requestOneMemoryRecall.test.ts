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

  it('does not mistake an inflated Chinese anchor score for strong relevance', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [{
        ...candidate('vague', 'matched_context', 12),
        text: '昨天和爸爸聊过天气。'
      }],
      recentContext: '爸爸上次提过的编程学习计划是什么',
      now: 1000
    });
    expect(result.plan.selected).toBeNull();
    expect(result.plan.decisions[0]?.status).toBe('blocked_relevance');
  });

  it('permits a specific Chinese lexical phrase with strong query coverage', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [{
        ...candidate('strawberry', 'matched_context', 8),
        text: '记忆来源：草莓蛋糕喜好是新鲜草莓和微酸口味。'
      }],
      recentContext: '草莓蛋糕喜好',
      now: 1000
    });
    expect(result.plan.selected?.id).toBe('old-conversation:message-strawberry');
    expect(result.plan.selected?.bestConfidence).toBeGreaterThanOrEqual(0.78);
  });

  it('refuses an opposite old preference when the current utterance corrects it', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [{
        ...candidate('old-positive', 'matched_context', 9),
        text: '我喜欢太咸的炸鸡。'
      }],
      recentContext: '我不喜欢太咸的炸鸡',
      now: 1000
    });
    expect(result.plan.selected).toBeNull();
    expect(result.plan.decisions[0]?.status).toBe('blocked_relevance');
  });

  it('rejects a high vector score when a conflicting time cue points to a different event', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [{
        ...candidate('last-year', 'vector_match', 0.98),
        text: '去年在南昌吃过薯饼。'
      }],
      recentContext: '昨天在南昌吃薯饼的事情',
      now: 1000
    });
    expect(result.plan.selected).toBeNull();
    expect(result.plan.decisions[0]?.status).toBe('blocked_relevance');
  });

  it('keeps distinct meanings of a shared technical word out of strong lexical recall', async () => {
    const result = await planOneMemoryRequestRecall({
      currentScopeId: 'persona-a',
      candidates: [{
        ...candidate('book-index', 'matched_context', 15),
        text: '书籍目录和纸质书的索引。'
      }],
      recentContext: '记忆库的向量索引怎么维护',
      now: 1000
    });
    expect(result.plan.selected).toBeNull();
  });
});
