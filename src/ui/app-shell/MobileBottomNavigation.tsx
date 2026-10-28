import type { ReactNode } from 'react';
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

// Conflux icons: quiet monoline marks, not Polaris's existing navigation artwork.
const marks: Record<Section, ReactNode> = {
  chat: <>
    <path d="M4.4 6.9c0-1.6 1.3-2.9 2.9-2.9h9.3c1.6 0 2.9 1.3 2.9 2.9v7.2c0 1.6-1.3 2.9-2.9 2.9h-5.7l-4.7 3.1v-3.2a2.9 2.9 0 0 1-1.8-2.8z" />
    <path d="M8.1 9.6h7.7M8.1 12.7h5.4" />
    <path d="M18.2 2.7v3.1M16.65 4.25h3.1" className="mobile-bottom-navigation__detail" />
  </>,
  group: <>
    <path d="M5.2 4.6h10.3a2.7 2.7 0 0 1 2.7 2.7v5.8a2.7 2.7 0 0 1-2.7 2.7h-5.1l-3.7 2.7v-2.8a2.7 2.7 0 0 1-2.8-2.6V7.3a2.7 2.7 0 0 1 1.3-2.3z" />
    <path d="M8.1 9.3h6.5M8.1 12.1h4.3" />
    <path d="M18.4 9.7h.8a2 2 0 0 1 2 2v5.3a2 2 0 0 1-2 2h-2.8l-2 1.6v-1.6" className="mobile-bottom-navigation__detail" />
  </>,
  home: <>
    <path d="m4.4 10.3 7.5-6.5 7.5 6.5v8.1a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.6-1.5z" />
    <path d="M9.9 19.9v-6.5h4.1v6.5" />
    <path d="m19.9 2.8.45 1.45 1.45.45-1.45.45-.45 1.45-.45-1.45-1.45-.45 1.45-.45z" className="mobile-bottom-navigation__detail" />
  </>,
  archive: <>
    <path d="M6.1 3.9h10.4a2 2 0 0 1 2 2v13.8H7.6a2.6 2.6 0 0 1-2.6-2.6V5.1A1.2 1.2 0 0 1 6.1 3.9z" />
    <path d="M7.6 19.7a2.3 2.3 0 0 1 0-4.6h10.9M9 7.7h6.1M9 10.6h4.5" />
    <path d="m17.9 2.2.35 1.1 1.1.35-1.1.35-.35 1.1-.35-1.1-1.1-.35 1.1-.35z" className="mobile-bottom-navigation__detail" />
  </>,
  workshop: <>
    <path d="M3.9 7.1a2.2 2.2 0 0 1 2.2-2.2h4l1.7 1.8h6.3a2.2 2.2 0 0 1 2.2 2.2v9.2a2.2 2.2 0 0 1-2.2 2.2H6.1a2.2 2.2 0 0 1-2.2-2.2z" />
    <path d="m9.4 11.2-2.1 2.3 2.1 2.3m5.2-4.6 2.1 2.3-2.1 2.3M13 10.8l-1.9 5.6" />
  </>,
  settings: <>
    <path d="M5 6h14M5 12h14M5 18h14" />
    <circle cx="9" cy="6" r="2" className="mobile-bottom-navigation__knob" />
    <circle cx="15.1" cy="12" r="2" className="mobile-bottom-navigation__knob" />
    <circle cx="10.7" cy="18" r="2" className="mobile-bottom-navigation__knob" />
  </>
};

const items: { id: Section; label: string }[] = [
  { id: 'chat', label: '对话' },
  { id: 'group', label: '群组' },
  { id: 'home', label: '主页' },
  { id: 'archive', label: '档案' },
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
    : collectionShelf === 'info' || collectionShelf === 'dialogue' || collectionShelf === 'album' ? 'archive' : 'workshop';

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
            <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.38" strokeLinecap="round" strokeLinejoin="round">
              {marks[id]}
            </svg>
          </span>
          <span className="mobile-bottom-navigation__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
