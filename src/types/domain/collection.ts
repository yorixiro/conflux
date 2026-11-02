import type { CodeCardFileRole, ProjectFileSource, RoomProjectSource, WorkspaceReferenceDocSource } from './primitives';

/** Room (formerly "Code Card"). A persistent co-created space. */
export interface CodeCard {
  id: string;
  kind?: 'card' | 'room-rule' | 'tool';
  title: string;
  cardNote?: string;
  language: string;
  code: string;
  cardFaceCss?: string;
  tags: string[];
  ownerCollaboratorId?: string;
  source: 'manual' | 'chat-generated' | 'imported';
  createdAt: number;
  updatedAt: number;
  pinnedAt?: number | null;
  originConversationId?: string;
  originMessageId?: string;
  originBlockIndex?: number;
  originBlockTitle?: string;
}

export interface CardPromotionSnapshot {
  cardId: string;
  originalTitle: string;
  originalTags: string[];
  originalCardNote?: string;
  originalCardFaceCss?: string;
  originalKind: 'card' | 'room-rule' | 'tool';
  source?: CodeCard['source'];
  originConversationId?: string;
  originMessageId?: string;
  originBlockIndex?: number;
  originBlockTitle?: string;
  promotedAt: number;
}

export interface RoomProject {
  id: string;
  title: string;
  slug: string;
  ownerCollaboratorId?: string;
  entryFileId?: string;
  fileIds: string[];
  tags: string[];
  coverNote?: string;
  coverStyle?: string;
  desktopBinding?: DesktopWorkspaceBinding;
  previewStateAccess?: WorkspacePreviewStateAccess;
  promotionSnapshot?: CardPromotionSnapshot;
  source: RoomProjectSource;
  createdAt: number;
  updatedAt: number;
  pinnedAt?: number | null;
}

export interface WorkspacePreviewStateAccess {
  assistantReadEnabled: boolean;
  updatedAt?: number;
}

export interface DesktopWorkspaceBinding {
  rootId: string;
  rootLabel: string;
  manifestPath: string;
  entryFilePath: string;
  linkedAt: number;
  syncedAt: number;
  fileSync?: Record<string, DesktopWorkspaceFileSyncEntry>;
}

export interface DesktopWorkspaceFileSyncEntry {
  path: string;
  diskHash: string;
  polarisHash: string;
  diskUpdatedAt: number;
  polarisUpdatedAt: number;
  syncedAt: number;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  filePath: string;
  fileRole?: CodeCardFileRole;
  language: string;
  content: string;
  ownerCollaboratorId?: string;
  source: ProjectFileSource;
  createdAt: number;
  updatedAt: number;
  originConversationId?: string;
  originMessageId?: string;
  originBlockIndex?: number;
  originBlockTitle?: string;
}

export interface WorkspaceReferenceDoc {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  content: string;
  charCount?: number;
  contentLoaded?: boolean;
  ownerCollaboratorId?: string;
  source: WorkspaceReferenceDocSource;
  createdAt: number;
  updatedAt: number;
  originConversationId?: string;
  originMessageId?: string;
}

export interface ChatCardReference {
  id: string;
  title: string;
  cardNote?: string;
  language: string;
  code: string;
  cardFaceCss?: string;
  mode: 'continue' | 'reference';
}

/** Human-readable sticker usage attached to an existing image card; the card ID is the sticker ID. */
export type ImageStickerMetadata = {
  purpose: string;
  moods: string[];
};

export interface ImageAssetCard {
  id: string;
  sticker?: ImageStickerMetadata;
  assetId: string;
  title: string;
  tags: string[];
  ownerCollaboratorId?: string;
  source: 'manual' | 'chat-generated' | 'imported';
  createdAt: number;
  updatedAt: number;
  originConversationId?: string;
  originMessageId?: string;
  originAttachmentId?: string;
  publicShareId?: string;
  publicShareUrl?: string;
  publicSharedAt?: number;
}

