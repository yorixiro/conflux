import { describe, expect, it } from 'vitest';
import type { AssistantRequestAudit } from './requestAudit';
import type { ChatMessage, Conversation } from '../../types/domain';
import { buildPassiveRecallReceipt, collectPassiveRecallDeliveries } from './requestRecallReceipts';
import { planPassiveRecall } from './requestRecallGate';
import { buildConversationRecordLocalDataRow } from '../localData/chatRows';

const memory = {
  id: 'past:u1',
  scopeId: 'persona-a',
  sourceRef: 'past:u1',
  sourceConversationId: 'past',
  sourceMessageIds: ['u1'],
  text: '我喜欢带一点黄油香味的炸鸡',
  confidence: 0.92,
  bestConfidence: 0.92,
  lanes: ['lexical' as const],
  fusedScore: 0.016
};

function audit(contextText = memory.text): AssistantRequestAudit {
  return {
    requestId: 'request-1',
    collaboratorId: 'persona-a',
    oneMemoryRecallPlan: {
      selected: memory,
      decisions: [{ id: memory.id, status: 'selected' }]
    },
    semanticRecallContextCandidates: [],
    context: {
      segments: [{ kind: 'semantic_recall', messages: [{ role: 'system', content: contextText }] }]
    }
  } as unknown as AssistantRequestAudit;
}

function conversation(id: string, collaboratorId: string, messages: ChatMessage[]): Conversation {
  return {
    id,
    collaboratorId,
    title: id,
    updatedAt: 5000,
    pinnedAt: null,
    messages
  };
}

function deliveredMessage(receipt: NonNullable<ReturnType<typeof buildPassiveRecallReceipt>>): ChatMessage {
  return {
    id: 'assistant-reply',
    role: 'assistant',
    content: '好，我记得。',
    timestamp: 5000,
    memoryEvidence: {
      requestId: 'request-1',
      status: 'within_budget',
      strategy: 'local_scan',
      items: [],
      passiveRecallReceipt: receipt
    }
  };
}

describe('durable one-memory receipts', () => {
  it('writes no delivery for a mere selection that did not enter provider context', () => {
    expect(buildPassiveRecallReceipt(audit('没有把候选放进上下文'), 5000)).toBeNull();
    expect(buildPassiveRecallReceipt({ ...audit(), collaboratorId: 'persona-b' }, 5000)).toBeNull();
    expect(buildPassiveRecallReceipt({ ...audit(), oneMemoryRecallPlan: { selected: null, decisions: [] } }, 5000)).toBeNull();
  });

  it('survives a JSON round trip in the existing chat message and suppresses the next turn', async () => {
    const receipt = buildPassiveRecallReceipt(audit(), 5000);
    expect(receipt).toMatchObject({ id: 'past:u1', scopeId: 'persona-a', deliveredAt: 5000 });
    const row = JSON.parse(JSON.stringify(conversation('live', 'persona-a', [deliveredMessage(receipt!)]))) as Conversation;
    const localDataRecord = buildConversationRecordLocalDataRow({
      conversation: row,
      bodyState: 'complete',
      version: 1,
      committedAt: 6000
    });
    expect(localDataRecord?.value.messages[0]?.memoryEvidence?.passiveRecallReceipt?.id).toBe(memory.id);
    const deliveries = collectPassiveRecallDeliveries({
      currentScopeId: 'persona-a',
      conversations: [row],
      existingConversationIds: new Set(['live', 'past'])
    });
    expect(deliveries).toEqual([{ id: memory.id, deliveredAt: 5000 }]);
    const nextTurn = await planPassiveRecall({
      currentScopeId: 'persona-a',
      lexical: [{ ...memory, confidence: 0.92 }],
      deliveries,
      now: 5500
    });
    expect(nextTurn.selected).toBeNull();
    expect(nextTurn.decisions).toEqual([{ id: memory.id, status: 'blocked_cooldown' }]);
  });

  it('rejects other personas, failed messages, bad timestamps, and deleted sources', () => {
    const receipt = buildPassiveRecallReceipt(audit(), 5000)!;
    const legitimate = deliveredMessage(receipt);
    const otherPersona = conversation('other', 'persona-b', [legitimate]);
    const errorReply = { ...legitimate, id: 'failure', requestRole: 'system' as const };
    const tampered = deliveredMessage({ ...receipt, deliveredAt: Number.NaN });
    expect(collectPassiveRecallDeliveries({
      currentScopeId: 'persona-a',
      conversations: [otherPersona, conversation('live', 'persona-a', [errorReply, tampered])],
      existingConversationIds: new Set(['live', 'past'])
    })).toEqual([]);
    expect(collectPassiveRecallDeliveries({
      currentScopeId: 'persona-a',
      conversations: [conversation('live', 'persona-a', [legitimate])],
      existingConversationIds: new Set(['live'])
    })).toEqual([]);
  });

  it('removing a reply removes its receipt; later deliveries replace earlier ones', () => {
    const receipt = buildPassiveRecallReceipt(audit(), 5000)!;
    const first = deliveredMessage(receipt);
    const second = { ...deliveredMessage({ ...receipt, deliveredAt: 7000 }), id: 'assistant-2' };
    const args = { currentScopeId: 'persona-a', existingConversationIds: new Set(['past', 'live']) };
    expect(collectPassiveRecallDeliveries({ ...args, conversations: [conversation('live', 'persona-a', [first, second])] }))
      .toEqual([{ id: memory.id, deliveredAt: 7000 }]);
    expect(collectPassiveRecallDeliveries({ ...args, conversations: [conversation('live', 'persona-a', [])] }))
      .toEqual([]);
  });
});
