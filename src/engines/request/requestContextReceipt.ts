import type {
  AssistantPromptPart,
  AssistantPromptPartName,
  AssistantRequestContextPlan,
  AssistantRequestToolingAudit
} from './requestAudit';
import type { AssistantRequestCachePlan } from './requestCachePlan';
import type { AssistantRequestContext } from './requestContext';
import type { AssistantRequestMemoryPlan } from './requestMemoryPlan';
import type { AssistantConversationSummaryPlan } from './requestConversationSummaryPlan';
import type { AssistantRequestSemanticRecallPlan } from './requestSemanticRecallPlan';
import { estimateAssistantMessageContentTokens, estimateTextTokens } from './requestTokenEstimation';

export type RequestContextReceiptIntent =
  | 'identity'
  | 'runtime_context'
  | 'task_context'
  | 'tool_capability'
  | 'app_context'
  | 'conversation_history'
  | 'memory'
  | 'conversation_summary'
  | 'semantic_recall'
  | 'tooling_schema';

export type RequestContextMaterialLane =
  | 'hard_rule'
  | 'persona_default'
  | 'active_task'
  | 'confirmed_memory'
  | 'conversation_summary'
  | 'retrieved_candidate'
  | 'quote_evidence'
  | 'reference_directory'
  | 'history_summary'
  | 'raw_tail'
  | 'tool_schema'
  | 'runtime_context'
  | 'app_context'
  | 'debug_evidence';

export type RequestContextMaterialAuthority =
  | 'hard_rule'
  | 'high'
  | 'medium'
  | 'candidate'
  | 'low'
  | 'debug_only';

export type RequestContextMaterialTopography = {
  lane: RequestContextMaterialLane;
  authority: RequestContextMaterialAuthority;
  sourceOwner:
    | 'prompt_layers'
    | 'memory_plan'
    | 'conversation_summary_plan'
    | 'semantic_recall_plan'
    | 'context_plan'
    | 'conversation_history'
    | 'tool_registry'
    | 'app_runtime'
    | 'debug_surface';
  expandability:
    | 'fixed'
    | 'compact_projection'
    | 'directory_then_tool_read'
    | 'summary_only'
    | 'raw_history'
    | 'schema'
    | 'debug_only';
  degradationPath: string;
  overlapKey: string;
};

export type RequestContextReceiptBlock = {
  id: string;
  label: string;
  intent: RequestContextReceiptIntent;
  source: 'prompt_part' | 'context_segment' | 'tool_schema';
  itemCount: number;
  charCount: number;
  estimatedTokens: number;
  fingerprint: string;
  cachePrefixEligible: boolean;
  sentToProvider: boolean;
  topography: RequestContextMaterialTopography;
  partNames?: AssistantPromptPartName[];
};

export type RequestContextReceiptTopographyEvidence = {
  id: string;
  label: string;
  source: 'conversation_message' | 'memory_line' | 'conversation_summary' | 'semantic_recall_candidate';
  sourceBlockIds: string[];
  sourceMessageIds: string[];
  sourceMemoryIndexes: number[];
  itemCount: number;
  charCount: number;
  estimatedTokens: number;
  sentToProvider: boolean;
  contentFingerprints: string[];
  topography: RequestContextMaterialTopography;
};

export type RequestContextReceiptTopographyEvidenceOverlap = {
  fingerprint: string;
  count: number;
  lanes: RequestContextMaterialLane[];
  evidenceIds: string[];
  labels: string[];
  sourceMessageIds: string[];
  sourceMemoryIndexes: number[];
};

export type RequestContextReceiptDuplicateInfo = {
  fingerprint: string;
  count: number;
  labels: string[];
  blockIds: string[];
  totalChars: number;
};

export type RequestContextReceiptTopographyOverlap = {
  overlapKey: string;
  count: number;
  lanes: RequestContextMaterialLane[];
  authorities: RequestContextMaterialAuthority[];
  sourceOwners: RequestContextMaterialTopography['sourceOwner'][];
  labels: string[];
  blockIds: string[];
  totalChars: number;
  estimatedTokens: number;
  exactDuplicateCount: number;
  cachePrefixEligibleCount: number;
  conversationReplayCount: number;
};

export type RequestContextReceiptShrinkPlanItem = {
  planId: string;
  overlapKey: string;
  strategy: 'exact_duplicate' | 'lane_compaction' | 'directory_pressure';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  keepBlockIds: string[];
  candidateDropBlockIds: string[];
  estimatedSavingsTokens: number;
  affectedLanes: RequestContextMaterialLane[];
  affectedLabels: string[];
};

export type RequestContextReceiptIntentLane = {
  intent: RequestContextReceiptIntent;
  blockCount: number;
  estimatedTokens: number;
  fingerprints: string[];
};

export type RequestContextReceipt = {
  schemaVersion: 1;
  fingerprints: {
    stablePrompt: string;
    dynamicContext: string;
    toolCapabilities: string;
    conversationTail: string;
    fullRequest: string;
  };
  cache: {
    applicationStatus: AssistantRequestCachePlan['requestApplication']['status'];
    sendsExplicitCacheControl: boolean;
    breakpoints: Array<{
      name: AssistantRequestCachePlan['breakpoints'][number]['name'];
      eligible: boolean;
      estimatedTokens: number;
      reason: AssistantRequestCachePlan['breakpoints'][number]['reason'];
      fingerprint: string;
    }>;
  };
  blocks: RequestContextReceiptBlock[];
  topographyEvidence: RequestContextReceiptTopographyEvidence[];
  topographyEvidenceOverlap: RequestContextReceiptTopographyEvidenceOverlap[];
  duplicateInfo: RequestContextReceiptDuplicateInfo[];
  topographyOverlap: RequestContextReceiptTopographyOverlap[];
  shrinkPlan: RequestContextReceiptShrinkPlanItem[];
  intentLanes: RequestContextReceiptIntentLane[];
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

export function fingerprintRequestContextValue(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function classifyPromptPartIntent(part: AssistantPromptPart): RequestContextReceiptIntent {
  if (part.layer === 'identity') return 'identity';
  if (
    part.name.startsWith('tool_')
    || part.name === 'workspace_write_capability'
    || part.name === 'task_handoff_capability'
    || part.name === 'reply_markup_capability'
    || part.name === 'document_capability'
    || part.name === 'qr_capability'
    || part.name === 'archive_capability'
    || part.name === 'theme_capability'
  ) {
    return 'tool_capability';
  }
  if (
    part.name === 'task_seed_context'
    || part.name === 'task_runtime_context'
    || part.name === 'work_runtime_context'
  ) {
    return 'task_context';
  }
  if (
    part.name === 'ui_context_capability'
    || part.name === 'attachment_context_capability'
    || part.name === 'room_context_capability'
    || part.name === 'theme_context_capability'
  ) {
    return 'app_context';
  }
  return 'runtime_context';
}

function promptPartTopography(part: AssistantPromptPart): RequestContextMaterialTopography {
  if (part.name === 'system_identity') {
    return {
      lane: 'hard_rule',
      authority: 'hard_rule',
      sourceOwner: 'prompt_layers',
      expandability: 'fixed',
      degradationPath: 'keep unless the prompt part itself is disabled',
      overlapKey: 'identity:hard-rule'
    };
  }

  if (part.name.startsWith('persona_custom_slot:')) {
    return {
      lane: 'persona_default',
      authority: 'high',
      sourceOwner: 'prompt_layers',
      expandability: 'fixed',
      degradationPath: 'preserve user-authored role prompt when possible',
      overlapKey: 'identity:' + part.name
    };
  }

  if (part.name.startsWith('persona_identity')) {
    return {
      lane: 'persona_default',
      authority: 'high',
      sourceOwner: 'prompt_layers',
      expandability: 'fixed',
      degradationPath: 'trim persona texture before hard identity',
      overlapKey: 'identity:persona-default'
    };
  }

  if (
    part.name === 'task_seed_context'
    || part.name === 'task_runtime_context'
    || part.name === 'work_runtime_context'
  ) {
    return {
      lane: 'active_task',
      authority: 'high',
      sourceOwner: 'context_plan',
      expandability: 'compact_projection',
      degradationPath: 'compact to current goal and next step before dropping',
      overlapKey: 'task:active-worksite'
    };
  }

  if (classifyPromptPartIntent(part) === 'tool_capability') {
    return {
      lane: 'tool_schema',
      authority: 'high',
      sourceOwner: 'tool_registry',
      expandability: 'schema',
      degradationPath: 'hide only when the user switch or app state removes the tool',
      overlapKey: 'tool:visible-capability'
    };
  }

  if (classifyPromptPartIntent(part) === 'app_context') {
    return {
      lane: 'app_context',
      authority: 'medium',
      sourceOwner: 'app_runtime',
      expandability: 'compact_projection',
      degradationPath: 'project current surface first, omit stale surfaces before raw tail',
      overlapKey: 'app:current-surface'
    };
  }

  return {
    lane: 'runtime_context',
    authority: 'medium',
    sourceOwner: 'app_runtime',
    expandability: 'compact_projection',
    degradationPath: 'drop before active task and latest raw tail when budget is tight',
    overlapKey: 'runtime:dynamic-facts'
  };
}

function buildPromptPartBlock(part: AssistantPromptPart): RequestContextReceiptBlock {
  return {
    id: `prompt:${part.name}`,
    label: part.label,
    intent: classifyPromptPartIntent(part),
    source: 'prompt_part',
    itemCount: 1,
    charCount: part.charCount,
    estimatedTokens: estimateTextTokens(part.content),
    fingerprint: fingerprintRequestContextValue(part.content),
    cachePrefixEligible: part.role === 'system' && (part.layer === 'identity' || part.layer === 'capability'),
    sentToProvider: part.enabled,
    topography: promptPartTopography(part),
    partNames: [part.name]
  };
}

function isReferenceDirectorySegment(segment: AssistantRequestContext['segments'][number]) {
  return segment.kind === 'system' && segment.messages.some((message) => (
    typeof message.content === 'string'
    && (
      message.content.includes('[工作区参考资料目录]')
      || message.content.includes('[长期资料目录]')
    )
  ));
}

function contextSegmentIntent(segment: AssistantRequestContext['segments'][number]): RequestContextReceiptIntent {
  const kind = segment.kind;
  if (kind === 'memory') return 'memory';
  if (kind === 'conversation_summary') return 'conversation_summary';
  if (kind === 'semantic_recall') return 'semantic_recall';
  if (isReferenceDirectorySegment(segment)) return 'app_context';
  if (kind === 'conversation' || kind === 'history_summary') return 'conversation_history';
  return 'runtime_context';
}

function contextSegmentTopography(segment: AssistantRequestContext['segments'][number]): RequestContextMaterialTopography {
  if (segment.kind === 'memory') {
    return {
      lane: 'confirmed_memory',
      authority: 'medium',
      sourceOwner: 'memory_plan',
      expandability: 'directory_then_tool_read',
      degradationPath: 'keep selected confirmed lines, leave long documents as read-tool directories',
      overlapKey: 'memory:confirmed'
    };
  }

  if (segment.kind === 'semantic_recall') {
    return {
      lane: 'retrieved_candidate',
      authority: 'candidate',
      sourceOwner: 'semantic_recall_plan',
      expandability: 'compact_projection',
      degradationPath: 'drop retrieved candidates before confirmed memory, active task, or latest raw tail',
      overlapKey: 'memory:retrieved-candidate'
    };
  }

  if (segment.kind === 'conversation_summary') {
    return {
      lane: 'conversation_summary',
      authority: 'medium',
      sourceOwner: 'conversation_summary_plan',
      expandability: 'summary_only',
      degradationPath: 'drop stale conversation summaries before confirmed memory and raw tail',
      overlapKey: 'memory:conversation-summary'
    };
  }

  if (isReferenceDirectorySegment(segment)) {
    return {
      lane: 'reference_directory',
      authority: 'medium',
      sourceOwner: 'app_runtime',
      expandability: 'directory_then_tool_read',
      degradationPath: 'keep directory entries only, read bodies through tools when needed',
      overlapKey: 'reference:directory'
    };
  }

  if (segment.kind === 'history_summary') {
    return {
      lane: 'history_summary',
      authority: 'low',
      sourceOwner: 'context_plan',
      expandability: 'summary_only',
      degradationPath: 'omit older summaries before current raw conversation',
      overlapKey: 'history:summary'
    };
  }

  if (segment.kind === 'conversation') {
    return {
      lane: 'raw_tail',
      authority: 'high',
      sourceOwner: 'conversation_history',
      expandability: 'raw_history',
      degradationPath: 'protect latest user turn, then degrade older semantic units by history mode',
      overlapKey: 'history:raw-tail'
    };
  }

  return {
    lane: 'runtime_context',
    authority: 'medium',
    sourceOwner: 'app_runtime',
    expandability: 'compact_projection',
    degradationPath: 'drop before active task and latest raw tail when budget is tight',
    overlapKey: 'runtime:dynamic-facts'
  };
}

function isCachePrefixEligibleContextSegment(segment: AssistantRequestContext['segments'][number]) {
  return segment.messages.length > 0 && segment.messages.every((message) => message.cachePrefixEligible === true);
}

function buildContextSegmentBlocks(context: AssistantRequestContext): RequestContextReceiptBlock[] {
  return context.segments.filter((segment) => segment.kind !== 'system' || isReferenceDirectorySegment(segment)).map((segment, index) => {
    const contentFingerprint = fingerprintRequestContextValue(segment.messages.map((message) => ({
      role: message.role,
      content: message.content,
      toolCallNames: message.toolCalls?.map((toolCall) => toolCall.name) ?? [],
      toolResultName: message.toolResult?.toolName ?? null,
      toolResultStatus: message.toolResult?.status ?? null
    })));

    return {
      id: `segment:${index}:${segment.kind}`,
      label: isReferenceDirectorySegment(segment) ? 'reference directory' : segment.kind,
      intent: contextSegmentIntent(segment),
      source: 'context_segment',
      itemCount: segment.messages.length,
      charCount: segment.messages.reduce((total, message) => {
        if (typeof message.content === 'string') return total + message.content.length;
        return total + message.content.reduce((partTotal, part) => (
          part.type === 'text' ? partTotal + part.text.length : partTotal
        ), 0);
      }, 0),
      estimatedTokens: segment.messages.reduce(
        (total, message) => total + estimateAssistantMessageContentTokens(message.content),
        0
      ),
      fingerprint: contentFingerprint,
      cachePrefixEligible: isCachePrefixEligibleContextSegment(segment),
      sentToProvider: true,
      topography: contextSegmentTopography(segment)
    };
  });
}

function messageContentCharCount(content: AssistantRequestContext['segments'][number]['messages'][number]['content']) {
  if (typeof content === 'string') return content.length;
  return content.reduce((total, part) => (
    part.type === 'text' ? total + part.text.length : total
  ), 0);
}

function extractEvidenceText(content: AssistantRequestContext['segments'][number]['messages'][number]['content']) {
  if (typeof content === 'string') return content.trim();
  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function normalizeEvidenceFingerprintText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function fingerprintEvidenceText(text: string) {
  return fingerprintRequestContextValue({
    kind: 'context-topography-evidence',
    text: normalizeEvidenceFingerprintText(text)
  });
}

function isQuoteEvidenceMessage(message: AssistantRequestContext['segments'][number]['messages'][number]) {
  if (message.role !== 'user') return false;
  if (typeof message.content === 'string') {
    const trimmed = message.content.trim();
    return Boolean(trimmed) && !trimmed.startsWith('[tool_result:');
  }
  return message.content.some((part) => part.type === 'text' && part.text.trim());
}

function collectTopographyEvidence(params: {
  context: AssistantRequestContext;
  contextPlan: AssistantRequestContextPlan;
  memoryPlan: AssistantRequestMemoryPlan;
  conversationSummaryPlan: AssistantConversationSummaryPlan;
  semanticRecallPlan: AssistantRequestSemanticRecallPlan;
}): RequestContextReceiptTopographyEvidence[] {
  const { context, contextPlan, memoryPlan, conversationSummaryPlan, semanticRecallPlan } = params;
  const keptUserMessageIds = contextPlan.entries
    .filter((entry) => entry.role === 'user' && entry.status === 'kept')
    .map((entry) => entry.messageId);
  let quoteIndex = 0;
  const quoteEvidence = context.segments.flatMap((segment, index) => {
    if (segment.kind !== 'conversation') return [];
    const sourceBlockId = `segment:${index}:${segment.kind}`;
    return segment.messages
      .filter(isQuoteEvidenceMessage)
      .map((message) => {
        const evidenceText = extractEvidenceText(message.content);
        const sourceMessageId = keptUserMessageIds[quoteIndex];
        quoteIndex += 1;
        return {
          sourceBlockId,
          sourceMessageId,
          fingerprint: fingerprintEvidenceText(evidenceText),
          charCount: messageContentCharCount(message.content),
          estimatedTokens: estimateAssistantMessageContentTokens(message.content)
        };
      });
  });
  const semanticRecallSourceBlockIds = context.segments
    .map((segment, index) => ({ segment, index }))
    .filter((entry) => entry.segment.kind === 'semantic_recall')
    .map((entry) => `segment:${entry.index}:${entry.segment.kind}`);
  const conversationSummarySourceBlockIds = context.segments
    .map((segment, index) => ({ segment, index }))
    .filter((entry) => entry.segment.kind === 'conversation_summary')
    .map((entry) => `segment:${entry.index}:${entry.segment.kind}`);

  const evidence: RequestContextReceiptTopographyEvidence[] = [];

  if (quoteEvidence.length) {
    evidence.push({
      id: 'evidence:quote:user-raw-tail',
      label: 'user quote evidence',
      source: 'conversation_message',
      sourceBlockIds: uniqueValues(quoteEvidence.map((entry) => entry.sourceBlockId)),
      sourceMessageIds: uniqueValues(quoteEvidence.map((entry) => entry.sourceMessageId).filter((id): id is string => Boolean(id))),
      sourceMemoryIndexes: [],
      itemCount: quoteEvidence.length,
      charCount: quoteEvidence.reduce((total, entry) => total + entry.charCount, 0),
      estimatedTokens: quoteEvidence.reduce((total, entry) => total + entry.estimatedTokens, 0),
      sentToProvider: true,
      contentFingerprints: uniqueValues(quoteEvidence.map((entry) => entry.fingerprint)),
      topography: {
        lane: 'quote_evidence',
        authority: 'medium',
        sourceOwner: 'conversation_history',
        expandability: 'raw_history',
        degradationPath: 'derive from kept user raw tail; never duplicate into confirmed memory or history summaries',
        overlapKey: 'quote:user-raw-tail'
      }
    });
  }

  if (memoryPlan.selectedLines.length) {
    evidence.push({
      id: 'evidence:memory:confirmed-lines',
      label: 'confirmed memory evidence',
      source: 'memory_line',
      sourceBlockIds: [],
      sourceMessageIds: [],
      sourceMemoryIndexes: memoryPlan.selectedLines.map((_, index) => index),
      itemCount: memoryPlan.selectedLines.length,
      charCount: memoryPlan.selectedLines.reduce((total, line) => total + line.length, 0),
      estimatedTokens: memoryPlan.selectedLines.reduce((total, line) => total + estimateTextTokens(line), 0),
      sentToProvider: memoryPlan.selectedLines.length > 0,
      contentFingerprints: uniqueValues(memoryPlan.selectedLines.map(fingerprintEvidenceText)),
      topography: {
        lane: 'confirmed_memory',
        authority: 'medium',
        sourceOwner: 'memory_plan',
        expandability: 'compact_projection',
        degradationPath: 'keep only selected confirmed lines; do not repeat quote evidence from raw tail',
        overlapKey: 'memory:confirmed-lines'
      }
    });
  }

  if (conversationSummaryPlan.selectedSummaries.length) {
    const keptSummaries = conversationSummaryPlan.selectedSummaries.filter((summary) => summary.status === 'kept');
    evidence.push({
      id: 'evidence:conversation-summary:entries',
      label: 'conversation summary entries',
      source: 'conversation_summary',
      sourceBlockIds: conversationSummarySourceBlockIds,
      sourceMessageIds: uniqueValues(keptSummaries.flatMap((summary) => summary.sourceMessageIds)),
      sourceMemoryIndexes: [],
      itemCount: keptSummaries.length,
      charCount: keptSummaries.reduce((total, summary) => total + summary.charCount, 0),
      estimatedTokens: keptSummaries.reduce((total, summary) => total + summary.estimatedTokens, 0),
      sentToProvider: keptSummaries.length > 0 && conversationSummarySourceBlockIds.length > 0,
      contentFingerprints: uniqueValues(keptSummaries.map((summary) => summary.contentFingerprint)),
      topography: {
        lane: 'conversation_summary',
        authority: 'medium',
        sourceOwner: 'conversation_summary_plan',
        expandability: 'summary_only',
        degradationPath: 'drop stale conversation summaries before confirmed memory and raw tail',
        overlapKey: 'memory:conversation-summary'
      }
    });
  }

  if (semanticRecallPlan.selectedCandidates.length) {
    const keptCandidates = semanticRecallPlan.selectedCandidates.filter((candidate) => candidate.status === 'kept');
    evidence.push({
      id: 'evidence:semantic-recall:candidates',
      label: 'semantic recall candidates',
      source: 'semantic_recall_candidate',
      sourceBlockIds: semanticRecallSourceBlockIds,
      sourceMessageIds: uniqueValues(keptCandidates.flatMap((candidate) => candidate.sourceMessageIds)),
      sourceMemoryIndexes: [],
      itemCount: keptCandidates.length,
      charCount: keptCandidates.reduce((total, candidate) => total + candidate.charCount, 0),
      estimatedTokens: keptCandidates.reduce((total, candidate) => total + candidate.estimatedTokens, 0),
      sentToProvider: keptCandidates.length > 0 && semanticRecallSourceBlockIds.length > 0,
      contentFingerprints: uniqueValues(keptCandidates.map((candidate) => candidate.contentFingerprint)),
      topography: {
        lane: 'retrieved_candidate',
        authority: 'candidate',
        sourceOwner: 'semantic_recall_plan',
        expandability: 'compact_projection',
        degradationPath: 'drop retrieved candidates before confirmed memory, active task, or latest raw tail',
        overlapKey: 'memory:retrieved-candidate'
      }
    });
  }

  return evidence;
}

function collectTopographyEvidenceOverlap(
  evidence: RequestContextReceiptTopographyEvidence[]
): RequestContextReceiptTopographyEvidenceOverlap[] {
  const groups = new Map<string, RequestContextReceiptTopographyEvidence[]>();

  for (const entry of evidence) {
    if (!entry.sentToProvider) continue;
    for (const fingerprint of entry.contentFingerprints) {
      groups.set(fingerprint, [...(groups.get(fingerprint) ?? []), entry]);
    }
  }

  return [...groups.entries()]
    .filter(([, matchingEntries]) => uniqueValues(matchingEntries.map((entry) => entry.topography.lane)).length > 1)
    .map(([fingerprint, matchingEntries]) => ({
      fingerprint,
      count: matchingEntries.length,
      lanes: uniqueValues(matchingEntries.map((entry) => entry.topography.lane)),
      evidenceIds: matchingEntries.map((entry) => entry.id),
      labels: matchingEntries.map((entry) => entry.label),
      sourceMessageIds: uniqueValues(matchingEntries.flatMap((entry) => entry.sourceMessageIds)),
      sourceMemoryIndexes: uniqueValues(matchingEntries.flatMap((entry) => entry.sourceMemoryIndexes))
    }));
}

function buildToolingBlock(
  tooling: AssistantRequestToolingAudit,
  context: AssistantRequestContext
): RequestContextReceiptBlock {
  const nativeToolSchemas = context.tools ?? [];
  const serializedToolSchema = nativeToolSchemas.length
    ? stableStringify(nativeToolSchemas)
    : tooling.toolNames.join('\n');
  const toolSchemaValue = {
    toolChoice: tooling.toolChoice,
    tools: nativeToolSchemas.length
      ? nativeToolSchemas.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters
        }))
      : tooling.toolNames
  };

  return {
    id: 'tooling:schema',
    label: 'native tool schemas',
    intent: 'tooling_schema',
    source: 'tool_schema',
    itemCount: tooling.toolCount,
    charCount: serializedToolSchema.length,
    estimatedTokens: estimateTextTokens(serializedToolSchema),
    fingerprint: fingerprintRequestContextValue(toolSchemaValue),
    cachePrefixEligible: false,
    sentToProvider: tooling.toolCount > 0,
    topography: {
      lane: 'tool_schema',
      authority: 'high',
      sourceOwner: 'tool_registry',
      expandability: 'schema',
      degradationPath: 'hide only when user switch, app state, or provider capability removes native tools',
      overlapKey: 'tool:native-schema'
    }
  };
}

function collectDuplicateInfo(blocks: RequestContextReceiptBlock[]): RequestContextReceiptDuplicateInfo[] {
  const groups = new Map<string, RequestContextReceiptBlock[]>();

  for (const block of blocks) {
    if (!block.sentToProvider || block.charCount === 0) continue;
    groups.set(block.fingerprint, [...(groups.get(block.fingerprint) ?? []), block]);
  }

  return [...groups.entries()]
    .filter(([, matchingBlocks]) => matchingBlocks.length > 1)
    .map(([fingerprint, matchingBlocks]) => ({
      fingerprint,
      count: matchingBlocks.length,
      labels: matchingBlocks.map((block) => block.label),
      blockIds: matchingBlocks.map((block) => block.id),
      totalChars: matchingBlocks.reduce((total, block) => total + block.charCount, 0)
    }));
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function collectTopographyOverlap(blocks: RequestContextReceiptBlock[]): RequestContextReceiptTopographyOverlap[] {
  const groups = new Map<string, RequestContextReceiptBlock[]>();

  for (const block of blocks) {
    if (!block.sentToProvider || block.charCount === 0) continue;
    groups.set(block.topography.overlapKey, [...(groups.get(block.topography.overlapKey) ?? []), block]);
  }

  return [...groups.entries()]
    .filter(([, matchingBlocks]) => matchingBlocks.length > 1)
    .map(([overlapKey, matchingBlocks]) => {
      const fingerprints = matchingBlocks.map((block) => block.fingerprint);
      return {
        overlapKey,
        count: matchingBlocks.length,
        lanes: uniqueValues(matchingBlocks.map((block) => block.topography.lane)),
        authorities: uniqueValues(matchingBlocks.map((block) => block.topography.authority)),
        sourceOwners: uniqueValues(matchingBlocks.map((block) => block.topography.sourceOwner)),
        labels: matchingBlocks.map((block) => block.label),
        blockIds: matchingBlocks.map((block) => block.id),
        totalChars: matchingBlocks.reduce((total, block) => total + block.charCount, 0),
        estimatedTokens: matchingBlocks.reduce((total, block) => total + block.estimatedTokens, 0),
        exactDuplicateCount: matchingBlocks.length - new Set(fingerprints).size,
        cachePrefixEligibleCount: matchingBlocks.filter((block) => block.cachePrefixEligible).length,
        conversationReplayCount: matchingBlocks.filter((block) => block.intent === 'conversation_history').length
      };
    });
}

function blockAuthorityRank(block: RequestContextReceiptBlock) {
  const authorityRank: Record<RequestContextMaterialAuthority, number> = {
    debug_only: 0,
    low: 1,
    candidate: 2,
    medium: 3,
    high: 4,
    hard_rule: 5
  };
  return authorityRank[block.topography.authority];
}

function chooseShrinkKeepBlock(blocks: RequestContextReceiptBlock[]) {
  return [...blocks].sort((left, right) => {
    const authorityDelta = blockAuthorityRank(right) - blockAuthorityRank(left);
    if (authorityDelta !== 0) return authorityDelta;
    if (left.cachePrefixEligible !== right.cachePrefixEligible) return left.cachePrefixEligible ? -1 : 1;
    return right.estimatedTokens - left.estimatedTokens;
  })[0] ?? null;
}

function estimateExactDuplicateSavings(blocks: RequestContextReceiptBlock[]) {
  const byFingerprint = new Map<string, RequestContextReceiptBlock[]>();
  for (const block of blocks) {
    byFingerprint.set(block.fingerprint, [...(byFingerprint.get(block.fingerprint) ?? []), block]);
  }

  return [...byFingerprint.values()].reduce((total, matchingBlocks) => {
    if (matchingBlocks.length < 2) return total;
    const keepBlock = chooseShrinkKeepBlock(matchingBlocks);
    return total + matchingBlocks
      .filter((block) => block.id !== keepBlock?.id)
      .reduce((subtotal, block) => subtotal + block.estimatedTokens, 0);
  }, 0);
}

function collectShrinkPlan(blocks: RequestContextReceiptBlock[]): RequestContextReceiptShrinkPlanItem[] {
  const groups = new Map<string, RequestContextReceiptBlock[]>();
  for (const block of blocks) {
    if (!block.sentToProvider || block.charCount === 0) continue;
    groups.set(block.topography.overlapKey, [...(groups.get(block.topography.overlapKey) ?? []), block]);
  }

  return [...groups.entries()]
    .flatMap(([overlapKey, matchingBlocks]): RequestContextReceiptShrinkPlanItem[] => {
      if (matchingBlocks.length < 2) return [];
      const keepBlock = chooseShrinkKeepBlock(matchingBlocks);
      if (!keepBlock) return [];

      const affectedLanes = uniqueValues(matchingBlocks.map((block) => block.topography.lane));
      const affectedLabels = matchingBlocks.map((block) => block.label);
      const exactSavings = estimateExactDuplicateSavings(matchingBlocks);
      const candidateDropBlockIds = matchingBlocks
        .filter((block) => block.id !== keepBlock.id)
        .map((block) => block.id);

      if (exactSavings > 0) {
        return [{
          planId: `shrink:${overlapKey}:exact`,
          overlapKey,
          strategy: 'exact_duplicate',
          confidence: 'high',
          reason: '同一职责车道里存在完全相同的请求材料；后续真实压缩可以优先保留权重最高的一份。',
          keepBlockIds: [keepBlock.id],
          candidateDropBlockIds,
          estimatedSavingsTokens: exactSavings,
          affectedLanes,
          affectedLabels
        }];
      }

      if (affectedLanes.includes('reference_directory')) {
        return [{
          planId: `shrink:${overlapKey}:directory`,
          overlapKey,
          strategy: 'directory_pressure',
          confidence: 'low',
          reason: '参考资料目录出现多块同职责材料；当前只建议观察目录压力，不应先删除正文或 raw tail。',
          keepBlockIds: [keepBlock.id],
          candidateDropBlockIds,
          estimatedSavingsTokens: 0,
          affectedLanes,
          affectedLabels
        }];
      }

      const conservativeSavings = Math.max(0, Math.floor(
        matchingBlocks
          .filter((block) => block.id !== keepBlock.id)
          .reduce((total, block) => total + block.estimatedTokens, 0) * 0.2
      ));
      if (conservativeSavings <= 0) return [];

      return [{
        planId: `shrink:${overlapKey}:compact`,
        overlapKey,
        strategy: 'lane_compaction',
        confidence: 'low',
        reason: '同一职责车道有多块非完全重复材料；只能作为后续人工审计或语义压缩候选，不能自动删除。',
        keepBlockIds: [keepBlock.id],
        candidateDropBlockIds,
        estimatedSavingsTokens: conservativeSavings,
        affectedLanes,
        affectedLabels
      }];
    })
    .sort((left, right) => {
      const confidenceRank = { high: 3, medium: 2, low: 1 };
      const confidenceDelta = confidenceRank[right.confidence] - confidenceRank[left.confidence];
      if (confidenceDelta !== 0) return confidenceDelta;
      return right.estimatedSavingsTokens - left.estimatedSavingsTokens;
    });
}

function collectIntentLanes(blocks: RequestContextReceiptBlock[]): RequestContextReceiptIntentLane[] {
  const lanes = new Map<RequestContextReceiptIntent, RequestContextReceiptBlock[]>();

  for (const block of blocks) {
    if (!block.sentToProvider) continue;
    lanes.set(block.intent, [...(lanes.get(block.intent) ?? []), block]);
  }

  return [...lanes.entries()].map(([intent, intentBlocks]) => ({
    intent,
    blockCount: intentBlocks.length,
    estimatedTokens: intentBlocks.reduce((total, block) => total + block.estimatedTokens, 0),
    fingerprints: [...new Set(intentBlocks.map((block) => block.fingerprint))]
  }));
}

function fingerprintBlocks(blocks: RequestContextReceiptBlock[], intent: RequestContextReceiptIntent | RequestContextReceiptIntent[]) {
  const intents = Array.isArray(intent) ? intent : [intent];
  return fingerprintRequestContextValue(
    blocks
      .filter((block) => block.sentToProvider && intents.includes(block.intent))
      .map((block) => ({
        id: block.id,
        fingerprint: block.fingerprint
      }))
  );
}

export function buildRequestContextReceipt(args: {
  selectedPromptParts: AssistantPromptPart[];
  context: AssistantRequestContext;
  contextPlan: AssistantRequestContextPlan;
  memoryPlan: AssistantRequestMemoryPlan;
  conversationSummaryPlan: AssistantConversationSummaryPlan;
  semanticRecallPlan: AssistantRequestSemanticRecallPlan;
  cachePlan: AssistantRequestCachePlan;
  tooling: AssistantRequestToolingAudit;
}): RequestContextReceipt {
  const promptBlocks = args.selectedPromptParts.map(buildPromptPartBlock);
  const contextBlocks = buildContextSegmentBlocks(args.context);
  const toolingBlock = buildToolingBlock(args.tooling, args.context);
  const blocks = [...promptBlocks, ...contextBlocks, toolingBlock];
  const topographyEvidence = collectTopographyEvidence({
    context: args.context,
    contextPlan: args.contextPlan,
    memoryPlan: args.memoryPlan,
    conversationSummaryPlan: args.conversationSummaryPlan,
    semanticRecallPlan: args.semanticRecallPlan
  });
  const topographyOverlap = collectTopographyOverlap(blocks);
  const latestKeptConversationUnit = [...args.contextPlan.units]
    .reverse()
    .find((unit) => unit.status === 'kept' && unit.kind !== 'orphaned_tool_result');

  return {
    schemaVersion: 1,
    fingerprints: {
      stablePrompt: fingerprintBlocks(blocks, 'identity'),
      dynamicContext: fingerprintBlocks(blocks, ['runtime_context', 'task_context', 'app_context', 'memory', 'conversation_summary']),
      toolCapabilities: fingerprintBlocks(blocks, ['tool_capability', 'tooling_schema']),
      conversationTail: fingerprintRequestContextValue(latestKeptConversationUnit?.messageIds ?? []),
      fullRequest: fingerprintRequestContextValue(blocks.map((block) => ({
        id: block.id,
        sentToProvider: block.sentToProvider,
        fingerprint: block.fingerprint
      })))
    },
    cache: {
      applicationStatus: args.cachePlan.requestApplication.status,
      sendsExplicitCacheControl: args.cachePlan.requestApplication.sendsExplicitCacheControl,
      breakpoints: args.cachePlan.breakpoints.map((breakpoint) => ({
        name: breakpoint.name,
        eligible: breakpoint.eligible,
        estimatedTokens: breakpoint.estimatedTokens,
        ttl: breakpoint.ttl,
        reason: breakpoint.reason,
        fingerprint: fingerprintRequestContextValue({
          name: breakpoint.name,
          partNames: breakpoint.partNames,
          estimatedTokens: breakpoint.estimatedTokens
        })
      }))
    },
    blocks,
    topographyEvidence,
    topographyEvidenceOverlap: collectTopographyEvidenceOverlap(topographyEvidence),
    duplicateInfo: collectDuplicateInfo(blocks),
    topographyOverlap,
    shrinkPlan: collectShrinkPlan(blocks),
    intentLanes: collectIntentLanes(blocks)
  };
}
