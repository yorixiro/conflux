import { describe, expect, it } from 'vitest';
import {
  conversationMatchesCollaboratorScope,
  isConversationOrphaned,
  resolveConversationCollaboratorId,
  resolveConversationCollaboratorName,
  resolveChatSidebarScope
} from './conversationOwnership';

describe('conversationOwnership', () => {
  it('resolves collaborator id from the conversation', () => {
    expect(resolveConversationCollaboratorId({ collaboratorId: 'lyra' })).toBe('lyra');
  });

  it('treats null collaborator ids as orphaned history', () => {
    expect(resolveConversationCollaboratorId({ collaboratorId: null })).toBeNull();
    expect(isConversationOrphaned({ collaboratorId: null })).toBe(true);
  });

  it('resolves collaborator name from known personas', () => {
    expect(resolveConversationCollaboratorName(
      { collaboratorId: 'lyra' },
      [{ id: 'lyra', name: 'Lyra' }] as never[]
    )).toBe('Lyra');
  });

  it('labels missing collaborators as orphaned history', () => {
    expect(resolveConversationCollaboratorName(
      { collaboratorId: 'unknown' },
      [] as never[]
    )).toBe('未归属历史');
  });

  it('renders orphaned history with a dedicated label', () => {
    expect(resolveConversationCollaboratorName(
      { collaboratorId: null },
      [] as never[]
    )).toBe('未归属历史');
  });

  it('keeps owned conversations scoped to their collaborator', () => {
    expect(conversationMatchesCollaboratorScope({ collaboratorId: 'nova' }, 'nova')).toBe(true);
    expect(conversationMatchesCollaboratorScope({ collaboratorId: 'lyra' }, 'nova')).toBe(false);
  });

  it('keeps orphaned histories out of concrete collaborator scopes', () => {
    expect(conversationMatchesCollaboratorScope({ collaboratorId: null }, 'nova')).toBe(false);
  });

  it('keeps histories with missing collaborators out of concrete collaborator scopes', () => {
    expect(conversationMatchesCollaboratorScope({ collaboratorId: 'missing' }, 'nova', ['nova'])).toBe(false);
    expect(isConversationOrphaned({ collaboratorId: 'missing' }, ['nova'])).toBe(true);
  });

  it('shows every conversation in the unscoped total list', () => {
    expect(conversationMatchesCollaboratorScope({ collaboratorId: 'nova' }, null)).toBe(true);
    expect(conversationMatchesCollaboratorScope({ collaboratorId: null }, null)).toBe(true);
  });

  it('keeps group conversations out of collaborator scopes and aggregate room lists', () => {
    expect(conversationMatchesCollaboratorScope({ collaboratorId: null, groupRoomId: 'group-1' }, null)).toBe(false);
    expect(conversationMatchesCollaboratorScope({ collaboratorId: 'nova', groupRoomId: 'group-1' }, 'nova')).toBe(false);
  });
});


describe('resolveChatSidebarScope', () => {
  const knownCollaboratorIds = ['old-role', 'new-role'];

  it('uses the actual conversation owner when a new persona is selected but the old chat is still open', () => {
    expect(resolveChatSidebarScope({
      activeWorld: 'chat', activeConversationId: 'old-chat',
      activeConversationCollaboratorId: 'old-role', frontstageCollaboratorId: 'new-role',
      knownCollaboratorIds
    })).toBe('old-role');
  });

  it('keeps the selected persona scope inside the collection and before opening a chat', () => {
    expect(resolveChatSidebarScope({
      activeWorld: 'collection', activeConversationId: 'old-chat',
      activeConversationCollaboratorId: 'old-role', frontstageCollaboratorId: 'new-role',
      knownCollaboratorIds
    })).toBe('new-role');
    expect(resolveChatSidebarScope({
      activeWorld: 'chat', activeConversationId: null,
      activeConversationCollaboratorId: null, frontstageCollaboratorId: 'new-role',
      knownCollaboratorIds
    })).toBe('new-role');
  });

  it('shows aggregate history when the visible conversation belongs to a deleted or unknown role', () => {
    expect(resolveChatSidebarScope({
      activeWorld: 'chat', activeConversationId: 'orphan-chat',
      activeConversationCollaboratorId: null, frontstageCollaboratorId: 'new-role',
      knownCollaboratorIds
    })).toBeNull();
    expect(resolveChatSidebarScope({
      activeWorld: 'chat', activeConversationId: 'unknown-chat',
      activeConversationCollaboratorId: 'missing-role', frontstageCollaboratorId: 'new-role',
      knownCollaboratorIds
    })).toBeNull();
  });
});
