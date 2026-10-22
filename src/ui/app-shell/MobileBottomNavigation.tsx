import type { CollectionShelf, World } from '../../types/domain';
import { Icon, type IconName } from '../Icon';
import './MobileBottomNavigation.css';

type Section = 'chat' | 'group' | 'home' | 'archive' | 'workshop' | 'settings';

type Props = {
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

const items: { id: Section; label: string; icon: IconName }[] = [
  { id: 'chat', label: '对话', icon: 'navDialogue' },
  { id: 'group', label: '群组', icon: 'navGroup' },
  { id: 'home', label: '主页', icon: 'compass' },
  { id: 'archive', label: '档案', icon: 'navInfo' },
  { id: 'workshop', label: '工坊', icon: 'navWorkspace' },
  { id: 'settings', label: '设置', icon: 'settings' }
];

export function MobileBottomNavigation({
  activeWorld,
  collectionShelf,
  homeOpen,
  settingsOpen,
  onOpenChat,
  onOpenGroup,
  onOpenHome,
  onOpenArchive,
  onOpenWorkshop,
  onOpenSettings
}: Props) {
  const activeSection: Section = settingsOpen
    ? 'settings'
    : homeOpen
      ? 'home'
      : activeWorld === 'chat'
        ? 'chat'
        : activeWorld === 'group'
          ? 'group'
          : collectionShelf === 'info'
            ? 'archive'
            : 'workshop';

  const actions: Record<Section, () => void> = {
    chat: onOpenChat,
    group: onOpenGroup,
    home: onOpenHome,
    archive: onOpenArchive,
    workshop: onOpenWorkshop,
    settings: onOpenSettings
  };

  return (
    <nav className="mobile-bottom-navigation" aria-label="主导航">
      {items.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className="mobile-bottom-navigation__item"
          aria-label={label}
          aria-current={activeSection === id ? 'page' : undefined}
          onClick={actions[id]}
        >
          <span className="mobile-bottom-navigation__icon">
            <Icon name={icon} size={20} />
          </span>
          <span className="mobile-bottom-navigation__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
