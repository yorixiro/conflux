import { describe, expect, it, vi } from 'vitest';
import {
  mergeRequestSemanticRecallConversations,
  readRecentPassiveRecallConversationBodies,
  selectRequestSemanticRecallConversationIds
} from './chatSemanticRecallCorpus';
import { PASSIVE_RECALL_DEFAULT_COOLDOWN_MS, planPassiveRecall } from '../../engines/request/requestRecallGate';
import { collectPassiveRecallDeliveries } from '../../engines/request/requestRecallReceipts';
import type { Conversation } from '../../types/domain';

function conversation(id: string, messages: Conversation['messages']): Conversation {
  return {
    id,
    title: id,
    collaboratorId: 'pharos',
    activeProjectId: null,
    draft: '',
    pinnedAt: null,
    updatedAt: 1,
    messages
  };
}

describe('mergeRequestSemanticRecallConversations', () => {
  it('keeps persisted inactive bodies while overlaying the active live conversation', () => {
    const result = mergeRequestSemanticRecallConversations({
      persistedConversations: [
        conversation('active', [{
          id: 'persisted-active-user',
          role: 'user',
          content: 'old active persisted body',
          timestamp: 1
        }]),
        conversation('old', [{
          id: 'old-user',
          role: 'user',
          content: 'stable persisted old body',
          timestamp: 1
        }])
      ],
      liveConversations: [
        conversation('active', []),
        conversation('old', [])
      ],
      activeConversationId: 'active',
      activeMessages: [{
        id: 'live-active-user',
        role: 'user',
        content: 'fresh active request body',
        timestamp: 2
      }]
    });

    expect(result.find((entry) => entry.id === 'active')?.messages).toEqual([
      expect.objectContaining({
        id: 'live-active-user',
        content: 'fresh active request body'
      })
    ]);
    expect(result.find((entry) => entry.id === 'old')?.messages).toEqual([
      expect.objectContaining({
        id: 'old-user',
        content: 'stable persisted old body'
      })
    ]);
  });

  it('selects only configured recent same-collaborator bodies for request-time recall', () => {
    const result = selectRequestSemanticRecallConversationIds({
      conversations: [
        { ...conversation('active', []), updatedAt: 5 },
        { ...conversation('recent-a', []), updatedAt: 4 },
        { ...conversation('recent-b', []), updatedAt: 3 },
        { ...conversation('other-collaborator', []), collaboratorId: 'nova', updatedAt: 2 },
        { ...conversation('older', []), updatedAt: 1 }
      ],
      activeConversationId: 'active',
      currentCollaboratorId: 'pharos',
      config: {
        recentTailConversationCount: 1,
        voiceAnchorCount: 2
      }
    });

    expect(result).toEqual(['recent-a', 'recent-b']);
  });
});

describe('readRecentPassiveRecallConversationBodies', () => {
  const now = 5_000_000;
  const recentTime = now - PASSIVE_RECALL_DEFAULT_COOLDOWN_MS + 1000;

  it('reads older unloaded windows when they may still contain cooldown receipts', async () => {
    const readMessages = vi.fn(async (id: string) => [{
      id: `${id}:assistant`, role: 'assistant' as const, content: 'private old reply', timestamp: recentTime,
      memoryEvidence: {
        requestId: 'old-request', strategy: 'local_scan' as const, status: 'within_budget' as const, items: [],
        passiveRecallReceipt: {
          version: 1 as const, id: 'old:u1', scopeId: 'pharos', sourceRef: 'old:u1', deliveredAt: recentTime
        }
      }
    }]);
    const results = await readRecentPassiveRecallConversationBodies({
      conversations: [
        { ...conversation('active', []), updatedAt: now },
        { ...conversation('unloaded-older-window', []), updatedAt: recentTime },
        { ...conversation('already-loaded', [{ id: 'a', role: 'assistant', content: 'visible', timestamp: recentTime }]), updatedAt: recentTime },
        { ...conversation('expired', []), updatedAt: recentTime - 1001 },
        { ...conversation('private-other', []), collaboratorId: 'nova', updatedAt: now }
      ],
      activeConversationId: 'active',
      currentCollaboratorId: 'pharos',
      now,
      readMessages
    });
    expect(results.map((result) => result.id)).toEqual(['unloaded-older-window', 'already-loaded']);
    expect(results[0]?.messages[0]?.id).toBe('unloaded-older-window:assistant');
    expect(results[0]?.messages[0]?.content).toBe('');
    expect(readMessages).toHaveBeenCalledExactlyOnceWith('unloaded-older-window');
  });

  it('fails closed on missing or unreadable recent bodies', async () => {
    const args = {
      conversations: [{ ...conversation('unloaded', []), updatedAt: now }],
      activeConversationId: 'active',
      currentCollaboratorId: 'pharos',
      now
    };
    await expect(readRecentPassiveRecallConversationBodies({
      ...args,
      readMessages: vi.fn(async () => [])
    })).rejects.toThrow('not readable');
    await expect(readRecentPassiveRecallConversationBodies({
      ...args,
      readMessages: vi.fn(async () => { throw new Error('storage offline'); })
    })).rejects.toThrow('storage offline');
  });

  it('recovers a receipt from an unloaded older window and blocks the same fact', async () => {
    const id = 'old:u1';
    const historical = { ...conversation('previous-window', []), updatedAt: recentTime };
    const loaded = await readRecentPassiveRecallConversationBodies({
      conversations: [historical],
      activeConversationId: 'current-window',
      currentCollaboratorId: 'pharos',
      now,
      readMessages: async () => [{
        id: 'a1', role: 'assistant', content: '当时聊过了。', timestamp: recentTime,
        memoryEvidence: {
          requestId: 'old-request', strategy: 'local_scan', status: 'within_budget', items: [],
          passiveRecallReceipt: {
            version: 1, id, scopeId: 'pharos', sourceRef: id,
            sourceConversationId: 'old', sourceMessageIds: ['u1'], deliveredAt: recentTime
          }
        }
      }]
    });
    const deliveries = collectPassiveRecallDeliveries({
      conversations: loaded,
      currentScopeId: 'pharos',
      existingConversationIds: new Set(['old', 'previous-window', 'current-window'])
    });
    const plan = await planPassiveRecall({
      currentScopeId: 'pharos',
      lexical: [{
        id, scopeId: 'pharos', text: '喜欢黄油味炸鸡', sourceRef: id,
        sourceConversationId: 'old', sourceMessageIds: ['u1'], confidence: 0.92
      }],
      deliveries,
      now
    });
    expect(plan.selected).toBeNull();
    expect(plan.decisions).toEqual([{ id, status: 'blocked_cooldown' }]);
  });

  it('bounds fan-out instead of scanning an unbounded number of chat bodies', async () => {
    const readMessages = vi.fn(async () => []);
    await expect(readRecentPassiveRecallConversationBodies({
      conversations: Array.from({ length: 25 }, (_, i) => ({
        ...conversation(`recent-${i}`, []), updatedAt: now
      })),
      activeConversationId: 'active', currentCollaboratorId: 'pharos', now, readMessages
    })).rejects.toThrow('Too many recent conversations');
    expect(readMessages).not.toHaveBeenCalled();
  });
});
