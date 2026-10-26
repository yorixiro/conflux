import { afterEach, describe, expect, it } from 'vitest';
import type { AssistantRequestAudit } from './requestAudit';
import {
  buildRequestInsightEntry,
  clearRequestInsightEntries,
  readRequestInsightEntries,
  recordRequestInsight
} from './requestInsightRuntime';

function fakeAudit(id = 'request-1'): AssistantRequestAudit {
  return {
    requestId: id,
    assistantName: 'Example AI',
    providerName: 'Example provider',
    modelId: 'example-model',
    budgetUsage: {
      totalEstimatedTokens: 18459,
      totalPromptTokens: 24000,
      preflightStatus: 'within_budget',
      buckets: {
        identity: { estimatedTokens: 3000 },
        capability: { estimatedTokens: 4000 },
        memory: { estimatedTokens: 500 },
        history: { estimatedTokens: 10000 }
      }
    },
    sourceMessageCount: 20,
    keptMessageCount: 12,
    contextPlan: { entries: [
      { status: 'dropped_message_limit' },
      { status: 'dropped_history_budget' },
      { status: 'dropped_orphaned_tool_result' }
    ] },
    memoryPlan: {
      selectedLines: ['private memory content'],
      entries: [{ status: 'dropped_budget' }]
    },
    conversationSummaryPlan: { selectedSummaries: [{}] },
    semanticRecallPlan: { selectedCandidates: [{ raw: 'secret quote' }] },
    context: { attachmentSlots: { pending: [{}] }, messages: [{ content: 'secret chat body' }] },
    tooling: { toolCount: 8 },
    cachePlan: {
      requestApplication: { status: 'provider_automatic_or_unknown' },
      breakpoints: [{ eligible: true }, { eligible: false }]
    },
    promptParts: [{ content: 'secret system prompt' }],
    requestReceipt: { raw: 'secret request receipt' }
  } as unknown as AssistantRequestAudit;
}

afterEach(() => clearRequestInsightEntries());

describe('request insights for ordinary usage', () => {
  it('only projects counts, estimate, cache plan and reported usage without sensitive bodies', () => {
    const audit = fakeAudit();
    const entry = buildRequestInsightEntry(audit, {
      phase: 'completed',
      reply: { tokenUsage: { inputTokens: 19000, cachedInputTokens: 0, outputTokens: 300 } }
    }, 123);

    expect(entry.estimate.totalTokens).toBe(18459);
    expect(entry.material).toMatchObject({
      keptMessages: 12,
      removedByLimit: 1,
      removedByBudget: 1,
      removedToolMessages: 1,
      memories: 1,
      memoryDropped: 1,
      summaries: 1,
      recallCandidates: 1,
      attachments: 1,
      tools: 8
    });
    expect(entry.cache.eligibleBreakpoints).toBe(1);
    expect(entry.usage?.cachedInputTokens).toBe(0);
    expect(JSON.stringify(entry)).not.toMatch(/secret|private memory content/);
    expect(JSON.stringify(entry)).not.toContain('raw');
  });

  it('upserts one request through preparation and completion, preserving explicit zero', () => {
    const audit = fakeAudit();
    recordRequestInsight(audit, { phase: 'prepared' });
    recordRequestInsight(audit, { phase: 'completed', reply: { tokenUsage: { cachedInputTokens: 0 } } });
    recordRequestInsight(audit, { phase: 'prepared' });

    expect(readRequestInsightEntries()).toHaveLength(1);
    expect(readRequestInsightEntries()[0]).toMatchObject({ phase: 'completed', usage: { cachedInputTokens: 0 } });
  });

  it('bounds the temporary list and keeps failed requests distinct from missing usage', () => {
    for (let i = 0; i < 15; i += 1) {
      recordRequestInsight(fakeAudit(`request-${i}`), { phase: 'failed' });
    }
    const entries = readRequestInsightEntries();
    expect(entries).toHaveLength(12);
    expect(entries[0]).toMatchObject({ requestId: 'request-14', phase: 'failed', usage: null });
    expect(entries.some((entry) => entry.requestId === 'request-0')).toBe(false);
  });
});
