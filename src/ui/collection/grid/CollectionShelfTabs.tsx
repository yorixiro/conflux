import type { CSSProperties } from 'react';
import type { CollectionShelf } from '../../../types/domain';
import { COLLECTION_FRONTSTAGE_SURFACES } from '../../frontstage/frontstageSurfaceRegistry';
import { runSelectionAction } from '../../haptics';
import { Icon, type IconName } from '../../Icon';
import type { CollectionShelfNavItem } from './collectionShelfNav';
import { useI18n } from '../../../i18n';

type CollectionShelfTabsProps = {
  collectionShelf: CollectionShelf;
  navItems: CollectionShelfNavItem[];
  onSetCollectionShelf: (shelf: CollectionShelf) => void;
};

const SHELF_ICON_BY_ID = {
  dialogue: 'navDialogue',
  album: 'navImage',
  code: 'navCard',
  project: 'navWorkspace',
  image: 'navImage',
  info: 'navInfo'
} satisfies Record<CollectionShelf, IconName>;

function orderTabsForVisualBalance(navItems: CollectionShelfNavItem[]) {
  const dialogueIndex = navItems.findIndex((item) => item.shelf === 'dialogue');
  if (dialogueIndex < 0 || navItems.length < 3) return navItems;

  const orderedItems = [...navItems];
  const [dialogueItem] = orderedItems.splice(dialogueIndex, 1);
  orderedItems.splice(Math.floor(navItems.length / 2), 0, dialogueItem);
  return orderedItems;
}

export function CollectionShelfTabs({
  collectionShelf,
  navItems,
  onSetCollectionShelf
}: CollectionShelfTabsProps) {
  const { t } = useI18n();
  const visualNavItems = orderTabsForVisualBalance(navItems);
  const tabCount = visualNavItems.length;
  const handleSelect = (nextShelf: CollectionShelf, trigger: EventTarget | null) => {
    if (nextShelf === collectionShelf) return;
    runSelectionAction(() => onSetCollectionShelf(nextShelf), { element: trigger });
  };

  return (
    <div className="collection-shelf-tabs" role="tablist" aria-label={t('collection.nav.tabListAria')} data-surface={COLLECTION_FRONTSTAGE_SURFACES.tabStrip}>
      <div
        className="collection-shelf-tab-row"
        style={{ '--collection-shelf-count': tabCount } as CSSProperties}
      >
        {visualNavItems.map((tab) => {
          const active = collectionShelf === tab.shelf;
          const isDialoguePrimary = tab.shelf === 'dialogue';
          return (
            <button
              key={tab.shelf}
              type="button"
              role="tab"
              aria-selected={active}
              className={[
                'shelf-tab',
                isDialoguePrimary ? 'shelf-tab--dialogue-primary' : null,
                active ? 'active' : null
              ].filter(Boolean).join(' ')}
              onClick={(event) => handleSelect(tab.shelf, event.currentTarget)}
            >
              <span className="shelf-tab-icon" aria-hidden="true">
                <Icon
                  name={SHELF_ICON_BY_ID[tab.shelf]}
                  size={20}
                  color={active ? 'polarisNavGradient' : isDialoguePrimary ? 'polarisNavLineGradient' : 'currentColor'}
                />
              </span>
              <span className="shelf-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
