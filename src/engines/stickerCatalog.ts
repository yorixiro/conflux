import type { ImageAssetCard, ImageStickerMetadata } from '../types/domain';

/**
 * Reuse image collection cards as the single source of sticker images.
 * The existing image card id stays stable when the title or usage tags change.
 */
export function normalizeStickerMetadata(value: ImageStickerMetadata | null | undefined): ImageStickerMetadata | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const purpose = typeof value.purpose === 'string' ? value.purpose.trim().slice(0, 120) : '';
  const moods = Array.isArray(value.moods)
    ? Array.from(new Set(value.moods.filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().slice(0, 32)).filter(Boolean))).slice(0, 8)
    : [];
  return { purpose, moods };
}

export type StickerCatalogEntry = {
  id: string;
  assetId: string;
  title: string;
  purpose: string;
  moods: string[];
  ownerCollaboratorId?: string;
};

export function listStickerCatalog(cards: readonly ImageAssetCard[], query = ''): StickerCatalogEntry[] {
  const keyword = query.trim().toLocaleLowerCase();
  return cards.flatMap((card) => {
    if (!card.sticker) return [];
    const sticker = normalizeStickerMetadata(card.sticker);
    if (!sticker) return [];
    const entry: StickerCatalogEntry = {
      id: card.id,
      assetId: card.assetId,
      title: card.title,
      purpose: sticker.purpose,
      moods: sticker.moods,
      ...(card.ownerCollaboratorId ? { ownerCollaboratorId: card.ownerCollaboratorId } : {})
    };
    if (keyword && ![entry.id, entry.title, entry.purpose, ...entry.moods]
      .some((value) => value.toLocaleLowerCase().includes(keyword))) return [];
    return [entry];
  });
}

export function findStickerById(cards: readonly ImageAssetCard[], stickerId: string): StickerCatalogEntry | null {
  return listStickerCatalog(cards).find((entry) => entry.id === stickerId) ?? null;
}
