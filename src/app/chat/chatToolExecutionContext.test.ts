import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDirectToolExecutionContext } from './chatToolExecutionContext';
import * as assets from '../../infrastructure/assetStore';

afterEach(() => vi.restoreAllMocks());

describe('buildDirectToolExecutionContext', () => {
  it('keeps environment access and sticker metadata in the composed execution surface', async () => {
    vi.spyOn(assets, 'getAssetMeta').mockImplementation(async (id) => ({
      id, kind: 'image', name: 'image.png', mimeType: 'image/png', size: 20, createdAt: 1
    }));
    vi.spyOn(assets, 'getAssetBlob').mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    const collectionState = {
      cards: [],
      imageCards: [
        { id: 'sticker-card', assetId: 'sticker-asset', title: '安慰', tags: [], source: 'manual',
          createdAt: 1, updatedAt: 1, sticker: { purpose: '安慰', moods: ['抱抱'] } },
        { id: 'image-card', assetId: 'image-asset', title: '照片', tags: [], source: 'manual',
          createdAt: 1, updatedAt: 1 }
      ],
      roomProjects: [],
      projectFiles: [],
      workspaceReferenceDocs: []
    };
    const context = buildDirectToolExecutionContext({
      chat: {
        conversations: [],
        findConversation: () => null,
        getConversationMessages: () => [],
        setConversationActiveProject: () => undefined,
        readLatestState: () => ({ conversations: [] })
      },
      collection: {
        ...collectionState,
        readLatestState: () => collectionState
      },
      persona: { personas: [] },
      runtime: {
        api: { id: 'test-provider' },
        providers: [],
        mcpServers: [],
        search: {},
        imageGeneration: { enabled: false }
      },
      space: {
        activeCardId: null,
        activeWorld: 'chat',
        collectionShelf: 'code',
        setCollectionShelf: () => undefined,
        setWorld: () => undefined,
        setActiveCard: () => undefined,
        spotlightCard: () => undefined,
        applyThemePatch: () => undefined,
        applyThemePreset: () => undefined,
        getCurrentThemeFrame: () => ({})
      },
      memoryActions: {
        appendCollaboratorMemories: () => undefined,
        writeCollaboratorMemoryDoc: () => undefined,
        readCollaboratorMemoryDoc: () => null
      },
      conversationId: 'conversation-test',
      ownerCollaboratorId: null,
      activeProjectId: null
    } as unknown as Parameters<typeof buildDirectToolExecutionContext>[0]);

    expect(context.readEnvironmentDirectory).toBeTypeOf('function');
    const sticker = await context.sendImageAttachment?.('sticker-card', '抱抱.png');
    expect(sticker).toMatchObject({ ok: true, attachment: {
      assetId: 'sticker-asset', name: '抱抱.png', presentation: 'sticker'
    } });
    const image = await context.sendImageAttachment?.('image-card');
    expect(image).toMatchObject({ ok: true, attachment: { assetId: 'image-asset' } });
    if (image?.ok) expect(image.attachment.presentation).toBeUndefined();
  });
});
