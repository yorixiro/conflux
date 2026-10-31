import { describe, expect, it } from 'vitest';
import type { Conversation, Persona } from '../../types/domain';
import {
  useAppShellNavigationActions,
  resolveFallbackChatConversationForWorldReturn,
  resolveFreshConversationProjectId,
  shouldInferChatConversationForWorldReturn
} from './useAppShellNavigationActions';

describe('shouldInferChatConversationForWorldReturn', () => {
  it('does not reopen chat when collaborator and workspace already match', () => {
    expect(shouldInferChatConversationForWorldReturn({
      frontstageCollaboratorId: 'lyra',
      preferredProjectId: 'workspace-1',
      activeConversationId: 'conversation-1',
      activeConversationCollaboratorId: 'lyra'
    })).toBe(false);
  });

  it('keeps the active conversation when collection is browsing a different workspace', () => {
    expect(shouldInferChatConversationForWorldReturn({
      frontstageCollaboratorId: 'lyra',
      preferredProjectId: 'workspace-2',
      activeConversationId: 'conversation-1',
      activeConversationCollaboratorId: 'lyra'
    })).toBe(false);
  });

  it('reopens chat when there is no active conversation yet', () => {
    expect(shouldInferChatConversationForWorldReturn({
      frontstageCollaboratorId: 'lyra',
      preferredProjectId: null,
      activeConversationId: null,
      activeConversationCollaboratorId: null
    })).toBe(true);
  });

  it('does not infer a different conversation just because collection is viewing a workspace', () => {
    expect(shouldInferChatConversationForWorldReturn({
      frontstageCollaboratorId: 'lyra',
      preferredProjectId: 'workspace-2',
      activeConversationId: 'conversation-1',
      activeConversationCollaboratorId: 'pharos'
    })).toBe(false);
  });

  it('keeps the active workspace conversation when collaborator scope still matches', () => {
    expect(shouldInferChatConversationForWorldReturn({
      frontstageCollaboratorId: 'lyra',
      preferredProjectId: null,
      activeConversationId: 'conversation-1',
      activeConversationCollaboratorId: 'lyra'
    })).toBe(false);
  });

  it('does nothing when there is no frontstage collaborator', () => {
    expect(shouldInferChatConversationForWorldReturn({
      frontstageCollaboratorId: null,
      preferredProjectId: 'workspace-1',
      activeConversationId: 'conversation-1',
      activeConversationCollaboratorId: 'lyra'
    })).toBe(false);
  });
});

describe('resolveFreshConversationProjectId', () => {
  it('does not inherit the active chat workspace when creating a fresh chat', () => {
    expect(resolveFreshConversationProjectId({
      activeWorld: 'chat',
      preferredProjectId: 'workspace-1'
    })).toBeNull();
  });

  it('keeps the explicit collection workspace when creating from collection', () => {
    expect(resolveFreshConversationProjectId({
      activeWorld: 'collection',
      preferredProjectId: 'workspace-1'
    })).toBe('workspace-1');
  });
});

describe('resolveFallbackChatConversationForWorldReturn', () => {
  const conversations: Conversation[] = [
    {
      id: 'conversation-old',
      title: 'Old chat',
      collaboratorId: 'lyra',
      activeProjectId: null,
      draft: '',
      pinnedAt: null,
      updatedAt: 1,
      messages: []
    },
    {
      id: 'conversation-workspace',
      title: 'Workspace chat',
      collaboratorId: 'lyra',
      activeProjectId: 'workspace-1',
      draft: '',
      pinnedAt: null,
      updatedAt: 2,
      messages: []
    },
    {
      id: 'conversation-other-owner',
      title: 'Other owner workspace chat',
      collaboratorId: 'pharos',
      activeProjectId: 'workspace-2',
      draft: '',
      pinnedAt: null,
      updatedAt: 3,
      messages: []
    }
  ];

  it('prefers the active conversation when it already owns the current workspace', () => {
    expect(resolveFallbackChatConversationForWorldReturn({
      conversations,
      preferredProjectId: 'workspace-1',
      frontstageCollaboratorId: 'lyra',
      activeConversationId: 'conversation-workspace'
    })?.id).toBe('conversation-workspace');
  });

  it('finds the workspace conversation even when frontstage collaborator is missing', () => {
    expect(resolveFallbackChatConversationForWorldReturn({
      conversations,
      preferredProjectId: 'workspace-1',
      frontstageCollaboratorId: null,
      activeConversationId: 'conversation-old'
    })?.id).toBe('conversation-workspace');
  });

  it('prefers a collaborator-matched workspace conversation before falling back to any owner', () => {
    expect(resolveFallbackChatConversationForWorldReturn({
      conversations,
      preferredProjectId: 'workspace-2',
      frontstageCollaboratorId: 'pharos',
      activeConversationId: 'conversation-old'
    })?.id).toBe('conversation-other-owner');
  });
});

describe('entering chat from the collection after switching personas', () => {
  const personas = [
    { id: 'existing', name: 'Existing' },
    { id: 'new-role', name: 'New Role' }
  ] as Persona[];

  const build = (options: {
    conversations: Conversation[];
    previewConversationId?: string | null;
    activeConversationId?: string | null;
    activeConversationCollaboratorId?: string | null;
  }) => {
    const created: string[] = [];
    const activated: string[] = [];
    const worlds: string[] = [];
    const cleared: string[] = [];
    const actions = useAppShellNavigationActions({
      previewConversationId: options.previewConversationId ?? null,
      personas,
      conversations: options.conversations,
      activeWorld: 'collection',
      frontstageCollaboratorId: 'new-role',
      collectionProjectId: null,
      activeCollaboratorId: 'new-role',
      activeConversationId: options.activeConversationId ?? 'old-chat',
      activeConversationCollaboratorId: options.activeConversationCollaboratorId ?? 'existing',
      activeConversationProjectId: null,
      setWorld: (world) => worlds.push(world),
      createConversation: (owner) => {
        created.push(owner ?? 'missing');
        return 'new-chat';
      },
      setActiveConversation: (id) => activated.push(id),
      clearPendingAttachments: () => cleared.push('attachments'),
      clearPendingCardReference: () => cleared.push('card')
    });
    return { actions, created, activated, worlds, cleared };
  };

  it('creates a separate conversation for a new persona rather than displaying the old persona history', () => {
    const state = build({
      conversations: [{ id: 'old-chat', collaboratorId: 'existing', activeProjectId: null }] as Conversation[]
    });
    state.actions.openPreviewChat();
    expect(state.created).toEqual(['new-role']);
    expect(state.activated).toEqual([]); // chat store's createConversation activates its new record
    expect(state.cleared).toEqual(['attachments', 'card']);
    expect(state.worlds).toEqual(['chat']);
  });

  it('reopens the selected persona existing thread instead of reusing a different persona conversation', () => {
    const state = build({
      conversations: [
        { id: 'old-chat', collaboratorId: 'existing', activeProjectId: null },
        { id: 'right-chat', collaboratorId: 'new-role', activeProjectId: null }
      ] as Conversation[]
    });
    state.actions.openPreviewChat();
    expect(state.created).toEqual([]);
    expect(state.activated).toEqual(['right-chat']);
    expect(state.worlds).toEqual(['chat']);
  });

  it('creates a fresh chat owned by the explicitly picked contact', () => {
    const state = build({
      conversations: [{ id: 'old-chat', collaboratorId: 'existing', activeProjectId: null }] as Conversation[]
    });
    state.actions.openFreshConversationForCollaborator('new-role');
    expect(state.created).toEqual(['new-role']);
    expect(state.activated).toEqual(['new-chat']);
    expect(state.cleared).toEqual(['attachments', 'card']);
    expect(state.worlds).toEqual(['chat']);
  });

  it('refuses to create a conversation for an unknown contact', () => {
    const state = build({ conversations: [] });
    state.actions.openFreshConversationForCollaborator('removed-role');
    expect(state.created).toEqual([]);
    expect(state.worlds).toEqual([]);
  });

  it('keeps explicit theme preview navigation intact', () => {
    const state = build({
      previewConversationId: 'preview-chat',
      conversations: [{ id: 'old-chat', collaboratorId: 'existing', activeProjectId: null }] as Conversation[]
    });
    state.actions.openPreviewChat();
    expect(state.created).toEqual([]);
    expect(state.activated).toEqual(['preview-chat']);
    expect(state.worlds).toEqual(['chat']);
  });
});
