import type { CollectionShelf } from '../../../types/domain';
import type { I18nTranslator } from '../../../i18n';

export type CollectionShelfNavItem = {
  shelf: CollectionShelf;
  label: string;
};

export type CollectionShelfAvailability = Partial<Record<CollectionShelf, boolean>>;

const COLLECTION_SHELF_NAV_ITEM_IDS: CollectionShelf[] = [
  'dialogue',
  'album',
  'project',
  'code',
  'image',
  'info'
];

function collectionShelfLabel(shelf: CollectionShelf, t: I18nTranslator['t']) {
  if (shelf === 'dialogue') return t('collection.nav.dialogue');
  if (shelf === 'album') return '收藏册';
  if (shelf === 'project') return t('collection.nav.project');
  if (shelf === 'code') return t('collection.nav.code');
  if (shelf === 'image') return t('collection.nav.image');
  return t('collection.nav.info');
}

export function buildVisibleCollectionShelfNavItems(
  availability: CollectionShelfAvailability,
  t: I18nTranslator['t']
): CollectionShelfNavItem[] {
  return COLLECTION_SHELF_NAV_ITEM_IDS
    .filter((shelf) => availability[shelf] ?? true)
    .map((shelf) => ({
      shelf,
      label: collectionShelfLabel(shelf, t)
    }));
}
