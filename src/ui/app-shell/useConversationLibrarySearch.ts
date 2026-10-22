import { useEffect, useState } from 'react';
import type { ConversationCardSummary } from '../../app/collection/conversationCardSummary';
import { searchConversationLibrary } from '../../app/shell/conversationLibrarySearch';
import { readConversationMessages } from '../../stores/chat';
import { useChatStore } from '../../stores/chatStore';

export function useConversationLibrarySearch(summaries: ConversationCardSummary[], query: string) {
  const conversations = useChatStore(state => state.conversations);
  const loadedIds = useChatStore(state => state.loadedMessageConversationIds);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState({
    results: summaries, failedIds: [] as string[], busy: false, query: ''
  });
  const needle = query.trim();
  useEffect(() => {
    if (!needle) return;
    const controller = new AbortController();
    setSearch({ results: [], failedIds: [], busy: true, query: needle });
    const timer = window.setTimeout(() => {
      void searchConversationLibrary({ summaries, conversations, loadedIds: new Set(loadedIds), query: needle,
        readMessages: readConversationMessages, signal: controller.signal
      }).then(result => {
        if (!controller.signal.aborted) setSearch({ ...result, busy: false, query: needle });
      });
    }, 240);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [summaries, conversations, loadedIds, needle, retry]);
  return {
    results: needle ? (search.query === needle ? search.results : []) : summaries,
    busy: Boolean(needle) && (search.query !== needle || search.busy),
    failedCount: needle && search.query === needle ? search.failedIds.length : 0,
    retry: () => setRetry(value => value + 1)
  };
}
