import type { ChatTokenUsage } from '../../types/domain';
import type { AssistantRequestAudit } from './requestAudit';

export const REQUEST_INSIGHT_EVENT = 'polaris:request-insight-updated';
const REQUEST_INSIGHT_LIMIT = 12;

// Session-only, redacted diagnostics. Never persist prompt text, request bodies,
// API endpoints, memory lines, tool arguments or message identifiers here.
export type RequestInsightEntry = {
  requestId: string;
  at: number;
  phase: 'prepared' | 'completed' | 'failed';
  assistantName: string;
  providerName: string;
  modelId: string;
  estimate: {
    totalTokens: number;
    budgetTokens: number;
    overBudget: boolean;
    buckets: {
      identity: number;
      capability: number;
      memory: number;
      history: number;
    };
  };
  material: {
    sourceMessages: number;
    keptMessages: number;
    removedByLimit: number;
    removedByBudget: number;
    removedToolMessages: number;
    memories: number;
    memoryDropped: number;
    summaries: number;
    recallCandidates: number;
    attachments: number;
    tools: number;
  };
  cache: {
    plan: AssistantRequestAudit['cachePlan']['requestApplication']['status'];
    eligibleBreakpoints: number;
  };
  usage: ChatTokenUsage | null;
};

type RecordOptions = {
  phase?: RequestInsightEntry['phase'];
  reply?: { tokenUsage?: ChatTokenUsage };
};

let entries: RequestInsightEntry[] = [];

export function buildRequestInsightEntry(
  audit: AssistantRequestAudit,
  options: RecordOptions = {},
  at = Date.now()
): RequestInsightEntry {
  const usage = options.reply?.tokenUsage;
  return {
    requestId: audit.requestId,
    at,
    phase: options.phase ?? 'prepared',
    assistantName: audit.assistantName,
    providerName: audit.providerName,
    modelId: audit.modelId,
    estimate: {
      totalTokens: audit.budgetUsage.totalEstimatedTokens,
      budgetTokens: audit.budgetUsage.totalPromptTokens,
      overBudget: audit.budgetUsage.preflightStatus === 'overflow',
      buckets: {
        identity: audit.budgetUsage.buckets.identity.estimatedTokens,
        capability: audit.budgetUsage.buckets.capability.estimatedTokens,
        memory: audit.budgetUsage.buckets.memory.estimatedTokens,
        history: audit.budgetUsage.buckets.history.estimatedTokens
      }
    },
    material: {
      sourceMessages: audit.sourceMessageCount,
      keptMessages: audit.keptMessageCount,
      removedByLimit: audit.contextPlan.entries.filter((part) => part.status === 'dropped_message_limit').length,
      removedByBudget: audit.contextPlan.entries.filter((part) => part.status === 'dropped_history_budget').length,
      removedToolMessages: audit.contextPlan.entries.filter((part) =>
        part.status === 'dropped_tool_message' || part.status === 'dropped_orphaned_tool_result'
      ).length,
      memories: audit.memoryPlan.selectedLines.length,
      memoryDropped: audit.memoryPlan.entries.filter((part) => part.status === 'dropped_budget').length,
      summaries: audit.conversationSummaryPlan.selectedSummaries.length,
      recallCandidates: audit.semanticRecallPlan.selectedCandidates.length,
      attachments: audit.context.attachmentSlots.pending.length,
      tools: audit.tooling.toolCount
    },
    cache: {
      plan: audit.cachePlan.requestApplication.status,
      eligibleBreakpoints: audit.cachePlan.breakpoints.filter((part) => part.eligible).length
    },
    usage: usage ? {
      totalTokens: usage.totalTokens,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      cacheMissInputTokens: usage.cacheMissInputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      reasoningTokens: usage.reasoningTokens
    } : null
  };
}

export function readRequestInsightEntries(): RequestInsightEntry[] {
  return [...entries];
}

export function clearRequestInsightEntries() {
  entries = [];
}

export function recordRequestInsight(audit: AssistantRequestAudit, options?: RecordOptions) {
  const next = buildRequestInsightEntry(audit, options);
  const existing = entries.find((entry) => entry.requestId === next.requestId);
  // A delayed prepared callback must not overwrite a completed/failed receipt.
  if (existing && existing.phase !== 'prepared' && next.phase === 'prepared') return;
  entries = [next, ...entries.filter((entry) => entry.requestId !== next.requestId)].slice(0, REQUEST_INSIGHT_LIMIT);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REQUEST_INSIGHT_EVENT));
}
