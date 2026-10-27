import { describe, expect, it } from 'vitest';
import type { AssistantRequestAudit } from '../../engines/request/requestAudit';
import { buildChatMemoryEvidenceFromAudit } from './chatMemoryEvidence';

function audit(seed: Partial<AssistantRequestAudit>): AssistantRequestAudit {
  return {
    requestId: 'request-1',
    assistantName: 'Pharos',
    providerId: 'provider',
    providerName: 'Provider',
    modelId: 'model',
    collaboratorId: 'pharos',
    personaPromptSource: 'builtin',
    messageLimit: Number.MAX_SAFE_INTEGER,
    tokenBudget: Number.MAX_SAFE_INTEGER,
    budgetPlan: {} as AssistantRequestAudit['budgetPlan'],
    budgetUsage: {} as AssistantRequestAudit['budgetUsage'],
    memoryPlan: {} as AssistantRequestAudit['memoryPlan'],
    conversationSummaryPlan: {
      status: 'disabled',
      selectedSummaries: [],
      estimatedTokens: 0,
      maxTokens: 0,
      maxChars: 0,
      entries: []
    },
    semanticRecallPlan: {
      status: 'within_budget',
      strategy: 'semantic_index',
      config: {
        recentTailConversationCount: 3,
        recentTailUserMessageCount: 3,
        voiceAnchorCount: 3
      },
      selectedCandidates: [],
      estimatedTokens: 0,
      maxTokens: null,
      entries: []
    },
    cachePlan: {} as AssistantRequestAudit['cachePlan'],
    contextPlan: {} as AssistantRequestAudit['contextPlan'],
    sourceMessageCount: 0,
    droppedToolMessageCount: 0,
    keptMessageCount: 0,
    trimmedMessageCount: 0,
    promptParts: [],
    truncation: {} as AssistantRequestAudit['truncation'],
    tooling: {
      enabled: false,
      toolCount: 0,
      toolChoice: null,
      toolNames: []
    },
    requestReceipt: {} as AssistantRequestAudit['requestReceipt'],
    context: {
      memorySlots: { session: [], profile: [], pin: [] },
      attachmentSlots: { enabled: false, pending: [] },
      segments: []
    },
    timings: {} as AssistantRequestAudit['timings'],
    ...seed
  };
}

describe('buildChatMemoryEvidenceFromAudit', () => {
  it('records only the actually injected item in one-memory mode, ignoring legacy ranked hits', () => {
    const selectedText = '小欣喜欢淡淡黄油味的炸鸡';
    const evidence = buildChatMemoryEvidenceFromAudit(audit({
      oneMemoryRecallPlan: {
        selected: {
          id: 'old:u1',
          scopeId: 'pharos',
          sourceRef: 'old:u1',
          sourceConversationId: 'old',
          sourceMessageIds: ['u1'],
          text: selectedText,
          confidence: 0.9,
          bestConfidence: 0.9,
          fusedScore: 0.02,
          lanes: ['lexical']
        },
        decisions: [{ id: 'old:u1', status: 'selected' }]
      },
      semanticRecallPlan: {
        status: 'within_budget', strategy: 'local_scan',
        config: { recentTailConversationCount: 3, recentTailUserMessageCount: 3, voiceAnchorCount: 3 },
        selectedCandidates: [{
          id: 'old-hit-not-injected', kind: 'matched_context', label: 'old',
          sourceConversationId: 'old', sourceMessageIds: ['u2'],
          estimatedTokens: 10, charCount: 20, score: 0.99, contentFingerprint: 'old', status: 'kept'
        }],
        estimatedTokens: 10, maxTokens: null, entries: []
      },
      semanticRecallContextCandidates: [{
        id: 'new-selected', kind: 'matched_context', label: 'old',
        sourceConversationId: 'old', sourceMessageIds: ['u1'], score: 0.9, text: selectedText
      }],
      context: {
        memorySlots: { session: [], profile: [], pin: [] },
        attachmentSlots: { enabled: false, pending: [] },
        segments: [{ kind: 'semantic_recall', messages: [{ role: 'system', content: `[回忆]\n${selectedText}` }] }]
      }
    }), 10_000);
    expect(evidence?.items.map((item) => item.id)).toEqual(['new-selected']);
    expect(evidence?.passiveRecallReceipt).toMatchObject({ id: 'old:u1', deliveredAt: 10_000 });
  });

  it('never displays planned but uninjected memory', () => {
    const evidence = buildChatMemoryEvidenceFromAudit(audit({
      oneMemoryRecallPlan: { selected: null, decisions: [{ id: 'old:u1', status: 'blocked_cooldown' }] }
    }));
    expect(evidence?.items).toEqual([]);
    expect(evidence?.passiveRecallReceipt).toBeUndefined();
    expect(evidence?.passiveRecallReview).toMatchObject({ result: 'no_match' });
  });

  it('keeps user-visible semantic recall evidence for assistant messages', () => {
    const evidence = buildChatMemoryEvidenceFromAudit(audit({
      semanticRecallPlan: {
        status: 'within_budget',
        strategy: 'semantic_index',
        config: {
          recentTailConversationCount: 3,
          recentTailUserMessageCount: 3,
          voiceAnchorCount: 3
        },
        selectedCandidates: [{
          id: 'recall:vector_match:old:chunk-1',
          kind: 'vector_match',
          label: '向量索引讨论 · 2026-06-07',
          sourceConversationId: 'old',
          sourceMessageIds: ['u1', 'a1'],
          memoryChunkKind: 'dialogue_turn',
          estimatedTokens: 42,
          charCount: 180,
          score: 0.872,
          contentFingerprint: 'fingerprint',
          status: 'kept'
        }],
        estimatedTokens: 42,
        maxTokens: null,
        entries: []
      },
      semanticRecallContextCandidates: [{
        id: 'recall:vector_match:old:chunk-1',
        kind: 'vector_match',
        label: '向量索引讨论 · 2026-06-07',
        sourceConversationId: 'old',
        sourceMessageIds: ['u1', 'a1'],
        score: 0.872,
        text: 'user: 记忆应该能看到向量切片。\n\nassistant: 可以把对话轮作为来源片段。'
      }]
    }));

    expect(evidence).toEqual({
      requestId: 'request-1',
      strategy: 'semantic_index',
      status: 'within_budget',
      items: [{
        id: 'recall:vector_match:old:chunk-1',
        kind: 'vector_match',
        label: '向量索引讨论 · 2026-06-07',
        sourceConversationId: 'old',
        sourceMessageIds: ['u1', 'a1'],
        textExcerpt: 'user: 记忆应该能看到向量切片。 assistant: 可以把对话轮作为来源片段。',
        estimatedTokens: 42,
        charCount: 180,
        score: 0.872,
        memoryChunkKind: 'dialogue_turn'
      }]
    });
  });

  it('does not show a receipt when no recall text entered the request', () => {
    expect(buildChatMemoryEvidenceFromAudit(audit({
      semanticRecallPlan: {
        status: 'empty',
        strategy: 'local_scan',
        config: {
          recentTailConversationCount: 3,
          recentTailUserMessageCount: 3,
          voiceAnchorCount: 3
        },
        selectedCandidates: [],
        estimatedTokens: 0,
        maxTokens: null,
        entries: []
      }
    }))).toBeUndefined();
  });

  it('does not surface recent-tail continuity as user-visible memory evidence', () => {
    const evidence = buildChatMemoryEvidenceFromAudit(audit({
      semanticRecallPlan: {
        status: 'within_budget',
        strategy: 'local_scan',
        config: {
          recentTailConversationCount: 3,
          recentTailUserMessageCount: 3,
          voiceAnchorCount: 3
        },
        selectedCandidates: [
          {
            id: 'recall:recent_tail:old:u1+a1',
            kind: 'recent_tail',
            label: '旧窗口 · 2026-06-07',
            sourceConversationId: 'old',
            sourceMessageIds: ['u1', 'a1'],
            estimatedTokens: 30,
            charCount: 120,
            score: null,
            contentFingerprint: 'tail',
            status: 'kept'
          },
          {
            id: 'recall:matched_context:old:u2',
            kind: 'matched_context',
            label: '旧窗口 · 2026-06-07',
            sourceConversationId: 'old',
            sourceMessageIds: ['u2'],
            estimatedTokens: 18,
            charCount: 70,
            score: 0.5,
            contentFingerprint: 'match',
            status: 'kept'
          }
        ],
        estimatedTokens: 48,
        maxTokens: null,
        entries: []
      },
      semanticRecallContextCandidates: [
        {
          id: 'recall:recent_tail:old:u1+a1',
          kind: 'recent_tail',
          label: '旧窗口 · 2026-06-07',
          sourceConversationId: 'old',
          sourceMessageIds: ['u1', 'a1'],
          score: null,
          text: 'user: 接上旧窗口尾巴。\n\nassistant: 好。'
        },
        {
          id: 'recall:matched_context:old:u2',
          kind: 'matched_context',
          label: '旧窗口 · 2026-06-07',
          sourceConversationId: 'old',
          sourceMessageIds: ['u2'],
          score: 0.5,
          text: '用户明确说过召回显示不要混入接着聊。'
        }
      ]
    }));

    expect(evidence?.items).toEqual([
      expect.objectContaining({
        id: 'recall:matched_context:old:u2',
        kind: 'matched_context',
        textExcerpt: '用户明确说过召回显示不要混入接着聊。'
      })
    ]);
  });
});
