import { resolveOwnerCollaboratorId } from '../../engines/collectionOwnership';
import { conversationMatchesCollaboratorScope } from '../../engines/conversationOwnership';
import type { CodeCard, CollectionShelf, Conversation, ImageAssetCard, ProjectFile, RoomProject } from '../../types/domain';
import { hasArchivedConversationContent } from '../collection/conversationArchiveVisibility';

type CollectionRenderLoadArgs = {
  collectionShelf: CollectionShelf;
  frontstageCollaboratorId: string | null;
  knownCollaboratorIds?: readonly string[];
  loadedMessageConversationIds?: readonly string[];
  conversations: Conversation[];
  cards: CodeCard[];
  imageCards: ImageAssetCard[];
  roomProjects: RoomProject[];
  projectFiles: ProjectFile[];
};

function conversationMatchesScope(args: CollectionRenderLoadArgs, conversation: Conversation) {
  return conversationMatchesCollaboratorScope(
    conversation,
    args.frontstageCollaboratorId,
    args.knownCollaboratorIds
  );
}

function countDialogueCards(args: CollectionRenderLoadArgs) {
  const loadedMessageConversationIds = args.loadedMessageConversationIds
    ? new Set(args.loadedMessageConversationIds)
    : undefined;

  return args.conversations.filter((conversation) => (
    hasArchivedConversationContent(conversation, { loadedMessageConversationIds })
    && conversationMatchesScope(args, conversation)
  )).length;
}

function countAttachmentCards(args: CollectionRenderLoadArgs) {
  return args.conversations.reduce((total, conversation) => {
    if (!conversationMatchesScope(args, conversation)) return total;
    return total + conversation.messages.reduce((messageTotal, message) => (
      messageTotal + (message.attachments ?? []).filter((attachment) => attachment.kind === 'file').length
    ), 0);
  }, 0);
}

function countCodeCards(args: CollectionRenderLoadArgs) {
  return args.cards.filter((card) => (
    card.kind !== 'room-rule'
    && (!args.frontstageCollaboratorId || resolveOwnerCollaboratorId(card, args.conversations) === args.frontstageCollaboratorId)
  )).length + countAttachmentCards(args);
}

function countProjectCards(args: CollectionRenderLoadArgs) {
  if (!args.frontstageCollaboratorId) return args.roomProjects.length;

  const scopedProjectIds = new Set<string>();
  args.projectFiles.forEach((file) => {
    if (file.ownerCollaboratorId === args.frontstageCollaboratorId) {
      scopedProjectIds.add(file.projectId);
    }
  });

  return args.roomProjects.filter((project) => (
    project.ownerCollaboratorId === args.frontstageCollaboratorId
    || scopedProjectIds.has(project.id)
  )).length;
}

function countImageCards(args: CollectionRenderLoadArgs) {
  return args.imageCards.filter((card) => (
    !args.frontstageCollaboratorId
    || resolveOwnerCollaboratorId(card, args.conversations) === args.frontstageCollaboratorId
  )).length;
}

export function resolveCollectionRenderItemCount(args: CollectionRenderLoadArgs) {
  switch (args.collectionShelf) {
    case 'dialogue':
      return countDialogueCards(args);
    case 'code':
      return countCodeCards(args);
    case 'project':
      return countProjectCards(args);
    case 'image':
      return countImageCards(args);
    case 'album':
      return args.imageCards.length;
    case 'info':
      return 0;
  }
}
