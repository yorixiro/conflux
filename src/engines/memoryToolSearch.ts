import type { ChatMessage, Conversation, PersonaConversationSummary } from '../types/domain';
import {
  buildConversationSemanticChunks,
  searchMemoryRetrievalChunks,
  normalizeMemoryRetrievalText,
  tokenizeMemoryRetrievalQuery,
  type MemoryRetrievalSearchResult
} from './memoryRetrievalIndex';

export type MemorySearchMode = 'auto' | 'summary' | 'source';

export type MemorySummarySearchResult = {
  kind: 'summary';
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  sourceConversationIds: string[];
  sourceMessageIds: string[];
  score: number;
  matchedKeywords: string[];
};

export type MemorySourceSearchResult = {
  kind: 'source';
  conversationId: string;
  conversationTitle: string;
  sourceMessageIds: string[];
  title: string;
  text: string;
  updatedAt: number;
  score: number;
  matchedKeywords: string[];
};

export type MemorySearchResult = {
  summaries: MemorySummarySearchResult[];
  sources: MemorySourceSearchResult[];
};

export type MemorySourceOpenResult = {
  conversationId: string;
  conversationTitle: string;
  updatedAt: number;
  messages: Array<Pick<ChatMessage, 'id' | 'role' | 'content' | 'timestamp'>>;
  truncated: boolean;
};

const DEFAULT_MEMORY_SEARCH_MAX_RESULTS = 3;
const DEFAULT_MEMORY_SOURCE_OPEN_MAX_CHARS = 8_000;

function resolvePositiveLimit(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function sameCollaboratorScope(args: {
  currentCollaboratorId?: string | null;
  conversationCollaboratorId: string | null;
}) {
  if (!args.currentCollaboratorId) return true;
  return args.conversationCollaboratorId === args.currentCollaboratorId;
}

function scoreSummary(query: string, summary: PersonaConversationSummary): MemorySummarySearchResult | null {
  const queryText = normalizeMemoryRetrievalText(query);
  const queryTerms = tokenizeMemoryRetrievalQuery(query);
  if (!queryText && !queryTerms.length) return null;

  const title = summary.title.trim() || '未命名摘要';
  const content = summary.content.trim();
  const searchable = normalizeMemoryRetrievalText([
    title,
    content,
    summary.subjectCollaboratorName,
    summary.userLabel
  ].filter(Boolean).join('\n'));
  const exactPhraseMatch = queryText.length > 0 && searchable.includes(queryText);
  const matchedKeywords = queryTerms.filter((term) => searchable.includes(term));
  if (!exactPhraseMatch && !matchedKeywords.length) return null;

  const overlapScore = queryTerms.length
    ? matchedKeywords.length / Math.sqrt(queryTerms.length * Math.max(tokenizeMemoryRetrievalQuery(searchable).length, 1))
    : 0;
  const recencyScore = summary.updatedAt > 0 ? Math.log10(summary.updatedAt + 1) / 100 : 0;

  return {
    kind: 'summary',
    id: summary.id,
    title,
    content,
    updatedAt: summary.updatedAt,
    sourceConversationIds: summary.sourceConversationIds,
    sourceMessageIds: summary.sourceMessageIds,
    score: (exactPhraseMatch ? 2 : 0) + overlapScore + recencyScore,
    matchedKeywords: Array.from(new Set(matchedKeywords))
  };
}

function mapSourceResult(result: MemoryRetrievalSearchResult): MemorySourceSearchResult {
  const { chunk } = result;
  return {
    kind: 'source',
    conversationId: chunk.conversationId,
    conversationTitle: chunk.conversationTitle,
    sourceMessageIds: chunk.sourceMessageIds,
    title: chunk.title,
    text: chunk.exactText,
    updatedAt: chunk.updatedAt,
    score: result.score,
    matchedKeywords: result.matchedKeywords
  };
}

function dedupeSources(results: MemorySourceSearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.conversationId}:${result.sourceMessageIds.join('|')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function searchCollaboratorMemorySources(args: {
  query: string;
  mode?: MemorySearchMode;
  maxResults?: number;
  summaries?: PersonaConversationSummary[];
  conversations: Pick<Conversation, 'id' | 'title' | 'collaboratorId' | 'updatedAt' | 'messages'>[];
  activeConversationId?: string | null;
  currentCollaboratorId?: string | null;
}): MemorySearchResult {
  const mode = args.mode ?? 'auto';
  const maxResults = resolvePositiveLimit(args.maxResults, DEFAULT_MEMORY_SEARCH_MAX_RESULTS);
  const allowedConversationIds = new Set(args.conversations
    .filter((conversation) => sameCollaboratorScope({
      currentCollaboratorId: args.currentCollaboratorId,
      conversationCollaboratorId: conversation.collaboratorId
    }))
    .map((conversation) => conversation.id));
  const summaries = mode === 'source'
    ? []
    : (args.summaries ?? [])
        .filter((summary) => summary.sourceConversationIds.every((id) => allowedConversationIds.has(id)))
        .flatMap((summary) => scoreSummary(args.query, summary) ?? [])
        .sort((left, right) => {
          const scoreDelta = right.score - left.score;
          if (scoreDelta !== 0) return scoreDelta;
          return right.updatedAt - left.updatedAt;
        })
        .slice(0, maxResults);

  const sourceResults = mode === 'summary'
    ? []
    : dedupeSources(searchMemoryRetrievalChunks({
        query: args.query,
        chunks: buildConversationSemanticChunks({
          conversations: args.conversations,
          activeConversationId: args.activeConversationId,
          currentCollaboratorId: args.currentCollaboratorId
        })
      }).map(mapSourceResult)).slice(0, maxResults);

  return {
    summaries,
    sources: sourceResults
  };
}

export function openConversationMemorySource(args: {
  conversations: Pick<Conversation, 'id' | 'title' | 'updatedAt' | 'messages'>[];
  sourceConversationId: string;
  sourceMessageIds?: string[];
  maxChars?: number;
}): MemorySourceOpenResult | null {
  const conversationId = args.sourceConversationId.trim();
  const conversation = args.conversations.find((candidate) => candidate.id === conversationId) ?? null;
  if (!conversation) return null;

  const sourceMessageIds = new Set((args.sourceMessageIds ?? []).map((messageId) => messageId.trim()).filter(Boolean));
  const sourceMessages = sourceMessageIds.size > 0
    ? conversation.messages.filter((message) => sourceMessageIds.has(message.id))
    : conversation.messages.filter((message) => message.role === 'user' || message.role === 'assistant');
  // A stale or forged source pointer must not silently become a successful read.
  if (sourceMessageIds.size > 0 && sourceMessages.length !== sourceMessageIds.size) return null;
  const maxChars = resolvePositiveLimit(args.maxChars, DEFAULT_MEMORY_SOURCE_OPEN_MAX_CHARS);
  const messages: MemorySourceOpenResult['messages'] = [];
  let usedChars = 0;
  let truncated = false;

  for (const message of sourceMessages) {
    const content = message.content.trim();
    if (!content) continue;
    const remaining = maxChars - usedChars;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const nextContent = content.length > remaining ? content.slice(0, remaining) : content;
    messages.push({
      id: message.id,
      role: message.role,
      content: nextContent,
      timestamp: message.timestamp
    });
    usedChars += nextContent.length;
    if (nextContent.length < content.length) {
      truncated = true;
      break;
    }
  }

  return {
    conversationId: conversation.id,
    conversationTitle: conversation.title.trim() || '未命名对话',
    updatedAt: conversation.updatedAt,
    messages,
    truncated
  };
}
