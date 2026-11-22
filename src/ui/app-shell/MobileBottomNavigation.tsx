import { GlobalNavigationIcon } from './navigation-art/GlobalNavigationIcon';
import type { CollectionShelf, World } from '../../types/domain';
import './MobileBottomNavigation.css';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { KekeTabArt } from '../keke-original/KekeOriginalBar';

type Section = 'chat' | 'group' | 'home' | 'archive' | 'workshop' | 'settings';

type Props = {
  kekeTabs?: boolean;
  activeWorld: World;
  collectionShelf: CollectionShelf;
  homeOpen: boolean;
  settingsOpen: boolean;
  onOpenChat: () => void;
  onOpenGroup: () => void;
  onOpenHome: () => void;
  onOpenArchive: () => void;
  onOpenWorkshop: () => void;
  onOpenSettings: () => void;
};

const items: { id: Section; label: string }[] = [
  { id: 'chat', label: '对话' },
  { id: 'group', label: '群组' },
  { id: 'home', label: '主页' },
  { id: 'archive', label: '心弦' },
  { id: 'workshop', label: '工坊' },
  { id: 'settings', label: '设置' }
];

function useKekeTabsSlot(enabled: boolean) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!enabled) { setSlot(null); return; }
    let frame = 0;
    const find = () => {
      const el = document.getElementById('keke-tabs-slot');
      if (el) setSlot(el); else frame = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(frame);
  }, [enabled]);
  return slot;
}

export function MobileBottomNavigation({
  kekeTabs = false,
  activeWorld, collectionShelf, homeOpen, settingsOpen,
  onOpenChat, onOpenGroup, onOpenHome, onOpenArchive, onOpenWorkshop, onOpenSettings
}: Props) {
  const selected: Section = settingsOpen ? 'settings'
    : homeOpen ? 'home'
    : activeWorld === 'chat' ? 'chat'
    : activeWorld === 'group' ? 'group'
    : collectionShelf === 'info' ? 'chat'
    : collectionShelf === 'dialogue' || collectionShelf === 'album' ? 'archive' : 'workshop';

  const actions: Record<Section, () => void> = {
    chat: onOpenChat, group: onOpenGroup, home: onOpenHome,
    archive: onOpenArchive, workshop: onOpenWorkshop, settings: onOpenSettings
  };

  const slot = useKekeTabsSlot(kekeTabs);
  if (kekeTabs) {
    return slot ? createPortal(
      <nav className="tabs" aria-label="主导航">
        {items.map(({ id, label }) => (
          <button key={id} type="button" className={selected === id ? 'on' : ''} aria-label={label} aria-current={selected === id ? 'page' : undefined} onClick={actions[id]}>
            <KekeTabArt id={id} />{label}
          </button>
        ))}
      </nav>,
      slot
    ) : null;
  }

  return (
    <nav className="mobile-bottom-navigation" aria-label="主导航">
      {items.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className="mobile-bottom-navigation__item"
          aria-label={label}
          aria-current={selected === id ? 'page' : undefined}
          onClick={actions[id]}
        >
          <span className="mobile-bottom-navigation__icon" aria-hidden="true">
            <GlobalNavigationIcon section={id} />
          </span>
          <span className="mobile-bottom-navigation__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
