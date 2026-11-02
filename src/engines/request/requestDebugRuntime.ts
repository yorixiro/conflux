import { isRequestDebugCaptureEnabled, isRoomRequestCaptureEnabled } from '../../app/developer/debugCaptureRuntime';
import { createDebugLog } from '../../infrastructure/debugLog';
import type { AssistantRequestAudit } from './requestAudit';
import { buildRequestInspectorModel, type AssistantRequestInspectorModel } from './requestInspector';
import type { AssistantReply } from '../chatApi';
import type { ProviderHttpRequest } from '../provider-runtime';

export type RequestDebugEntry = {
  requestId: string;
  at: number;
  phase: 'prepared' | 'completed' | 'failed';
  assistantName: string;
  /** Stable owner id for room-scoped request history. Older records may not include it. */
  collaboratorId?: string | null;
  providerId?: string;
  providerName?: string;
  modelId: string;
  inspector: AssistantRequestInspectorModel;
  promptParts: Array<{
    name: AssistantRequestAudit['promptParts'][number]['name'];
    layer: AssistantRequestAudit['promptParts'][number]['layer'];
    status: AssistantRequestInspectorModel['promptParts'][number]['status'];
    content: string;
  }>;
  contextSummary: {
    segmentKinds: AssistantRequestAudit['context']['segments'][number]['kind'][];
    memoryProfileCount: number;
    conversationSummaryCount: number;
    semanticRecallCandidateCount: number;
    attachmentCount: number;
  };
  timings: AssistantRequestAudit['timings'];
  tooling: AssistantRequestAudit['tooling'];
  requestReceipt: AssistantRequestAudit['requestReceipt'];
  responseSummary: {
    usedNativeToolCalls: boolean;
    nativeToolCallCount: number;
    tokenCount: number | null;
    tokenUsage: AssistantReply['tokenUsage'] | null;
    finishReason?: string | null;
    transportIncomplete?: boolean;
    error: string | null;
  };
  outboundRequest: {
    provider: ProviderHttpRequest['provider'];
    compatibilityMode: ProviderHttpRequest['compatibilityMode'];
    endpoint: string;
    body: Record<string, unknown>;
  } | null;
};

export const REQUEST_DEBUG_EVENT = 'polaris:request-debug-updated';
const REQUEST_DEBUG_STORAGE_KEY = 'polaris-request-debug-log';
const REQUEST_DEBUG_LIMIT = 12;

const requestDebugLog = createDebugLog<RequestDebugEntry>(REQUEST_DEBUG_STORAGE_KEY, {
  maxEntries: REQUEST_DEBUG_LIMIT,
  broadcastEvent: REQUEST_DEBUG_EVENT
});

export function readRequestDebugEntries(): RequestDebugEntry[] {
  return requestDebugLog.read();
}

export function clearRequestDebugEntries() {
  requestDebugLog.clear();
}

export function recordRequestDebugEntry(
  audit: AssistantRequestAudit,
  options?: {
    phase?: RequestDebugEntry['phase'];
    reply?: AssistantReply;
    error?: unknown;
    builtRequest?: ProviderHttpRequest | null;
  }
) {
  if (!isRequestDebugCaptureEnabled() && !isRoomRequestCaptureEnabled(audit.collaboratorId)) return;

  const inspector = buildRequestInspectorModel(audit);
  const reply = options?.reply;
  const errorMessage =
    options?.error instanceof Error
      ? options.error.message
      : typeof options?.error === 'string'
        ? options.error
        : null;
  const entry: RequestDebugEntry = {
    requestId: audit.requestId,
    at: Date.now(),
    phase: options?.phase ?? 'prepared',
    assistantName: audit.assistantName,
    collaboratorId: audit.collaboratorId,
    providerId: audit.providerId,
    providerName: audit.providerName,
    modelId: audit.modelId,
    inspector,
    promptParts: audit.promptParts.map((part) => ({
      name: part.name,
      layer: part.layer,
      status: inspector.promptParts.find((item) => item.name === part.name)?.status ?? 'disabled',
      content: part.content
    })),
    contextSummary: {
      segmentKinds: audit.context.segments.map((segment) => segment.kind),
      memoryProfileCount: audit.context.memorySlots.profile.length,
      conversationSummaryCount: audit.conversationSummaryPlan.selectedSummaries.length,
      semanticRecallCandidateCount: audit.semanticRecallPlan.selectedCandidates.length,
      attachmentCount: audit.context.attachmentSlots.pending.length
    },
    timings: audit.timings,
    tooling: audit.tooling,
    requestReceipt: audit.requestReceipt,
    responseSummary: {
      usedNativeToolCalls: reply?.usedNativeToolCalls === true,
      nativeToolCallCount: reply?.nativeToolCallCount ?? 0,
      tokenCount: typeof reply?.tokenCount === 'number' ? reply.tokenCount : null,
      tokenUsage: reply?.tokenUsage ?? null,
      finishReason: reply?.finishReason?.trim() || null,
      transportIncomplete: reply?.transportIncomplete === true,
      error: errorMessage
    },
    outboundRequest: options?.builtRequest
      ? {
          provider: options.builtRequest.provider,
          compatibilityMode: options.builtRequest.compatibilityMode,
          endpoint: options.builtRequest.endpoint,
          body: JSON.parse(JSON.stringify(options.builtRequest.body)) as Record<string, unknown>
        }
      : null
  };

  console.info('[polaris-request]', {
    phase: entry.phase,
    requestId: entry.requestId,
    assistantName: entry.assistantName,
    providerName: entry.providerName ?? null,
    modelId: entry.modelId,
    promptParts: entry.promptParts.length,
    preflight: entry.inspector.totals.preflightStatus,
    preparationMs: entry.timings.totalPreparationMs,
    tools: entry.tooling.toolNames,
    toolChoice: entry.tooling.toolChoice,
    requestFingerprint: entry.requestReceipt.fingerprints.fullRequest,
    duplicateInfo: entry.requestReceipt.duplicateInfo.length,
    topographyOverlap: entry.requestReceipt.topographyOverlap.length,
    topographyEvidenceOverlap: entry.requestReceipt.topographyEvidenceOverlap.length,
    conversationSummaries: entry.contextSummary.conversationSummaryCount,
    semanticRecallCandidates: entry.contextSummary.semanticRecallCandidateCount,
    shrinkPlan: entry.requestReceipt.shrinkPlan.length,
    nativeToolCallCount: entry.responseSummary.nativeToolCallCount,
    tokenUsage: entry.responseSummary.tokenUsage,
    finishReason: entry.responseSummary.finishReason,
    transportIncomplete: entry.responseSummary.transportIncomplete,
    error: entry.responseSummary.error,
    outboundProvider: entry.outboundRequest?.provider ?? null,
    outboundEndpoint: entry.outboundRequest?.endpoint.slice(0, 120) ?? null
  });

  requestDebugLog.append(entry);
}
