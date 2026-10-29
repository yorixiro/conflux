import { isRequestDebugCaptureEnabled } from '../../app/developer/debugCaptureRuntime';
import { createDebugLog } from '../../infrastructure/debugLog';
import type { AssistantRequestAudit } from './requestAudit';
import { buildRequestInspectorModel, type AssistantRequestInspectorModel } from './requestInspector';
import type { AssistantReply } from '../chatApi';
import type { ProviderHttpRequest } from '../provider-runtime';
import { compareRequestCachePrefixes, type RequestCachePrefixDiagnostic } from './requestCachePrefixDiagnostics';

export type RequestDebugEntry = {
  requestId: string;
  at: number;
  phase: 'prepared' | 'completed' | 'failed';
  conversationId?: string;
  cachePrefixDiagnostic?: RequestCachePrefixDiagnostic | null;
  assistantName: string;
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
    conversationId?: string;
    reply?: AssistantReply;
    error?: unknown;
    builtRequest?: ProviderHttpRequest | null;
  }
) {
  if (!isRequestDebugCaptureEnabled()) return;

  const inspector = buildRequestInspectorModel(audit);
  const reply = options?.reply;
  const errorMessage =
    options?.error instanceof Error
      ? options.error.message
      : typeof options?.error === 'string'
        ? options.error
        : null;
  const previousCompletedRequest = options?.builtRequest && options.conversationId
    ? [...requestDebugLog.read()].reverse().find((previous) => (
        previous.phase === 'completed'
        && previous.requestId !== audit.requestId
        && previous.conversationId === options.conversationId
        && previous.providerId === audit.providerId
        && previous.modelId === audit.modelId
        && previous.outboundRequest?.provider === options.builtRequest?.provider
      ))
    : undefined;
  const cachePrefixDiagnostic = previousCompletedRequest?.outboundRequest && options?.builtRequest
    ? compareRequestCachePrefixes(previousCompletedRequest.outboundRequest.body, options.builtRequest.body)
    : null;
  const entry: RequestDebugEntry = {
    requestId: audit.requestId,
    at: Date.now(),
    phase: options?.phase ?? 'prepared',
    conversationId: options?.conversationId,
    cachePrefixDiagnostic,
    assistantName: audit.assistantName,
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
    cachePrefixDiagnostic: entry.cachePrefixDiagnostic,
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
