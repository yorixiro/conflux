import { saveAsset, dataUrlToBlob } from '../infrastructure/assetStore';
import { createDomainObjectBase } from '../engines/domainObject';
import { isGenericImageTitle } from '../engines/imageAssetNaming';
import { inferImageAssetTags, normalizeImageAssetTags } from '../engines/imageAssetTags';
import { normalizeStickerMetadata } from '../engines/stickerCatalog';
import type { ImageAssetCard } from '../types/domain';

export type ImageCardPatch = Partial<Pick<
  ImageAssetCard,
  'publicShareId' | 'publicShareUrl' | 'publicSharedAt' | 'tags' | 'title'
>> & { sticker?: ImageAssetCard['sticker'] | null };

export type SaveImageFromChatInput = {
  assetId: string;
  title?: string;
  tags?: string[];
  ownerCollaboratorId?: string;
  imageName: string;
  conversationId: string;
  messageId: string;
  attachmentId: string;
};

export type CreateImageCardFromAssetInput = {
  assetId: string;
  title?: string;
  tags?: string[];
  ownerCollaboratorId?: string;
  imageName: string;
  source?: ImageAssetCard['source'];
};

function fallbackImageTitle(tags: string[]) {
  if (tags.includes('二维码')) return '二维码';
  if (tags.includes('截图')) return '截图';
  if (tags.includes('正片')) return '正片';
  if (tags.includes('生成图')) return '生成图';
  if (tags.includes('参考图')) return '参考图';
  return '图片收藏';
}

export function sortImageCards(cards: ImageAssetCard[]): ImageAssetCard[] {
  return [...cards].sort((left, right) => right.updatedAt - left.updatedAt);
}

function deriveImageCardTitle(imageName: string, title: string | undefined, tags: string[]) {
  const nextTitle = title?.trim();
  if (nextTitle && !isGenericImageTitle(nextTitle)) return nextTitle;
  const normalized = imageName.replace(/\.[a-z0-9]+$/i, '').trim();
  if (normalized && !isGenericImageTitle(normalized)) return normalized;
  return fallbackImageTitle(tags);
}

export function normalizeImageCard(
  card: (Partial<ImageAssetCard> & { ownerPersonaId?: string; imageName?: string }) & Pick<ImageAssetCard, 'id' | 'assetId'>
): ImageAssetCard {
  const createdAt = typeof card.createdAt === 'number' ? card.createdAt : Date.now();
  const updatedAt = typeof card.updatedAt === 'number' ? card.updatedAt : createdAt;
  const normalizedTags = normalizeImageAssetTags(card.tags) || [];
  const fallbackImageName = card.imageName?.trim() || card.title?.trim() || 'image';
  const resolvedTags = normalizedTags.length
    ? normalizedTags
    : inferImageAssetTags({ title: card.title, imageName: fallbackImageName });

  return {
    id: card.id,
    assetId: card.assetId,
    sticker: normalizeStickerMetadata(card.sticker),
    title: deriveImageCardTitle(fallbackImageName, card.title, resolvedTags),
    tags: resolvedTags,
    ownerCollaboratorId:
      typeof card.ownerCollaboratorId === 'string'
        ? card.ownerCollaboratorId
        : typeof card.ownerPersonaId === 'string'
          ? card.ownerPersonaId
          : undefined,
    source: card.source ?? 'manual',
    createdAt,
    updatedAt,
    originConversationId: card.originConversationId,
    originMessageId: card.originMessageId,
    originAttachmentId: card.originAttachmentId,
    publicShareId: typeof card.publicShareId === 'string' && card.publicShareId.trim()
      ? card.publicShareId.trim()
      : undefined,
    publicShareUrl: typeof card.publicShareUrl === 'string' && card.publicShareUrl.trim()
      ? card.publicShareUrl.trim()
      : undefined,
    publicSharedAt: typeof card.publicSharedAt === 'number' ? card.publicSharedAt : undefined
  };
}

export function createImageCardFromChat(input: SaveImageFromChatInput) {
  return normalizeImageCard({
    ...createDomainObjectBase('asset'),
    assetId: input.assetId,
    title: input.title,
    tags: input.tags,
    ownerCollaboratorId: input.ownerCollaboratorId,
    imageName: input.imageName,
    source: 'chat-generated',
    originConversationId: input.conversationId,
    originMessageId: input.messageId,
    originAttachmentId: input.attachmentId
  });
}

export function createImageCardFromAsset(input: CreateImageCardFromAssetInput) {
  return normalizeImageCard({
    ...createDomainObjectBase('asset'),
    assetId: input.assetId,
    title: input.title,
    tags: input.tags,
    ownerCollaboratorId: input.ownerCollaboratorId,
    imageName: input.imageName,
    source: input.source ?? 'manual'
  });
}

export function removeImageCard(cards: ImageAssetCard[], cardId: string) {
  return cards.filter((card) => card.id !== cardId);
}

export function patchImageCards(
  cards: ImageAssetCard[],
  cardId: string,
  patch: ImageCardPatch
) {
  return sortImageCards(
    cards.map((card) =>
      card.id === cardId
        ? normalizeImageCard({
            ...card,
            ...patch,
            title: patch.title !== undefined ? patch.title : card.title,
            tags: patch.tags !== undefined ? patch.tags : card.tags,
            sticker: patch.sticker === null ? undefined : patch.sticker !== undefined ? patch.sticker : card.sticker,
            updatedAt: Date.now()
          })
        : card
    )
  );
}

export async function migrateLegacyImageCard(card: (Partial<ImageAssetCard> & {
  ownerPersonaId?: string;
  imageName?: string;
  mimeType?: string;
  size?: number;
  dataUrl?: string;
}) & { id: string }): Promise<ImageAssetCard> {
  if (typeof card.assetId === 'string' && card.assetId.trim()) {
    return normalizeImageCard(card as ImageAssetCard & { ownerPersonaId?: string; imageName?: string });
  }
  if (!card.dataUrl) {
    throw new Error(`图片卡 ${card.id} 缺少资产内容`);
  }

  const fallbackImageName = card.imageName?.trim() || card.title?.trim() || `${card.id}.png`;
  const mimeType = card.mimeType?.trim() || 'image/*';
  const blob = await dataUrlToBlob(card.dataUrl);
  const asset = await saveAsset({
    kind: 'image',
    name: fallbackImageName,
    mimeType,
    blob,
    createdAt: typeof card.createdAt === 'number' ? card.createdAt : Date.now(),
    previewBlob: blob
  });

  return normalizeImageCard({
    ...card,
    assetId: asset.id,
    imageName: fallbackImageName
  });
}
