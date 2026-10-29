import type { Conversation, Persona } from '../types/domain';

type KnownCollaboratorIds = readonly string[] | ReadonlySet<string>;

function hasKnownCollaboratorId(knownCollaboratorIds: KnownCollaboratorIds | undefined, collaboratorId: string) {
  if (!knownCollaboratorIds) return true;
  return Array.isArray(knownCollaboratorIds)
    ? knownCollaboratorIds.includes(collaboratorId)
    : (knownCollaboratorIds as ReadonlySet<string>).has(collaboratorId);
}

export function isRetiredGroupConversation(conversation: Pick<Conversation, 'groupRoomId'>) {
  return Boolean(conversation.groupRoomId?.trim());
}

export function isGroupConversation(conversation: Pick<Conversation, 'kind' | 'group'>) {
  return conversation.kind === 'group' && Boolean(conversation.group);
}

export function resolveConversationCollaboratorId(conversation: Pick<Conversation, 'collaboratorId'>) {
  return conversation.collaboratorId;
}

export function isConversationOrphaned(
  conversation: Pick<Conversation, 'collaboratorId'>,
  knownCollaboratorIds?: KnownCollaboratorIds
) {
  const collaboratorId = resolveConversationCollaboratorId(conversation);
  if (collaboratorId === null) return true;
  return !hasKnownCollaboratorId(knownCollaboratorIds, collaboratorId);
}

export function conversationMatchesCollaboratorScope(
  conversation: Pick<Conversation, 'collaboratorId' | 'groupRoomId' | 'kind' | 'group'>,
  collaboratorId: string | null,
  knownCollaboratorIds?: KnownCollaboratorIds
) {
  if (isGroupConversation(conversation) || isRetiredGroupConversation(conversation)) return false;
  if (!collaboratorId) return true;
  const conversationCollaboratorId = resolveConversationCollaboratorId(conversation);
  return conversationCollaboratorId === collaboratorId && !isConversationOrphaned(conversation, knownCollaboratorIds);
}

export function resolveChatSidebarScope(args: {
  activeWorld: 'chat' | 'collection' | 'group';
  activeConversationId: string | null;
  activeConversationCollaboratorId: string | null;
  frontstageCollaboratorId: string | null;
  knownCollaboratorIds: KnownCollaboratorIds;
}): string | null {
  if (args.activeWorld !== 'chat' || !args.activeConversationId) return args.frontstageCollaboratorId;
  // In chat, the visible message thread — not a previously browsed persona — owns the sidebar.
  const ownerId = args.activeConversationCollaboratorId;
  return ownerId && hasKnownCollaboratorId(args.knownCollaboratorIds, ownerId) ? ownerId : null;
}

export function resolveConversationCollaboratorName(
  conversation: Pick<Conversation, 'collaboratorId'>,
  personas: Persona[]
) {
  const collaboratorId = resolveConversationCollaboratorId(conversation);
  if (collaboratorId === null) return '未归属历史';
  return personas.find((persona) => persona.id === collaboratorId)?.name ?? '未归属历史';
}
