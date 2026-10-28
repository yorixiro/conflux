import { deleteMemoryVectorIndexEntriesForConversation } from '../engines/memoryVectorIndexStorage';
import { reportPersistenceError } from '../infrastructure/persistenceDiagnostics';
import {
  persistChatStateChange,
  readConversationMessages,
  readLiveChatStateWithOptions
} from './chatCurrentPersistence';
import {
  canWriteConversationBody,
  getConversationWritableFromState,
  loadedConversationIdsFromBodyStatuses
} from './chatConversationBodyStatus';
import {
  applyLoadedConversationMessages
} from './chatConversationMessages';
import { ensureConversationMessagesLoadedFromState } from './chatConversationMessageLoading';
import {
  clearConversationAttachmentsByAssetIds,
  deleteConversationFromState
} from './chatConversationCleanup';
import {
  markConversationsDirty
} from './chatPersistenceMarkers';
import { scheduleHydratedSnapshotCommit } from './chatHydratedSnapshotCommit';
import { projectHydratedChatStorePatch } from './chatStoreHydration';
import { flushChatPersistenceIfHydrated } from './chatStoreFlush';
import type { ChatState, ChatStoreGet, ChatStoreSet } from './chatStoreTypes';

type ChatLifecycleActions = Pick<
  ChatState,
  | 'clearConversationAttachmentsByAssetIds'
  | 'deleteConversation'
  | 'ensureConversationMessagesLoaded'
  | 'getConversationWritable'
  | 'ensureConversationWritable'
  | 'ensureFullConversationBodiesLoaded'
  | 'hydrateFromDb'
  | 'persistToDb'
>;

export function createChatLifecycleActions(
  set: ChatStoreSet,
  get: ChatStoreGet
): ChatLifecycleActions {
  return {
    clearConversationAttachmentsByAssetIds: (assetIds, clearedAt = Date.now()) => {
      set((state) => {
        const result = clearConversationAttachmentsByAssetIds({
          conversations: state.conversations,
          assetIds,
          clearedAt,
          canWriteConversationBody: (conversationId) => canWriteConversationBody(state, conversationId)
        });
        if (!result) return state;
        return {
          conversations: result.conversations,
          ...markConversationsDirty(state, result.dirtyConversationIds)
        };
      });
    },

    deleteConversation: (conversationId) => {
      set((state) => deleteConversationFromState(state, conversationId));
      if (get().hydrated) {
        flushChatPersistenceIfHydrated(get, 'delete-conversation-flush');
        void deleteMemoryVectorIndexEntriesForConversation(conversationId).catch((error) => {
          reportPersistenceError({
            label: '[store:persist]',
            store: 'chat',
            operation: 'delete-conversation-derived-index'
          }, error);
        });
      }
    },

    ensureConversationMessagesLoaded: async (conversationId) => {
      const initialConversation = get().conversations.find((entry) => entry.id === conversationId);
      let savedDraft: string | undefined;
      const conversation = await ensureConversationMessagesLoadedFromState({
        getState: get,
        setState: set,
        readMessages: (id) => readConversationMessages(id, (draft) => { savedDraft = draft; }),
        applyLoadedMessages: (entry, messages) => applyLoadedConversationMessages({
          ...entry,
          // Unloaded directory rows have an empty placeholder, not an empty saved draft.
          // Keep any draft typed while this body read was in flight.
          draft: savedDraft !== undefined && entry.draft === initialConversation?.draft
            ? savedDraft : entry.draft
        }, messages)
      }, conversationId);
      if (conversation && savedDraft !== undefined) {
        set((state) => state.activeConversationId === conversationId
          && state.inputDraft === initialConversation?.draft
          ? { inputDraft: conversation.draft ?? '' } : state);
      }
      return conversation;
    },

    getConversationWritable: (conversationId) => {
      return getConversationWritableFromState(get(), conversationId);
    },

    ensureConversationWritable: async (conversationId) => {
      const conversation = await get().ensureConversationMessagesLoaded(conversationId);
      if (!conversation) return null;
      return get().getConversationWritable(conversationId);
    },

    ensureFullConversationBodiesLoaded: async () => {
      const conversationIds = get().conversations.map((conversation) => conversation.id);
      await Promise.all(conversationIds.map((conversationId) => get().ensureConversationMessagesLoaded(conversationId)));
      return get().conversations;
    },

    hydrateFromDb: async () => {
      let payload: Awaited<ReturnType<typeof readLiveChatStateWithOptions>>;
      try {
        payload = await readLiveChatStateWithOptions({ readMode: 'active-only', throwOnReadFailure: true });
      } catch {
        return;
      }

      set(projectHydratedChatStorePatch(payload));
      if (payload) scheduleHydratedSnapshotCommit(payload);
    },

    persistToDb: async () => {
      const {
        conversations,
        activeConversationId,
        dirtyConversationIds,
        deletedConversationIds,
        conversationPersistVersion
      } = get();
      const loadedConversationIds = loadedConversationIdsFromBodyStatuses(get());
      await persistChatStateChange({
        conversations,
        activeConversationId,
        dirtyConversationIds,
        loadedConversationIds,
        deletedConversationIds
      });
      set((state) => (
        state.conversationPersistVersion === conversationPersistVersion
          ? { dirtyConversationIds: [], deletedConversationIds: [] }
          : state
      ));
    }
  };
}
