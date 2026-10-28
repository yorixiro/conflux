import { useEffect, useState } from 'react';
import type { ConversationCardSummary } from '../../app/collection/conversationCardSummary';
import { buildConversationMessageSearchMatches } from '../../app/collection/conversationMessageSearch';
import { readConversationMessages } from '../../stores/chat';
import { useChatStore } from '../../stores/chatStore';

export function useConversationLibrarySearch(summaries: ConversationCardSummary[], query: string) {
  const conversations = useChatStore(state => state.conversations);
  const loadedIds = useChatStore(state => state.loadedMessageConversationIds);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState({ results: summaries, failedCount: 0, busy: false, query: '' });
  const needle = query.trim();

  useEffect(() => {
    if (!needle) return;
    let cancelled = false;
    setSearch({ results: [], failedCount: 0, busy: true, query: needle });
    const timer = window.setTimeout(async () => {
      const liveById = new Map(conversations.map(item => [item.id, item]));
      const loaded = new Set(loadedIds);
      const results: ConversationCardSummary[] = [];
      let failedCount = 0;
      for (const summary of summaries) {
        if (cancelled) return;
        const titleMatches = `${summary.title}\n${summary.displayTitle}`.toLowerCase().includes(needle.toLowerCase());
        try {
          const conversation = liveById.get(summary.id);
          if (!conversation) throw new Error('Conversation unavailable');
          const messages = loaded.has(summary.id) ? conversation.messages : await readConversationMessages(summary.id);
          if (cancelled) return;
          const searchMatches = buildConversationMessageSearchMatches({ ...conversation, messages }, needle, 1);
          if (titleMatches || searchMatches.total) results.push({ ...summary, searchMatches });
        } catch {
          failedCount++;
          if (titleMatches) results.push({ ...summary, searchMatches: null });
        }
      }
      if (!cancelled) setSearch({ results, failedCount, busy: false, query: needle });
    }, 240);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [summaries, conversations, loadedIds, needle, retry]);

  const currentIds = new Set(summaries.map(item => item.id));
  return {
    results: needle ? (search.query === needle ? search.results.filter(item => currentIds.has(item.id)) : []) : summaries,
    busy: Boolean(needle) && (search.query !== needle || search.busy),
    failedCount: needle && search.query === needle ? search.failedCount : 0,
    retry: () => setRetry(value => value + 1)
  };
}
