import type { ChatMessage, Conversation } from '../../types/domain';
import {
  buildMemoryRecallCorpusAnchorStats,
  extractMemoryRecallAnchors,
  type MemoryRecallAnchor,
  type MemoryRecallCorpusAnchorStats
} from '../memoryRecallAnchors';
import { isNaturalMemorySourceMessage } from '../memoryNaturalSourceMessage';
import { tokenizeMemoryRecallTerms } from '../memoryRecallTerms';
import { fingerprintRequestContextValue } from './requestContextReceipt';
import { estimateTextTokens } from './requestTokenEstimation';

export type AssistantSemanticRecallCandidateKind =
  | 'recent_tail'
  | 'matched_context'
  | 'voice_anchor'
  | 'vector_match';

export type AssistantSemanticRecallCandidateDecision = {
  id: string;
  kind: AssistantSemanticRecallCandidateKind;
  label: string;
  sourceConversationId: string | null;
  sourceMessageIds: string[];
  memoryChunkKind?: 'source_message' | 'user_intent' | 'dialogue_turn';
  estimatedTokens: number;
  charCount: number;
  score: number | null;
  contentFingerprint: string;
  status: 'kept' | 'dropped_budget';
};

export type AssistantRequestSemanticRecallPlan = {
  status: 'disabled' | 'not_configured' | 'empty' | 'within_budget' | 'trimmed_budget';
  strategy: 'none' | 'local_scan' | 'semantic_index';
  config: AssistantSemanticRecallConfig;
  selectedCandidates: AssistantSemanticRecallCandidateDecision[];
  estimatedTokens: number;
  maxTokens: number | null;
  entries: AssistantSemanticRecallCandidateDecision[];
};

export type AssistantSemanticRecallContextCandidate = Pick<
  AssistantSemanticRecallCandidateDecision,
  'id' | 'kind' | 'label' | 'sourceConversationId' | 'sourceMessageIds' | 'score'
> & {
  sourceTimestamp?: number;
  text: string;
};

export type AssistantSemanticRecallConfig = {
  recentTailConversationCount: number;
  recentTailUserMessageCount: number;
  voiceAnchorCount: number;
};

export type AssistantSemanticRecallConversation = Pick<
  Conversation,
  'id' | 'title' | 'collaboratorId' | 'updatedAt' | 'messages'
>;

export const DEFAULT_SEMANTIC_RECALL_CONFIG: AssistantSemanticRecallConfig = {
  recentTailConversationCount: 3,
  recentTailUserMessageCount: 3,
  voiceAnchorCount: 3
};

export const DEFAULT_SEMANTIC_RECALL_REQUEST_MAX_CANDIDATES = 3;

const VOICE_ANCHOR_TARGET_CHARS = 120;
const VOICE_ANCHOR_PREFERRED_MIN_CHARS = 60;
const VOICE_ANCHOR_PREFERRED_MAX_CHARS = 180;
const VOICE_ANCHOR_FALLBACK_MAX_CHARS = 280;

function resolveRecallCount(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

export function resolveSemanticRecallConfig(
  config?: Partial<AssistantSemanticRecallConfig>
): AssistantSemanticRecallConfig {
  return {
    recentTailConversationCount: resolveRecallCount(
      config?.recentTailConversationCount,
      DEFAULT_SEMANTIC_RECALL_CONFIG.recentTailConversationCount
    ),
    recentTailUserMessageCount: resolveRecallCount(
      config?.recentTailUserMessageCount,
      DEFAULT_SEMANTIC_RECALL_CONFIG.recentTailUserMessageCount
    ),
    voiceAnchorCount: resolveRecallCount(
      config?.voiceAnchorCount,
      DEFAULT_SEMANTIC_RECALL_CONFIG.voiceAnchorCount
    )
  };
}

function emptyPlan(
  status: AssistantRequestSemanticRecallPlan['status'],
  strategy: AssistantRequestSemanticRecallPlan['strategy'],
  maxTokens: number | null,
  config: AssistantSemanticRecallConfig = DEFAULT_SEMANTIC_RECALL_CONFIG
): AssistantRequestSemanticRecallPlan {
  return {
    status,
    strategy,
    config,
    selectedCandidates: [],
    estimatedTokens: 0,
    maxTokens,
    entries: []
  };
}

function latestUserText(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';
}

function normalizeRecallTerms(text: string): string[] {
  return tokenizeMemoryRecallTerms(text);
}

function scoreTextOverlap(params: {
  queryTerms: Set<string>;
  queryAnchors: MemoryRecallAnchor[];
  corpusStats: MemoryRecallCorpusAnchorStats;
  text: string;
}) {
  const { queryTerms, queryAnchors, corpusStats, text } = params;
  if (!queryTerms.size) return 0;
  const candidateTerms = new Set(normalizeRecallTerms(text));
  if (!candidateTerms.size) return 0;

  let overlap = 0;
  for (const term of queryTerms) {
    if (candidateTerms.has(term)) overlap += 1;
  }

  let anchorScore = 0;
  const candidateAnchors = new Set(
    extractMemoryRecallAnchors(text, corpusStats).map((anchor) => anchor.term)
  );
  for (const anchor of queryAnchors) {
    if (candidateTerms.has(anchor.term) || candidateAnchors.has(anchor.term)) {
      anchorScore += anchor.weight;
    }
  }

  if (overlap === 0 && anchorScore === 0) return 0;
  const overlapScore = overlap / Math.sqrt(queryTerms.size * candidateTerms.size);
  return anchorScore + overlapScore;
}

function formatCandidateLabel(conversation: AssistantSemanticRecallConversation) {
  return conversation.title.trim() || '未命名对话';
}

function formatDialogueRole(role: ChatMessage['role']) {
  if (role === 'assistant') return 'assistant';
  if (role === 'system') return 'system';
  return 'user';
}

function formatCandidateText(messages: ChatMessage[]) {
  const normalized = messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }))
    .filter((message) => message.content);
  if (normalized.length === 1 && normalized[0]?.role === 'user') {
    return normalized[0].content;
  }
  return normalized.map((message) => `${formatDialogueRole(message.role)}: ${message.content}`).join('\n\n');
}

function buildCandidate(params: {
  kind: AssistantSemanticRecallCandidateKind;
  conversation: AssistantSemanticRecallConversation;
  messages: ChatMessage[];
  score: number | null;
}): AssistantSemanticRecallCandidateDecision {
  const text = formatCandidateText(params.messages);
  const sourceMessageIds = params.messages.map((message) => message.id);
  const lastMessage = params.messages[params.messages.length - 1];
  return {
    id: `recall:${params.kind}:${params.conversation.id}:${sourceMessageIds.join('+')}`,
    kind: params.kind,
    label: lastMessage ? formatCandidateLabel(params.conversation) : params.conversation.title.trim() || '未命名对话',
    sourceConversationId: params.conversation.id,
    sourceMessageIds,
    estimatedTokens: estimateTextTokens(text),
    charCount: text.length,
    score: params.score,
    contentFingerprint: fingerprintRequestContextValue({
      kind: 'context-topography-evidence',
      text: text.replace(/\s+/g, ' ')
    }),
    status: 'kept'
  };
}

function latestMessageTimestamp(conversation: AssistantSemanticRecallConversation) {
  const latestMessage = [...conversation.messages]
    .filter((message) => Number.isFinite(message.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp)[0];
  return latestMessage?.timestamp ?? conversation.updatedAt ?? 0;
}

function isNaturalTailMessage(message: ChatMessage) {
  return isNaturalMemorySourceMessage(message);
}

function userMessages(conversation: AssistantSemanticRecallConversation) {
  return conversation.messages.filter((message) => message.role === 'user' && isNaturalMemorySourceMessage(message));
}

function looksLikePastedOrMachineText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 3) return true;
  if (/```|https?:\/\/|www\.|candidateId|messageIds|summaryId|sourceConversationIds|sourceMessageIds/i.test(text)) {
    return true;
  }
  if (/^\s*[\[{]/.test(text) && /[\]}]\s*$/.test(text)) return true;
  if (/<\|(?:system|user|assistant)\|>/i.test(text)) return true;
  if ((text.match(/[A-Za-z0-9_./:@-]{40,}/g) ?? []).length > 0) return true;

  const bulletLikeLines = lines.filter((line) => /^[-*•]|\d+[.)]\s/.test(line)).length;
  return bulletLikeLines >= 2;
}

function scoreVoiceAnchorMessage(message: ChatMessage) {
  const text = message.content.trim();
  if (!text || text.length > VOICE_ANCHOR_FALLBACK_MAX_CHARS) return null;
  if (looksLikePastedOrMachineText(text)) return null;

  const rangePenalty = text.length >= VOICE_ANCHOR_PREFERRED_MIN_CHARS && text.length <= VOICE_ANCHOR_PREFERRED_MAX_CHARS
    ? 0
    : 100 + Math.min(
        Math.abs(text.length - VOICE_ANCHOR_PREFERRED_MIN_CHARS),
        Math.abs(text.length - VOICE_ANCHOR_PREFERRED_MAX_CHARS)
      );
  return rangePenalty + Math.abs(text.length - VOICE_ANCHOR_TARGET_CHARS) / 10;
}

function latestDialogueTail(conversation: AssistantSemanticRecallConversation, config: AssistantSemanticRecallConfig) {
  const messages = conversation.messages.filter(isNaturalTailMessage);
  let latestUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      latestUserIndex = index;
      break;
    }
  }
  if (latestUserIndex < 0) return [];
  const recentUserMessages = messages
    .slice(0, latestUserIndex + 1)
    .filter((message) => message.role === 'user')
    .slice(-config.recentTailUserMessageCount);
  let finalAssistantReply: ChatMessage | null = null;
  for (let index = latestUserIndex + 1; index < messages.length; index += 1) {
    const message = messages[index];
    if (message?.role === 'assistant') {
      finalAssistantReply = message;
    }
  }
  return finalAssistantReply ? [...recentUserMessages, finalAssistantReply] : recentUserMessages;
}

function sameCollaboratorScope(params: {
  currentCollaboratorId?: string | null;
  conversationCollaboratorId: string | null;
}) {
  if (!params.currentCollaboratorId) return true;
  return params.conversationCollaboratorId === params.currentCollaboratorId;
}

function dedupeCandidates(candidates: AssistantSemanticRecallCandidateDecision[]) {
  const seen = new Set<string>();
  const seenMessageKeys = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.sourceConversationId ?? 'unknown'}:${candidate.sourceMessageIds.join('|')}`;
    if (seen.has(key)) return false;
    const messageKeys = candidate.sourceMessageIds.map((messageId) =>
      `${candidate.sourceConversationId ?? 'unknown'}:${messageId}`
    );
    if (messageKeys.some((messageKey) => seenMessageKeys.has(messageKey))) return false;
    seen.add(key);
    for (const messageKey of messageKeys) {
      seenMessageKeys.add(messageKey);
    }
    return true;
  });
}

function implicitCandidatePriority(kind: AssistantSemanticRecallCandidateKind) {
  switch (kind) {
    case 'matched_context':
      return 0;
    case 'vector_match':
      return 1;
    case 'recent_tail':
      return 2;
    case 'voice_anchor':
      return 3;
  }
}

function compareImplicitCandidates(
  left: AssistantSemanticRecallCandidateDecision,
  right: AssistantSemanticRecallCandidateDecision
) {
  const priorityDelta = implicitCandidatePriority(left.kind) - implicitCandidatePriority(right.kind);
  if (priorityDelta !== 0) return priorityDelta;
  const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
  if (scoreDelta !== 0) return scoreDelta;
  return right.id.localeCompare(left.id);
}

export function resolveRequestSemanticRecallPlan(args?: {
  enabled?: boolean;
  messages: ChatMessage[];
  conversations: AssistantSemanticRecallConversation[];
  activeConversationId: string | null;
  currentCollaboratorId?: string | null;
  maxTokens: number | null;
  maxCandidates?: number | null;
  /** Let the one-memory gate evaluate matched sources without a recent-tail shadow. */
  matchOnlyCandidates?: boolean;
  config?: Partial<AssistantSemanticRecallConfig>;
  vectorCandidates?: AssistantSemanticRecallCandidateDecision[];
}): AssistantRequestSemanticRecallPlan {
  if (!args) {
    return emptyPlan('not_configured', 'none', null);
  }
  const config = resolveSemanticRecallConfig(args.config);
  if (args.enabled === false) {
    return emptyPlan('disabled', 'none', args.maxTokens, config);
  }

  const scopedConversations = args.conversations
    .filter((conversation) => conversation.id !== args.activeConversationId)
    .filter((conversation) => sameCollaboratorScope({
      currentCollaboratorId: args.currentCollaboratorId,
      conversationCollaboratorId: conversation.collaboratorId
    }));
  const scopedConversationIds = new Set(scopedConversations.map((conversation) => conversation.id));
  const recentTailCandidates = scopedConversations
    .map((conversation) => ({
      conversation,
      tail: latestDialogueTail(conversation, config),
      sortTimestamp: latestMessageTimestamp(conversation)
    }))
    .filter((candidate): candidate is {
      conversation: AssistantSemanticRecallConversation;
      tail: ChatMessage[];
      sortTimestamp: number;
    } => candidate.tail.length > 0)
    .sort((left, right) => right.sortTimestamp - left.sortTimestamp)
    .slice(0, config.recentTailConversationCount)
    .map((candidate) => buildCandidate({
      kind: 'recent_tail',
      conversation: candidate.conversation,
      messages: candidate.tail,
      score: null
    }));

  const queryText = latestUserText(args.messages);
  const queryTerms = new Set(normalizeRecallTerms(queryText));
  const corpusStats = buildMemoryRecallCorpusAnchorStats(
    scopedConversations.flatMap((conversation) =>
      userMessages(conversation).map((message) => ({
        conversationId: conversation.id,
        text: message.content
      }))
    )
  );
  const queryAnchors = extractMemoryRecallAnchors(queryText, corpusStats);
  const matchedContextCandidates = queryTerms.size
    ? scopedConversations
    .flatMap((conversation) => {
      const best = userMessages(conversation)
        .map((message) => ({
          message,
          score: scoreTextOverlap({
            queryTerms,
            queryAnchors,
            corpusStats,
            text: message.content
          })
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((left, right) => {
          const scoreDelta = right.score - left.score;
          if (scoreDelta !== 0) return scoreDelta;
          return right.message.timestamp - left.message.timestamp;
        })[0];
      return best
        ? [buildCandidate({
            kind: 'matched_context',
            conversation,
            messages: [best.message],
            score: best.score
          })]
        : [];
    })
    .sort((left, right) => {
      const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      return right.id.localeCompare(left.id);
    })
    : [];

  const voiceAnchorCandidates = scopedConversations
    .flatMap((conversation) => userMessages(conversation).map((message) => ({ conversation, message })))
    .map((candidate) => ({
      ...candidate,
      score: scoreVoiceAnchorMessage(candidate.message)
    }))
    .filter((candidate): candidate is {
      conversation: AssistantSemanticRecallConversation;
      message: ChatMessage;
      score: number;
    } => candidate.score !== null)
    .sort((left, right) => {
      const scoreDelta = left.score - right.score;
      if (scoreDelta !== 0) return scoreDelta;
      return right.message.timestamp - left.message.timestamp;
    })
    .slice(0, config.voiceAnchorCount)
    .map((candidate) => buildCandidate({
      kind: 'voice_anchor',
      conversation: candidate.conversation,
      messages: [candidate.message],
      score: candidate.score
    }));

  const vectorMatches = (args.vectorCandidates ?? []).filter((candidate) =>
      candidate.kind === 'vector_match'
      && candidate.sourceConversationId
      && scopedConversationIds.has(candidate.sourceConversationId)
    );
  const dedupedCandidates = args.matchOnlyCandidates
    ? [...matchedContextCandidates, ...vectorMatches]
    : dedupeCandidates([
        ...recentTailCandidates,
        ...matchedContextCandidates,
        ...vectorMatches,
        ...voiceAnchorCandidates
      ]);
  const maxCandidates = typeof args.maxCandidates === 'number' && Number.isFinite(args.maxCandidates) && args.maxCandidates > 0
    ? Math.floor(args.maxCandidates)
    : null;
  const candidates = maxCandidates === null
    ? dedupedCandidates
    : [...dedupedCandidates].sort(compareImplicitCandidates).slice(0, maxCandidates);
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const countLimitedEntries = maxCandidates === null
    ? candidates
    : dedupedCandidates.map((candidate) =>
        candidateIds.has(candidate.id) ? candidate : { ...candidate, status: 'dropped_budget' as const }
      );

  if (!candidates.length) {
    return emptyPlan('empty', 'local_scan', args.maxTokens, config);
  }

  const strategy: AssistantRequestSemanticRecallPlan['strategy'] =
    candidates.some((candidate) => candidate.kind === 'vector_match') ? 'semantic_index' : 'local_scan';

  if (args.maxTokens === null) {
    return {
      status: countLimitedEntries.some((entry) => entry.status === 'dropped_budget') ? 'trimmed_budget' : 'within_budget',
      strategy,
      config,
      selectedCandidates: candidates,
      estimatedTokens: candidates.reduce((total, candidate) => total + candidate.estimatedTokens, 0),
      maxTokens: null,
      entries: countLimitedEntries
    };
  }

  const selectedCandidates: AssistantSemanticRecallCandidateDecision[] = [];
  const entries: AssistantSemanticRecallCandidateDecision[] = [];
  let estimatedTokens = 0;

  for (const candidate of countLimitedEntries) {
    if (candidate.status === 'dropped_budget') {
      entries.push(candidate);
      continue;
    }
    const nextTokens = estimatedTokens + candidate.estimatedTokens;
    if (selectedCandidates.length > 0 && nextTokens > args.maxTokens) {
      entries.push({ ...candidate, status: 'dropped_budget' });
      continue;
    }
    selectedCandidates.push(candidate);
    entries.push(candidate);
    estimatedTokens = nextTokens;
  }

  return {
    status: entries.some((entry) => entry.status === 'dropped_budget') ? 'trimmed_budget' : 'within_budget',
    strategy,
    config,
    selectedCandidates,
    estimatedTokens,
    maxTokens: args.maxTokens,
    entries
  };
}

export function resolveSemanticRecallContextCandidates(args: {
  plan: AssistantRequestSemanticRecallPlan;
  conversations?: AssistantSemanticRecallConversation[];
}): AssistantSemanticRecallContextCandidate[] {
  if (!args.conversations?.length || !args.plan.selectedCandidates.length) return [];

  const conversationsById = new Map(args.conversations.map((conversation) => [conversation.id, conversation]));

  return args.plan.selectedCandidates.flatMap((candidate) => {
    if (candidate.status !== 'kept' || !candidate.sourceConversationId) return [];
    const conversation = conversationsById.get(candidate.sourceConversationId);
    const messages = candidate.sourceMessageIds
      .map((sourceMessageId) => conversation?.messages.find((entry) => entry.id === sourceMessageId) ?? null)
      .filter((message): message is ChatMessage => Boolean(message));
    const text = formatCandidateText(messages);
    if (!text) return [];
    const sourceMessageTimestamps = messages
      .map((message) => message.timestamp)
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);
    const sourceTimestamp = sourceMessageTimestamps.length > 0
      ? sourceMessageTimestamps.reduce((latest, timestamp) => Math.max(latest, timestamp), 0)
      : (conversation?.updatedAt ?? 0);

    return [{
      id: candidate.id,
      kind: candidate.kind,
      label: candidate.label,
      sourceConversationId: candidate.sourceConversationId,
      sourceMessageIds: candidate.sourceMessageIds,
      score: candidate.score,
      ...(sourceTimestamp > 0 ? { sourceTimestamp } : {}),
      text
    }];
  });
}
