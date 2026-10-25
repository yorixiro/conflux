import { describe, expect, it } from 'vitest';
import { resolveCollectionRenderItemCount } from './collectionRenderLoad';
import type { CodeCard, Conversation, ImageAssetCard, ProjectFile, RoomProject } from '../../types/domain';

function conversation(seed: Partial<Conversation> & Pick<Conversation, 'id'>): Conversation {
  return {
    title: seed.title ?? seed.id,
    collaboratorId: seed.collaboratorId ?? null,
    messages: seed.messages ?? [{
      id: `${seed.id}-message`,
      role: 'user',
      origin: 'user-input',
      content: 'hello',
      timestamp: 1
    }],
    pinnedAt: null,
    updatedAt: 1,
    ...seed
  };
}

function card(seed: Partial<CodeCard> & Pick<CodeCard, 'id'>): CodeCard {
  return {
    title: seed.id,
    language: 'text',
    code: 'content',
    tags: [],
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    ...seed
  };
}

function imageCard(seed: Partial<ImageAssetCard> & Pick<ImageAssetCard, 'id'>): ImageAssetCard {
  return {
    assetId: `${seed.id}-asset`,
    title: seed.id,
    tags: [],
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    ...seed
  };
}

function project(seed: Partial<RoomProject> & Pick<RoomProject, 'id'>): RoomProject {
  return {
    title: seed.id,
    slug: seed.id,
    fileIds: [],
    tags: [],
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    ...seed
  };
}

function projectFile(seed: Partial<ProjectFile> & Pick<ProjectFile, 'id' | 'projectId'>): ProjectFile {
  return {
    filePath: `${seed.id}.txt`,
    language: 'text',
    content: '',
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    ...seed
  };
}

const baseArgs = {
  frontstageCollaboratorId: null,
  conversations: [] as Conversation[],
  cards: [] as CodeCard[],
  imageCards: [] as ImageAssetCard[],
  roomProjects: [] as RoomProject[],
  projectFiles: [] as ProjectFile[]
};

describe('resolveCollectionRenderItemCount', () => {
  it('counts album assets without tying the booklet to the current chat collaborator', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'album',
      frontstageCollaboratorId: 'aa',
      imageCards: [imageCard({ id: 'self' }), imageCard({ id: 'ai', ownerCollaboratorId: 'bb' })]
    });
    expect(count).toBe(2);
  });
  it('keeps orphaned history out of concrete collaborator dialogue counts', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'dialogue',
      frontstageCollaboratorId: 'aa',
      conversations: [
        conversation({ id: 'visible', collaboratorId: 'aa' }),
        conversation({ id: 'orphaned', collaboratorId: null }),
        conversation({ id: 'other', collaboratorId: 'bb' }),
        conversation({ id: 'empty', collaboratorId: 'aa', messages: [] })
      ]
    });

    expect(count).toBe(1);
  });

  it('keeps histories whose collaborator no longer exists out of concrete collaborator counts', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'dialogue',
      frontstageCollaboratorId: 'aa',
      knownCollaboratorIds: ['aa'],
      conversations: [
        conversation({ id: 'missing-owner', collaboratorId: 'old-collaborator' })
      ]
    });

    expect(count).toBe(0);
  });

  it('counts orphaned and missing-collaborator histories in the aggregate dialogue scope', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'dialogue',
      frontstageCollaboratorId: null,
      knownCollaboratorIds: ['aa'],
      conversations: [
        conversation({ id: 'visible', collaboratorId: 'aa' }),
        conversation({ id: 'orphaned', collaboratorId: null }),
        conversation({ id: 'missing-owner', collaboratorId: 'old-collaborator' })
      ]
    });

    expect(count).toBe(3);
  });

  it('counts unloaded indexed dialogue records as visible archive entries', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'dialogue',
      frontstageCollaboratorId: 'aa',
      loadedMessageConversationIds: ['active'],
      conversations: [
        conversation({ id: 'active', collaboratorId: 'aa' }),
        conversation({ id: 'old', collaboratorId: 'aa', messages: [] })
      ]
    });

    expect(count).toBe(2);
  });

  it('does not count loaded empty dialogue records', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'dialogue',
      frontstageCollaboratorId: 'aa',
      loadedMessageConversationIds: ['empty'],
      conversations: [
        conversation({ id: 'empty', collaboratorId: 'aa', messages: [] })
      ]
    });

    expect(count).toBe(0);
  });

  it('counts code cards and file attachments for the current collaborator', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'code',
      frontstageCollaboratorId: 'aa',
      conversations: [
        conversation({
          id: 'aa-conv',
          collaboratorId: 'aa',
          messages: [{
            id: 'file-message',
            role: 'user',
            origin: 'user-input',
            content: 'file',
            timestamp: 1,
            attachments: [{
              id: 'file',
              assetId: 'asset',
              kind: 'file',
              name: 'note.md',
              mimeType: 'text/markdown',
              size: 10
            }]
          }]
        }),
        conversation({ id: 'bb-conv', collaboratorId: 'bb' })
      ],
      cards: [
        card({ id: 'owned', ownerCollaboratorId: 'aa' }),
        card({ id: 'fallback', originConversationId: 'aa-conv' }),
        card({ id: 'rule', kind: 'room-rule', ownerCollaboratorId: 'aa' }),
        card({ id: 'other', ownerCollaboratorId: 'bb' })
      ]
    });

    expect(count).toBe(3);
  });

  it('counts projects by owner or scoped files', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'project',
      frontstageCollaboratorId: 'aa',
      roomProjects: [
        project({ id: 'owned', ownerCollaboratorId: 'aa' }),
        project({ id: 'file-owned' }),
        project({ id: 'other', ownerCollaboratorId: 'bb' })
      ],
      projectFiles: [
        projectFile({ id: 'file', projectId: 'file-owned', ownerCollaboratorId: 'aa' })
      ]
    });

    expect(count).toBe(2);
  });

  it('counts image cards by explicit or origin ownership', () => {
    const count = resolveCollectionRenderItemCount({
      ...baseArgs,
      collectionShelf: 'image',
      frontstageCollaboratorId: 'aa',
      conversations: [
        conversation({ id: 'origin', collaboratorId: 'aa' })
      ],
      imageCards: [
        imageCard({ id: 'owned', ownerCollaboratorId: 'aa' }),
        imageCard({ id: 'fallback', originConversationId: 'origin' }),
        imageCard({ id: 'other', ownerCollaboratorId: 'bb' })
      ]
    });

    expect(count).toBe(2);
  });
});
