import type { ActiveThemePreview } from '../../stores/spaceStore';
import type { Persona, World } from '../../types/domain';

type DeriveAppShellStateArgs = {
  activeWorld: World;
  activeThemePreview: ActiveThemePreview;
  personas: Persona[];
  frontstageCollaboratorId: string | null;
  activeConversationTitle: string | null;
  activeConversationCollaboratorId: string | null;
  activeConversationMessageCount: number;
  collectionRenderItemCount: number;
  labels: {
    collectionWorld: string;
    chatWorld: string;
    unnamedConversation: string;
  };
};

export function deriveAppShellState({
  activeWorld,
  activeThemePreview,
  personas,
  frontstageCollaboratorId,
  activeConversationTitle,
  activeConversationCollaboratorId,
  activeConversationMessageCount,
  collectionRenderItemCount,
  labels
}: DeriveAppShellStateArgs) {
  const effectiveWorld = activeWorld;
  const currentCollaborator = frontstageCollaboratorId
    ? personas.find((persona) => persona.id === frontstageCollaboratorId) ?? null
    : null;
  const previewConversationId = activeThemePreview?.conversationId ?? null;
  const activeConversationCollaborator = activeConversationCollaboratorId
    ? personas.find((persona) => persona.id === activeConversationCollaboratorId) ?? null
    : null;
  const hasActiveConversation = Boolean(activeConversationTitle);
  const activeRenderLoad = effectiveWorld === 'collection'
    ? collectionRenderItemCount
    : effectiveWorld === 'chat'
      ? activeConversationMessageCount
      : 0;
  const activeChatDensity =
    activeRenderLoad >= 42
      ? 'heavy'
      : activeRenderLoad >= 22
        ? 'dense'
        : 'light';
  const worldLabel = effectiveWorld === 'collection'
    ? labels.collectionWorld
    : effectiveWorld === 'group'
      ? '群聊'
      : labels.chatWorld;
  const worldDetail =
    effectiveWorld === 'chat'
      ? (
          activeConversationTitle
          && activeConversationTitle !== '未命名对话'
          && activeConversationTitle !== labels.unnamedConversation
            ? activeConversationTitle
            : null
        )
      : null;
  const showWorldLabel = true;
  const isAggregateCollectionScope = effectiveWorld === 'collection' && currentCollaborator === null;
  const showTopbarShell = activeWorld !== 'group';
  const showTopbarTitle = !isAggregateCollectionScope;
  const topbarCollaborator = effectiveWorld === 'collection'
    ? currentCollaborator
    : effectiveWorld === 'chat' && hasActiveConversation
      ? activeConversationCollaborator
      : null;
  const topbarTitle = topbarCollaborator?.name || 'Conflux';
  const topbarTitleTone: 'brand' | 'collaborator' = topbarCollaborator ? 'collaborator' : 'brand';

  return {
    previewConversationId,
    activeChatDensity,
    isAggregateCollectionScope,
    worldLabel,
    worldDetail,
    showWorldLabel,
    showTopbarShell,
    showTopbarTitle,
    topbarTitle,
    topbarTitleTone
  };
}
