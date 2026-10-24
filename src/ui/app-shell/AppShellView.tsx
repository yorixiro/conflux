import { Suspense, useEffect, useState } from 'react';
import { AppShellOverlays } from '../AppShellOverlays';
import { Icon } from '../Icon';
import { AppReplyNotificationStack } from './AppReplyNotificationStack';
import { ConfluxHome } from './ConfluxHome';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import type { CollectionShelf } from '../../types/domain';
import { DesktopAppShellFrame } from './DesktopAppShellFrame';
import { MobileAppShellFrame } from './MobileAppShellFrame';
import { ConfluxQuickSettingsDrawer } from './ConfluxQuickSettingsDrawer';
import { PersistenceReadFailureNotice } from './PersistenceReadFailureNotice';
import { WorldFrameBoundary, WorldFrameFallback } from './WorldFrameBoundary';
import type { useAppShellViewController } from './useAppShellViewController';

type AppShellViewProps = ReturnType<typeof useAppShellViewController> & {
  homeOpen: boolean;
  onHomeOpenChange: (open: boolean) => void;
};

export function AppShellView({
  homeOpen,
  onHomeOpenChange,
  activeWorld,
  shellWorld,
  activeChatDensity,
  customization,
  displayPreferences,
  themeTransitionPhase,
  worldPresence,
  collectionSearchOpen,
  collectionCollaboratorSwitchOpen,
  setCollectionCollaboratorSwitchOpen,
  collectionInfoFullscreenOpen,
  collectionInfoPageRequest,
  setCollectionInfoFullscreenOpen,
  collectionDetailOpen,
  setCollectionDetailOpen,
  collectionOpenCollaboratorBuilderForCreate,
  collectionCreateCustomCollaborator,
  collectionOpenProviderSettings,
  collectionOpenSettings,
  openQuickMenuPage,
  collectionOpenDesktopLocalSettings,
  collectionDeleteCollaborator,
  collaboratorTransitionKey,
  topbarProps,
  chatWorldProps,
  groupWorldProps,
  desktopSidebarProps,
  replyNotificationProps,
  overlaysProps,
  startupThemeReady,
  persistenceReadFailureNotice,
  onRetryPersistenceReadFailure,
  onOpenBackupFromReadFailure,
  isWorldSwitching,
  isCollaboratorTransitionActive,
  backgroundUrl,
  backgroundBlur,
  starStyle,
  appLayoutSurface,
  hasWideLayout,
  showDesktopSidebar,
  effectiveDesktopSidebarCollapsed,
  CollectionWorld,
  ChatWorld,
  GroupWorld,
  worldRetryKeys,
  retryWorldFrame,
  toggleDesktopSidebarCollapsed,
  collectionScopeDrawerOpen,
  collectionFrameInteractive,
  chatFrameInteractive,
  groupFrameInteractive
}: AppShellViewProps) {
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const useBottomNavigation = appLayoutSurface !== 'desktop';
  const useDesktopSidebar = showDesktopSidebar && !useBottomNavigation;
  const chatCollaborator = desktopSidebarProps.chatCollaborator;
  useEffect(() => {
    setQuickSettingsOpen(false);
  }, [activeWorld, homeOpen]);
  const onOpenHomeConversation = (id: string) => {
    desktopSidebarProps.onOpenConversation(id);
    onHomeOpenChange(false);
  };
  const onOpenHomeShelf = (shelf: CollectionShelf) => {
    desktopSidebarProps.onSelectShelf(shelf);
    onHomeOpenChange(false);
  };
  const onOpenHomeGroup = () => {
    desktopSidebarProps.onOpenGroupWorld();
    onHomeOpenChange(false);
  };
  const onNewHomeConversation = () => {
    if (desktopSidebarProps.collaborators.length) desktopSidebarProps.onCreateConversation();
    else desktopSidebarProps.onCreateCustomCollaborator();
    onHomeOpenChange(false);
  };

  const worldStack = (
    <section className="world-stack">
      {worldPresence.renderCollection && (
        <div
          className={`world-frame collection-frame ${activeWorld === 'collection' ? 'active' : ''} ${collectionFrameInteractive ? 'interactive' : ''} ${worldPresence.hideCollection ? 'occluded' : ''} ${collectionDetailOpen ? 'detail-open' : ''}`}
        >
          <WorldFrameBoundary
            world="collection"
            retryKey={worldRetryKeys.collection}
            onRetry={() => retryWorldFrame('collection')}
          >
            <Suspense fallback={<WorldFrameFallback world="collection" />}>
              <CollectionWorld
                infoPageRequest={collectionInfoPageRequest}
                searchOpen={collectionSearchOpen}
                collaboratorSwitchOpen={collectionScopeDrawerOpen}
                onCollaboratorSwitchOpenChange={setCollectionCollaboratorSwitchOpen}
                onDeleteCollaborator={collectionDeleteCollaborator}
                onOpenSettings={collectionOpenSettings}
                infoFullscreenOpen={collectionInfoFullscreenOpen}
                onInfoFullscreenOpenChange={setCollectionInfoFullscreenOpen}
                onDetailOpenChange={setCollectionDetailOpen}
                onOpenCollaboratorBuilderForCreate={collectionOpenCollaboratorBuilderForCreate}
                onCreateCustomCollaborator={collectionCreateCustomCollaborator}
                onBackToChat={topbarProps.actions.onOpenPreviewChat}
                onOpenProviderSettings={collectionOpenProviderSettings}
                onOpenDesktopLocalSettings={collectionOpenDesktopLocalSettings}
                sectionNavigation={useBottomNavigation}
              />
            </Suspense>
          </WorldFrameBoundary>
        </div>
      )}
      {worldPresence.renderChat && (
        <div className={`world-frame chat-frame ${activeWorld === 'chat' ? 'active' : ''} ${chatFrameInteractive ? 'interactive' : ''} ${worldPresence.hideChat ? 'occluded' : ''}`}>
          <WorldFrameBoundary
            world="chat"
            retryKey={worldRetryKeys.chat}
            onRetry={() => retryWorldFrame('chat')}
          >
            <Suspense fallback={<WorldFrameFallback world="chat" />}>
              <ChatWorld {...chatWorldProps} />
            </Suspense>
          </WorldFrameBoundary>
        </div>
      )}
      {worldPresence.renderGroup && (
        <div className={`world-frame group-frame ${activeWorld === 'group' ? 'active' : ''} ${groupFrameInteractive ? 'interactive' : ''} ${worldPresence.hideGroup ? 'occluded' : ''}`}>
          <WorldFrameBoundary
            world="group"
            retryKey={worldRetryKeys.group}
            onRetry={() => retryWorldFrame('group')}
          >
            <Suspense fallback={<WorldFrameFallback world="group" />}>
              <GroupWorld {...groupWorldProps} />
            </Suspense>
          </WorldFrameBoundary>
        </div>
      )}
    </section>
  );

  return (
    <main
      className={`app-shell ${useBottomNavigation ? 'has-mobile-bottom-navigation' : ''} app-layout-${appLayoutSurface} ${hasWideLayout ? 'app-layout-wide' : 'app-layout-compact'} ${useDesktopSidebar ? 'has-desktop-sidebar' : ''} ${useDesktopSidebar && effectiveDesktopSidebarCollapsed ? 'desktop-sidebar-collapsed' : ''} ${activeWorld} world-chroma-${shellWorld} chat-render-${activeChatDensity} ${isWorldSwitching ? 'world-switching' : ''} ${isCollaboratorTransitionActive ? 'collaborator-transition-active' : ''} ${collectionScopeDrawerOpen ? 'collaborator-scope-drawer-active' : ''} ${themeTransitionPhase ? `theme-transition-${themeTransitionPhase}` : ''}`}
      style={starStyle}
    >
      {backgroundUrl ? (
        <div className="app-shell-background-override" aria-hidden="true">
          <div
            className="app-shell-background-image"
            style={{
              backgroundImage: `url("${backgroundUrl}")`,
              backgroundSize: customization.backgroundFit,
              opacity: customization.backgroundOpacity,
              filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined
            }}
          />
          <div
            className="app-shell-background-dim"
            style={{
              opacity: customization.backgroundDim
            }}
          />
        </div>
      ) : null}
      <div className="bg-glow bg-glow-top" />
      <div className="bg-glow bg-glow-bottom" />
      <div className="theme-transition-veil" aria-hidden="true" />
      <div className="collaborator-transition-veil" aria-hidden="true" />
      {!startupThemeReady ? <div className="startup-theme-veil" aria-hidden="true" /> : null}
      {homeOpen ? (
        <ConfluxHome
          conversations={desktopSidebarProps.conversations}
          activeConversationId={desktopSidebarProps.activeConversationId}
          collaboratorCount={desktopSidebarProps.collaborators.length}
          onOpenConversation={onOpenHomeConversation}
          onNewConversation={onNewHomeConversation}
          onOpenShelf={onOpenHomeShelf}
          onOpenGroup={onOpenHomeGroup}
        />
      ) : useDesktopSidebar ? (
        <DesktopAppShellFrame
          desktopSidebarProps={{
            ...desktopSidebarProps,
            collapsed: effectiveDesktopSidebarCollapsed,
            onToggleCollapsed: toggleDesktopSidebarCollapsed,
            onOpenHome: () => onHomeOpenChange(true)
          }}
        >
          {worldStack}
          {activeWorld === 'chat' ? (
            <button
              type="button"
              className="conflux-quick-settings-desktop-trigger"
              onClick={() => setQuickSettingsOpen(true)}
              aria-label="打开右侧快捷设置"
              aria-haspopup="dialog"
              title="快捷设置"
            >
              <Icon name="settings" size={19} />
            </button>
          ) : null}
        </DesktopAppShellFrame>
      ) : (
        <MobileAppShellFrame
          sidebarProps={{ ...desktopSidebarProps, onOpenHome: () => onHomeOpenChange(true) }}
          topbarProps={{
            ...topbarProps,
            actions: {
              ...topbarProps.actions,
              onOpenHome: activeWorld === 'chat' ? () => onHomeOpenChange(true) : undefined,
              onOpenQuickSettings: () => setQuickSettingsOpen(true)
            }
          }}
        >
          {worldStack}
        </MobileAppShellFrame>
      )}

      {useBottomNavigation ? (
        <MobileBottomNavigation
          activeWorld={activeWorld}
          collectionShelf={topbarProps.state.collectionShelf}
          homeOpen={homeOpen}
          settingsOpen={topbarProps.state.menuOpen}
          onOpenChat={() => {
            if (activeWorld !== 'chat') topbarProps.actions.onOpenPreviewChat();
            onHomeOpenChange(false);
          }}
          onOpenGroup={() => {
            if (activeWorld !== 'group') desktopSidebarProps.onOpenGroupWorld();
            onHomeOpenChange(false);
          }}
          onOpenHome={() => onHomeOpenChange(true)}
          onOpenArchive={() => {
            if (activeWorld !== 'collection' || topbarProps.state.collectionShelf !== 'dialogue') {
              desktopSidebarProps.onSelectShelf('dialogue');
            }
            onHomeOpenChange(false);
          }}
          onOpenWorkshop={() => {
            if (activeWorld !== 'collection' || !['project', 'code', 'image'].includes(topbarProps.state.collectionShelf)) {
              desktopSidebarProps.onSelectShelf('project');
            }
            onHomeOpenChange(false);
          }}
          onOpenSettings={() => {
            onHomeOpenChange(false);
            topbarProps.actions.onOpenSettings();
          }}
        />
      ) : null}

      <AppReplyNotificationStack {...replyNotificationProps} />
      <PersistenceReadFailureNotice
        notice={persistenceReadFailureNotice}
        onRetry={onRetryPersistenceReadFailure}
        onOpenBackup={onOpenBackupFromReadFailure}
      />
      <ConfluxQuickSettingsDrawer
        open={quickSettingsOpen && !homeOpen && activeWorld === 'chat'}
        onClose={() => setQuickSettingsOpen(false)}
        provider={overlaysProps.api}
        onOpenApi={collectionOpenProviderSettings}
        onOpenMenu={openQuickMenuPage}
        onNewConversation={topbarProps.actions.onCreateConversation}
        onOpenPersona={chatCollaborator
          ? () => desktopSidebarProps.onEditCollaborator(chatCollaborator.id)
          : undefined}
        onOpenCodeCards={() => desktopSidebarProps.onSelectShelf('code')}
      />
      <AppShellOverlays {...overlaysProps} />
    </main>
  );
}
