import { resolveDefaultCollaboratorId } from '../../app/chat/chatConversationSession';
import { openConversationForCollaborator } from '../../app/chat/chatConversationSession';
import { enterChatWorld } from '../../app/shell/frontstageNavigation';
import type { Conversation, Persona, World } from '../../types/domain';

type AppShellNavigationActionsArgs = {
  previewConversationId: string | null;
  personas: Persona[];
  conversations: Conversation[];
  activeWorld: World;
  frontstageCollaboratorId: string | null;
  collectionProjectId: string | null;
  activeCollaboratorId: string | null;
  activeConversationId: string | null;
  activeConversationCollaboratorId: string | null;
  activeConversationProjectId: string | null;
  setWorld: (world: World) => void;
  createConversation: (
    collaboratorId?: string | null,
    options?: {
      activeProjectId?: string | null;
    }
  ) => string;
  setActiveConversation: (conversationId: string) => void;
  clearPendingAttachments: () => void;
  clearPendingCardReference: () => void;
};

export function resolveFallbackChatConversationForWorldReturn(args: {
  conversations: Conversation[];
  preferredProjectId: string | null;
  frontstageCollaboratorId: string | null;
  activeConversationId: string | null;
}) {
  const preferredProjectId = args.preferredProjectId?.trim() || null;
  if (!preferredProjectId) return null;

  const activeConversation = args.activeConversationId
    ? args.conversations.find((conversation) => conversation.id === args.activeConversationId) ?? null
    : null;
  if ((activeConversation?.activeProjectId ?? null) === preferredProjectId) {
    return activeConversation;
  }

  const collaboratorScopedConversation = args.frontstageCollaboratorId
    ? args.conversations.find(
        (conversation) =>
          conversation.collaboratorId === args.frontstageCollaboratorId
          && (conversation.activeProjectId ?? null) === preferredProjectId
      ) ?? null
    : null;
  if (collaboratorScopedConversation) {
    return collaboratorScopedConversation;
  }

  return args.conversations.find(
    (conversation) => (conversation.activeProjectId ?? null) === preferredProjectId
  ) ?? null;
}

export function shouldInferChatConversationForWorldReturn(args: {
  frontstageCollaboratorId: string | null;
  preferredProjectId: string | null;
  activeConversationId: string | null;
  activeConversationCollaboratorId: string | null;
}) {
  if (!args.frontstageCollaboratorId) return false;
  if (!args.activeConversationId) return true;
  if (args.preferredProjectId) return false;
  return args.activeConversationCollaboratorId !== args.frontstageCollaboratorId;
}

export function resolveFreshConversationProjectId(args: {
  activeWorld: World;
  preferredProjectId: string | null;
}) {
  if (args.activeWorld !== 'collection') return null;
  return args.preferredProjectId?.trim() || null;
}

export function useAppShellNavigationActions({
  previewConversationId,
  personas,
  conversations,
  activeWorld,
  frontstageCollaboratorId,
  collectionProjectId,
  activeCollaboratorId,
  activeConversationId,
  activeConversationCollaboratorId,
  activeConversationProjectId,
  setWorld,
  createConversation,
  setActiveConversation,
  clearPendingAttachments,
  clearPendingCardReference
}: AppShellNavigationActionsArgs) {
  const preferredProjectId = activeWorld === 'collection'
    ? collectionProjectId
    : activeConversationProjectId;

  const openPreviewChat = () => {
    if (previewConversationId) {
      if (previewConversationId !== activeConversationId) {
        clearPendingAttachments();
        clearPendingCardReference();
      }
      setActiveConversation(previewConversationId);
    } else if (
      frontstageCollaboratorId
      && personas.some((persona) => persona.id === frontstageCollaboratorId)
      && (activeConversationId === null || activeConversationCollaboratorId !== frontstageCollaboratorId)
    ) {
      // The bottom "Chat" tab must not show another persona's active thread
      // after creating or selecting a collaborator in the collection world.
      openConversationForCollaborator({
        conversations,
        personas,
        activeCollaboratorId
      }, {
        createConversation,
        setActiveConversation,
        clearPendingAttachments,
        clearPendingCardReference
      }, frontstageCollaboratorId);
    }
    enterChatWorld({ setWorld });
  };

  const prepareChatForWorldReturn = () => {
    if (activeConversationId && preferredProjectId) return;

    const shouldInferConversation = shouldInferChatConversationForWorldReturn({
      frontstageCollaboratorId,
      preferredProjectId,
      activeConversationId,
      activeConversationCollaboratorId
    });
    if (!shouldInferConversation) return;

    const preferredConversation = resolveFallbackChatConversationForWorldReturn({
      conversations,
      preferredProjectId,
      frontstageCollaboratorId,
      activeConversationId
    });
    if (preferredConversation) {
      if (preferredConversation.id !== activeConversationId) {
        clearPendingAttachments();
        clearPendingCardReference();
        setActiveConversation(preferredConversation.id);
      }
      return;
    }

    openConversationForCollaborator({
      conversations,
      personas,
      activeCollaboratorId
    }, {
      createConversation,
      setActiveConversation,
      clearPendingAttachments,
      clearPendingCardReference
    }, frontstageCollaboratorId, {
      preferredProjectId
    });
  };

  const openFreshConversation = () => {
    const collaboratorId = resolveDefaultCollaboratorId(
      personas,
      frontstageCollaboratorId ?? activeCollaboratorId
    );
    if (!collaboratorId) return;
    const conversationId = createConversation(collaboratorId, {
      activeProjectId: resolveFreshConversationProjectId({
        activeWorld,
        preferredProjectId
      })
    });
    clearPendingAttachments();
    clearPendingCardReference();
    setActiveConversation(conversationId);
    enterChatWorld({ setWorld });
  };

  return {
    openPreviewChat,
    prepareChatForWorldReturn,
    openFreshConversation
  };
}
