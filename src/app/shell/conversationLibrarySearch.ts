import type { ChatMessage, Conversation } from '../../types/domain';
import type { ConversationCardSummary } from '../collection/conversationCardSummary';
import { buildConversationMessageSearchMatches, normalizeConversationSearchQuery } from '../collection/conversationMessageSearch';

/** Read only the scoped IDs supplied by the caller; never hydrate or rewrite live chat state. */
export async function searchConversationLibrary({
  summaries, conversations, loadedIds, query, readMessages, signal
}: {
  summaries: ConversationCardSummary[];
  conversations: Conversation[];
  loadedIds: ReadonlySet<string>;
  query: string;
  readMessages: (id: string) => Promise<ChatMessage[]>;
  signal?: AbortSignal;
}) {
  const needle = normalizeConversationSearchQuery(query);
  if (!needle) return { results: summaries, failedIds: [] as string[] };
  const liveById = new Map(conversations.map(item => [item.id, item]));
  const matches = new Map<string, ConversationCardSummary>();
  const failedIds: string[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < summaries.length && !signal?.aborted) {
      const summary = summaries[cursor++];
      const conversation = liveById.get(summary.id);
      const titleMatches = `${summary.title}\n${summary.displayTitle}`.toLowerCase().includes(needle);
      try {
        if (!conversation) throw new Error('Conversation is no longer available');
        const messages = loadedIds.has(summary.id)
          ? conversation.messages
          : await readMessages(summary.id);
        if (signal?.aborted) return;
        const searchMatches = buildConversationMessageSearchMatches({ ...conversation, messages }, needle, 1);
        if (titleMatches || searchMatches.total > 0) matches.set(summary.id, { ...summary, searchMatches });
      } catch {
        if (signal?.aborted) return;
        failedIds.push(summary.id);
        if (titleMatches) matches.set(summary.id, { ...summary, searchMatches: null });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, summaries.length) }, worker));
  return { results: summaries.filter(item => matches.has(item.id)).map(item => matches.get(item.id)!), failedIds };
}
