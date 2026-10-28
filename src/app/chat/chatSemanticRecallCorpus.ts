import { readConversationMessages } from '../../stores/chatCurrentPersistence';
import { PASSIVE_RECALL_DEFAULT_COOLDOWN_MS } from '../../engines/request/requestRecallGate';
import {
  resolveSemanticRecallConfig,
  type AssistantSemanticRecallConfig
} from '../../engines/request/requestSemanticRecallPlan';
import type { ChatMessage, Conversation } from '../../types/domain';

const MAX_RECENT_RECEIPT_CONVERSATIONS = 24;
const RECEIPT_READ_BATCH_SIZE = 4;

function projectPassiveReceiptConversation(conversation: Conversation, messages: ChatMessage[]): Conversation {
  return {
    ...conversation,
    // Do not keep unrelated private message bodies in the receipt-only snapshot.
    messages: messages.flatMap((message): ChatMessage[] => {
      const evidence = message.memoryEvidence;
      if (message.role !== 'assistant' || !evidence?.passiveRecallReceipt) return [];
      return [{
        id: message.id,
        role: 'assistant',
        content: '',
        timestamp: message.timestamp,
        ...(message.requestRole ? { requestRole: message.requestRole } : {}),
        memoryEvidence: {
          requestId: evidence.requestId,
          strategy: evidence.strategy,
          status: evidence.status,
          items: [],
          passiveRecallReceipt: evidence.passiveRecallReceipt
        }
      }];
    })
  };
}

/**
 * Read *only* the conversations capable of holding an unexpired delivery.
 * A receipt lives on the assistant message and message mutations advance the
 * conversation's updatedAt, so older catalogs cannot contain live cooldowns.
 * Fail closed if any recent record cannot be read reliably.
 */
export async function readRecentPassiveRecallConversationBodies(args: {
  conversations: Conversation[];
  activeConversationId: string;
  currentCollaboratorId: string;
  now: number;
  readMessages?: (conversationId: string) => Promise<ChatMessage[]>;
}): Promise<Conversation[]> {
  if (!Number.isFinite(args.now) || args.now <= 0 || !args.currentCollaboratorId.trim()) {
    throw new Error('Invalid passive recall scope or clock.');
  }
  const cutoff = args.now - PASSIVE_RECALL_DEFAULT_COOLDOWN_MS;
  const recent = args.conversations
    .filter((conversation) =>
      conversation.id !== args.activeConversationId
      && conversation.collaboratorId === args.currentCollaboratorId
      && Number.isFinite(conversation.updatedAt)
      && conversation.updatedAt >= cutoff
    )
    .sort((left, right) => right.updatedAt - left.updatedAt);

  if (recent.length > MAX_RECENT_RECEIPT_CONVERSATIONS) {
    throw new Error('Too many recent conversations to verify passive recall cooldown.');
  }

  const loaded: Conversation[] = [];
  const readMessages = args.readMessages ?? readConversationMessages;
  for (let offset = 0; offset < recent.length; offset += RECEIPT_READ_BATCH_SIZE) {
    const batch = recent.slice(offset, offset + RECEIPT_READ_BATCH_SIZE);
    const resolved = await Promise.all(batch.map(async (conversation) => {
      if (conversation.messages.length) {
        return projectPassiveReceiptConversation(conversation, conversation.messages);
      }
      const messages = await readMessages(conversation.id);
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error(`Recent conversation is not readable: ${conversation.id}`);
      }
      return projectPassiveReceiptConversation(conversation, messages);
    }));
    loaded.push(...resolved);
  }
  return loaded;
}

function shouldPreferLiveConversation(params: {
  conversation: Conversation;
  activeConversationId: string;
}) {
  return params.conversation.id === params.activeConversationId || params.conversation.messages.length > 0;
}

function mergeRecallConversation(params: {
  persisted?: Conversation;
  live: Conversation;
  activeConversationId: string;
  activeMessages: ChatMessage[];
}): Conversation {
  const liveMessages = params.live.id === params.activeConversationId
    ? params.activeMessages
    : params.live.messages;
  const messages = shouldPreferLiveConversation({
    conversation: {
      ...params.live,
      messages: liveMessages
    },
    activeConversationId: params.activeConversationId
  })
    ? liveMessages
    : params.persisted?.messages ?? params.live.messages;

  return {
    ...(params.persisted ?? params.live),
    ...params.live,
    messages
  };
}

export function mergeRequestSemanticRecallConversations(params: {
  persistedConversations: Conversation[];
  liveConversations: Conversation[];
  activeConversationId: string;
  activeMessages: ChatMessage[];
}): Conversation[] {
  const liveById = new Map(params.liveConversations.map((conversation) => [conversation.id, conversation]));
  const merged: Conversation[] = params.persistedConversations.map((persisted) => {
    const live = liveById.get(persisted.id);
    if (!live) return persisted;
    liveById.delete(persisted.id);
    return mergeRecallConversation({
      persisted,
      live,
      activeConversationId: params.activeConversationId,
      activeMessages: params.activeMessages
    });
  });

  for (const live of liveById.values()) {
    merged.push(mergeRecallConversation({
      live,
      activeConversationId: params.activeConversationId,
      activeMessages: params.activeMessages
    }));
  }

  return merged;
}

function sameCollaboratorScope(params: {
  currentCollaboratorId?: string | null;
  conversationCollaboratorId: string | null;
}) {
  if (!params.currentCollaboratorId) return true;
  return params.conversationCollaboratorId === params.currentCollaboratorId;
}

export function selectRequestSemanticRecallConversationIds(params: {
  conversations: Conversation[];
  activeConversationId: string;
  currentCollaboratorId?: string | null;
  config?: Partial<AssistantSemanticRecallConfig>;
}): string[] {
  const config = resolveSemanticRecallConfig(params.config);
  const count = Math.max(config.recentTailConversationCount, config.voiceAnchorCount);
  return params.conversations
    .filter((conversation) => conversation.id !== params.activeConversationId)
    .filter((conversation) => sameCollaboratorScope({
      currentCollaboratorId: params.currentCollaboratorId,
      conversationCollaboratorId: conversation.collaboratorId
    }))
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, count)
    .map((conversation) => conversation.id);
}

function withMessages(conversation: Conversation, messages: ChatMessage[]): Conversation {
  return {
    ...conversation,
    messages
  };
}

export async function readRequestSemanticRecallConversationBodies(params: {
  conversationIds: string[];
  catalogConversations: Conversation[];
  activeConversationId: string;
  activeMessages: ChatMessage[];
}): Promise<Conversation[]> {
  const catalogById = new Map(params.catalogConversations.map((conversation) => [conversation.id, conversation]));
  const uniqueIds = Array.from(new Set(params.conversationIds.filter((conversationId) => conversationId.trim())));
  const loaded = await Promise.all(uniqueIds.map(async (conversationId) => {
    const catalog = catalogById.get(conversationId);
    if (!catalog) return null;
    if (conversationId === params.activeConversationId) {
      return withMessages(catalog, params.activeMessages);
    }
    try {
      return withMessages(catalog, await readConversationMessages(conversationId));
    } catch (error) {
      console.warn('[request] Semantic recall conversation body skipped.', error);
      return null;
    }
  }));

  return loaded.filter((conversation): conversation is Conversation => Boolean(conversation));
}

export async function readRequestSemanticRecallConversations(params: {
  liveConversations: Conversation[];
  activeConversationId: string;
  activeMessages: ChatMessage[];
  currentCollaboratorId?: string | null;
  config?: Partial<AssistantSemanticRecallConfig>;
}): Promise<Conversation[]> {
  const catalogConversations = mergeRequestSemanticRecallConversations({
    persistedConversations: [],
    liveConversations: params.liveConversations,
    activeConversationId: params.activeConversationId,
    activeMessages: params.activeMessages
  });
  const selectedConversationIds = selectRequestSemanticRecallConversationIds({
    conversations: catalogConversations,
    activeConversationId: params.activeConversationId,
    currentCollaboratorId: params.currentCollaboratorId,
    config: params.config
  });
  const loadedConversations = await readRequestSemanticRecallConversationBodies({
    conversationIds: selectedConversationIds,
    catalogConversations,
    activeConversationId: params.activeConversationId,
    activeMessages: params.activeMessages
  });

  return mergeRequestSemanticRecallConversations({
    persistedConversations: loadedConversations,
    liveConversations: catalogConversations,
    activeConversationId: params.activeConversationId,
    activeMessages: params.activeMessages
  });
}
