import { describe, expect, it, vi } from 'vitest';
import { fusePassiveRecallEvidence, planPassiveRecall, type PassiveRecallEvidence } from './requestRecallGate';

const evidence = (id: string, confidence = 0.9, scopeId = 'persona-a'): PassiveRecallEvidence => ({
  id,
  scopeId,
  text: `${id} is a longstanding preference`,
  sourceRef: `conversation-old:message-${id}`,
  confidence,
  sourceConversationId: 'conversation-old',
  sourceMessageIds: [`message-${id}`]
});

describe('one-memory passive recall gate', () => {
  it('fuses keyword and semantic hits without duplicating one source', () => {
    const fused = fusePassiveRecallEvidence({
      lexical: [evidence('shared'), evidence('lexical')],
      semantic: [evidence('shared'), evidence('semantic')]
    });
    expect(fused).toHaveLength(3);
    expect(fused[0]).toMatchObject({ id: 'shared', lanes: ['lexical', 'semantic'] });
  });

  it('injects at most one eligible memory', async () => {
    const plan = await planPassiveRecall({
      currentScopeId: 'persona-a',
      lexical: [evidence('first'), evidence('second')],
      now: 1000
    });
    expect(plan.selected?.id).toBe('first');
    expect(plan.decisions.filter((decision) => decision.status === 'selected')).toHaveLength(1);
  });

  it('returns no memory when all candidates are weak', async () => {
    const plan = await planPassiveRecall({
      currentScopeId: 'persona-a',
      semantic: [evidence('irrelevant', 0.3)],
      now: 1000
    });
    expect(plan.selected).toBeNull();
    expect(plan.decisions).toEqual([{ id: 'irrelevant', status: 'blocked_relevance' }]);
  });

  it('never crosses collaborator boundaries', async () => {
    const plan = await planPassiveRecall({
      currentScopeId: 'persona-a',
      lexical: [evidence('other-private', 0.98, 'persona-b')],
      now: 1000
    });
    expect(plan.selected).toBeNull();
    expect(plan.decisions[0]?.status).toBe('blocked_scope');
  });

  it('suppresses just-delivered evidence and falls back to another qualified fact', async () => {
    const plan = await planPassiveRecall({
      currentScopeId: 'persona-a',
      lexical: [evidence('repeat'), evidence('fresh')],
      deliveries: [{ id: 'repeat', deliveredAt: 800 }],
      now: 1000
    });
    expect(plan.selected?.id).toBe('fresh');
    expect(plan.decisions[0]).toEqual({ id: 'repeat', status: 'blocked_cooldown' });
  });

  it('does not surface a fact already present in this turn context', async () => {
    const item = evidence('visible');
    const plan = await planPassiveRecall({
      currentScopeId: 'persona-a',
      semantic: [item],
      recentContext: `Here it is: ${item.text}.`,
      now: 1000
    });
    expect(plan.selected).toBeNull();
    expect(plan.decisions[0]?.status).toBe('blocked_context');
  });

  it('fails closed on gray-zone similarity unless the reviewer confirms', async () => {
    const input = {
      currentScopeId: 'persona-a',
      semantic: [evidence('gray', 0.65)],
      now: 1000
    };
    expect((await planPassiveRecall(input)).selected).toBeNull();
    const reviewGrayZone = vi.fn(async () => true);
    const reviewed = await planPassiveRecall({ ...input, reviewGrayZone });
    expect(reviewed.selected?.id).toBe('gray');
    expect(reviewGrayZone).toHaveBeenCalledTimes(1);
    const brokenReviewer = vi.fn(async () => { throw new Error('provider unavailable'); });
    expect((await planPassiveRecall({ ...input, reviewGrayZone: brokenReviewer })).selected).toBeNull();
  });

  it('never injects an unsourced fact', async () => {
    const plan = await planPassiveRecall({
      currentScopeId: 'persona-a',
      lexical: [{ ...evidence('no-source'), sourceRef: '' }],
      now: 1000
    });
    expect(plan.selected).toBeNull();
  });

  it('lets a triggered exact-match lane pass relevance but not other gates', async () => {
    const item = evidence('lore', 0.1);
    const eligible = await planPassiveRecall({ currentScopeId: 'persona-a', exact: [item], now: 1000 });
    expect(eligible.selected?.id).toBe('lore');
    const suppressed = await planPassiveRecall({
      currentScopeId: 'persona-a',
      exact: [item],
      deliveries: [{ id: 'lore', deliveredAt: 999 }],
      now: 1000
    });
    expect(suppressed.selected).toBeNull();
  });
});
