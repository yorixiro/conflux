import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conversation } from '../types/domain';
import {
  buildConversationLocalDataUnitOfWork,
  getChatDomainMetaLocalDataRef,
  getLocalDataActiveDataSourceKey,
  getLocalDataCommitPointerKey,
  getLocalDataRowKey,
  LOCAL_DATA_SCHEMA_VERSION,
  type CommitPointerRow,
  type LocalDataActiveDataSourceRow
} from '../engines/localData';

// Ordinary chat save must be a new-layer-only write. Polaris is not an in-place
// compatibility runtime for the old line: the legacy `chat-catalog-v1` /
// `chat-conversation-record-v1:*` format may only be produced at explicit
// import / export-rehearsal / recovery boundaries, never by the product save path —
// whether or not the chat domain has been promoted to the active data source.

const persistenceMocks = vi.hoisted(() => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
  kvDel: vi.fn(),
  kvApplyMutations: vi.fn(),
  kvReplaceAll: vi.fn(),
  kvEntries: vi.fn(),
  kvKeys: vi.fn(),
  kvKeysWithPrefix: vi.fn(),
  getPersistenceLocalDataCommitMode: vi.fn(() => 'transactional'),
  withExclusiveKvWriteGate: vi.fn(async (run: (token: unknown) => unknown) => run({})),
  acquireExclusiveKvWriteGate: vi.fn(async () => ({ token: {}, release: vi.fn() }))
}));

vi.mock('../infrastructure/persistence', () => persistenceMocks);

const LEGACY_CHAT_CATALOG_KEY = 'chat-catalog-v1';
const LEGACY_CHAT_RECORD_PREFIX = 'chat-conversation-record-v1:';

function createMemoryKv(initialEntries: Array<[string, unknown]> = []) {
  const values = new Map<string, unknown>(initialEntries);
  persistenceMocks.kvGet.mockImplementation(async (key: string) => values.get(key) ?? null);
  persistenceMocks.kvSet.mockImplementation(async (key: string, value: unknown) => {
    values.set(key, value);
  });
  persistenceMocks.kvDel.mockImplementation(async (key: string) => {
    values.delete(key);
  });
  persistenceMocks.kvApplyMutations.mockImplementation(
    async (mutations: Array<{ type: 'set' | 'delete'; key: string; value?: unknown }>) => {
      for (const mutation of mutations) {
        if (mutation.type === 'set') values.set(mutation.key, mutation.value);
        else values.delete(mutation.key);
      }
    }
  );
  persistenceMocks.kvKeys.mockImplementation(async () => Array.from(values.keys()));
  persistenceMocks.kvKeysWithPrefix.mockImplementation(async (prefix: string) =>
    Array.from(values.keys()).filter((key) => key.startsWith(prefix))
  );
  return values;
}

function buildConversation(id: string, messageIds: string[], updatedAt = 1): Conversation {
  return {
    id,
    title: id,
    collaboratorId: 'pharos',
    activeProjectId: null,
    draft: `${id}-draft`,
    pinnedAt: null,
    updatedAt,
    messages: messageIds.map((messageId) => ({
      id: messageId,
      role: 'user' as const,
      content: messageId,
      timestamp: 1
    }))
  };
}

function seedActiveLocalDataChatRepository(
  values: Map<string, unknown>,
  conversations: Conversation[],
  activeConversationId: string | null,
  committedAt = 100
) {
  const commitPointer: CommitPointerRow = {
    domain: 'chat',
    version: LOCAL_DATA_SCHEMA_VERSION,
    committedAt,
    commitId: `chat-seed-${committedAt}`
  };
  const unit = buildConversationLocalDataUnitOfWork({
    activeConversationId,
    conversations: conversations.map((conversation) => ({
      conversation,
      bodyState: 'complete' as const,
      version: LOCAL_DATA_SCHEMA_VERSION,
      committedAt
    })),
    version: LOCAL_DATA_SCHEMA_VERSION,
    updatedAt: committedAt
  });
  for (const mutation of unit.mutations) {
    if (mutation.type === 'put' || mutation.type === 'restore') {
      values.set(mutation.row.key, mutation.row);
    }
  }
  values.set(getLocalDataCommitPointerKey('chat'), commitPointer);
  values.set(getLocalDataActiveDataSourceKey(), {
    schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
    key: getLocalDataActiveDataSourceKey(),
    activeDataSource: 'repository',
    activeCommitId: commitPointer.commitId,
    stagingCommitId: null,
    updatedAt: committedAt,
    domains: { chat: commitPointer }
  } satisfies LocalDataActiveDataSourceRow);
}

function legacyCatalogKeys(values: Map<string, unknown>) {
  return Array.from(values.keys()).filter(
    (key) => key === LEGACY_CHAT_CATALOG_KEY || key.startsWith(LEGACY_CHAT_RECORD_PREFIX)
  );
}

function hasChatDomainMetaRow(values: Map<string, unknown>) {
  return values.has(getLocalDataRowKey(getChatDomainMetaLocalDataRef()));
}

describe('ordinary chat save legacy-catalog boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistenceMocks.getPersistenceLocalDataCommitMode.mockReturnValue('transactional');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('writes new-layer rows and never the legacy catalog when the chat repository is promoted', async () => {
    const { persistChatStateChange } = await import('./chatCurrentPersistence');
    const conversation = buildConversation('conv-a', ['a-1'], 10);
    const values = createMemoryKv();
    seedActiveLocalDataChatRepository(values, [conversation], 'conv-a');

    await persistChatStateChange({
      conversations: [buildConversation('conv-a', ['a-1', 'a-2'], 25)],
      activeConversationId: 'conv-a',
      dirtyConversationIds: ['conv-a'],
      loadedConversationIds: ['conv-a'],
      deletedConversationIds: []
    });

    expect(hasChatDomainMetaRow(values)).toBe(true);
    expect(legacyCatalogKeys(values)).toEqual([]);
  });

  it('writes new-layer rows and never the legacy catalog when the chat repository is NOT promoted', async () => {
    // The previously-"inactive" save path: no active-data-source row exists, so the row
    // writer declines and the whole-state fallback runs. It must still write the new-layer
    // chat rows (overlay), never resurrect the old `chat-catalog-v1` /
    // `chat-conversation-record-v1:*` format.
    const { persistChatStateChange } = await import('./chatCurrentPersistence');
    const values = createMemoryKv();

    await persistChatStateChange({
      conversations: [buildConversation('conv-a', ['a-1'], 10)],
      activeConversationId: 'conv-a',
      dirtyConversationIds: ['conv-a'],
      loadedConversationIds: ['conv-a'],
      deletedConversationIds: []
    });

    expect(hasChatDomainMetaRow(values)).toBe(true);
    expect(legacyCatalogKeys(values)).toEqual([]);
    // And no global active-data-source was forged by an ordinary save either.
    expect(values.has(getLocalDataActiveDataSourceKey())).toBe(false);
  });

  it('rejects an ordinary whole-state overlay write with a missing active pointer', async () => {
    const { persistChatStateChange } = await import('./chatCurrentPersistence');
    const values = createMemoryKv();

    await expect(persistChatStateChange({
      conversations: [buildConversation('conv-a', ['a-1'], 10)],
      activeConversationId: 'conv-missing',
      dirtyConversationIds: ['conv-a'],
      loadedConversationIds: ['conv-a'],
      deletedConversationIds: []
    })).rejects.toThrow('Active chat LocalData write points at a missing conversation: conv-missing');

    expect(hasChatDomainMetaRow(values)).toBe(false);
    expect(legacyCatalogKeys(values)).toEqual([]);
    expect(values.has(getLocalDataActiveDataSourceKey())).toBe(false);
  });
});

describe('lazy conversation draft readback', () => {
  it('restores a background draft before a rename can overwrite its durable record', async () => {
    const { useChatStore } = await import('./chatStore');
    const { projectHydratedChatStorePatch } = await import('./chatStoreHydration');
    const { readLiveChatStateWithOptions, readCompleteLiveChatState } = await import('./chatCurrentPersistence');
    const background = buildConversation('draft-background', ['background-1']);
    const active = buildConversation('draft-active', ['active-1']);
    const values = createMemoryKv();
    seedActiveLocalDataChatRepository(values, [background, active], active.id);
    useChatStore.setState(projectHydratedChatStorePatch(await readLiveChatStateWithOptions({ readMode: 'active-only' })));
    expect(useChatStore.getState().conversations.find((entry) => entry.id === background.id)?.draft).toBe('');

    useChatStore.getState().setActiveConversation(background.id);
    await useChatStore.getState().ensureConversationMessagesLoaded(background.id);
    expect(useChatStore.getState().inputDraft).toBe(background.draft);
    expect(useChatStore.getState().conversations.find((entry) => entry.id === background.id)?.draft).toBe(background.draft);
    useChatStore.getState().renameConversation(background.id, 'renamed');
    await useChatStore.getState().persistToDb();
    expect((await readCompleteLiveChatState())?.conversations.find((entry) => entry.id === background.id)?.draft).toBe(background.draft);
    expect(legacyCatalogKeys(values)).toEqual([]);
  });

  it('keeps a draft typed while the background body is loading', async () => {
    const { useChatStore } = await import('./chatStore');
    const { projectHydratedChatStorePatch } = await import('./chatStoreHydration');
    const { readLiveChatStateWithOptions } = await import('./chatCurrentPersistence');
    const background = buildConversation('draft-in-flight', ['background-1']);
    const active = buildConversation('draft-active', ['active-1']);
    const values = createMemoryKv();
    seedActiveLocalDataChatRepository(values, [background, active], active.id);
    useChatStore.setState(projectHydratedChatStorePatch(await readLiveChatStateWithOptions({ readMode: 'active-only' })));
    useChatStore.getState().setActiveConversation(background.id);
    useChatStore.getState().setInputDraft('new typing wins');
    await useChatStore.getState().ensureConversationMessagesLoaded(background.id);
    expect(useChatStore.getState().inputDraft).toBe('new typing wins');
    expect(useChatStore.getState().conversations.find((entry) => entry.id === background.id)?.draft).toBe('new typing wins');
  });
});
