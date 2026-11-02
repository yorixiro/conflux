import { describe, expect, it } from 'vitest';
import type { ImageAssetCard } from '../types/domain';
import { findStickerById, listStickerCatalog, normalizeStickerMetadata } from './stickerCatalog';
import { normalizeImageCard, patchImageCards } from '../stores/collectionStoreImageCards';

const card = (id: string, sticker?: ImageAssetCard['sticker']): ImageAssetCard =>
  normalizeImageCard({
    id,
    assetId: 'asset-' + id,
    title: '小猫抱抱',
    source: 'manual',
    sticker,
    createdAt: 1,
    updatedAt: 1
  });

describe('sticker catalog backed by existing image cards', () => {
  it('uses the original persistent image-card ID as sticker ID', () => {
    const sticker = card('image-42', { purpose: '安慰抱抱', moods: ['温柔', '亲近'] });
    expect(listStickerCatalog([card('other'), sticker])).toEqual([{
      id: 'image-42',
      assetId: 'asset-image-42',
      title: '小猫抱抱',
      purpose: '安慰抱抱',
      moods: ['温柔', '亲近']
    }]);
    expect(findStickerById([sticker], 'image-42')?.assetId).toBe('asset-image-42');
  });

  it('searches purpose and mood without changing image data', () => {
    const sticker = card('image-42', { purpose: '安慰抱抱', moods: ['温柔', '亲近'] });
    expect(listStickerCatalog([sticker], '抱抱')).toHaveLength(1);
    expect(listStickerCatalog([sticker], '亲近')).toHaveLength(1);
    expect(listStickerCatalog([sticker], '生气')).toHaveLength(0);
  });

  it('normalizes duplicate and oversize tags', () => {
    expect(normalizeStickerMetadata({ purpose: '  安慰  ', moods: ['温柔', '温柔', '', '  亲近  '] })).toEqual({
      purpose: '安慰', moods: ['温柔', '亲近']
    });
  });

  it('updates and clears sticker metadata without losing image fields', () => {
    const original = card('image-42');
    const tagged = patchImageCards([original], original.id, {
      sticker: { purpose: '高兴', moods: ['开心'] }
    })[0];
    expect(tagged?.id).toBe(original.id);
    expect(tagged?.assetId).toBe(original.assetId);
    expect(tagged?.sticker?.purpose).toBe('高兴');
    const cleared = patchImageCards([tagged!], tagged!.id, { sticker: null })[0];
    expect(cleared?.sticker).toBeUndefined();
    expect(cleared?.assetId).toBe(original.assetId);
  });
});
