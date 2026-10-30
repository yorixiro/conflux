import { Suspense, useState } from 'react';
import { AppShellOverlays } from '../AppShellOverlays';
import { Icon } from '../Icon';
import { AppReplyNotificationStack } from './AppReplyNotificationStack';
import { ConfluxHome } from './ConfluxHome';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import type { CollectionShelf } from '../../types/domain';
import { usePersonaStore } from '../../stores/personaStore';
import { useSpaceStore } from '../../stores/spaceStore';
import '../keke-original';
import { getProviderModelBindingValue } from '../shell/apiProviderDisplay';
import { DesktopAppShellFrame } from './DesktopAppShellFrame';
import { DesktopAppSidebar } from './DesktopAppSidebar';
import { MobileAppShellFrame } from './MobileAppShellFrame';
import { ConfluxQuickSettingsDrawer } from './ConfluxQuickSettingsDrawer';
import { PersistenceReadFailureNotice } from './PersistenceReadFailureNotice';
import { WorldFrameBoundary, WorldFrameFallback } from './WorldFrameBoundary';
import type { useAppShellViewController } from './useAppShellViewController';

type AppShellViewProps = ReturnType<typeof useAppShellViewController> & {
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
  openChatList,
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
  groupFrameInteractive,
  quickSettingsOpen,
  setQuickSettingsOpen
}: AppShellViewProps) {
  const kekePresetId = useSpaceStore((space) => space.theme.activePresetId);
  const kekeOriginalActive = (kekePresetId === 'keke-doodle' || kekePresetId === 'keke-pois') && activeWorld === 'chat' && !homeOpen;
  const useBottomNavigation = appLayoutSurface !== 'desktop';
  const useDesktopSidebar = showDesktopSidebar && !useBottomNavigation;
  // Omit the home action in chat rather than assigning undefined to an exact optional callback.
  const mobileTopbarActions = { ...topbarProps.actions };
  if (activeWorld === 'chat') delete mobileTopbarActions.onOpenHome;
  const [chatHubOpen, setChatHubOpen] = useState(true);
  const showChatHub = useBottomNavigation && !homeOpen && activeWorld === 'chat' && chatHubOpen;
  const chatCollaborator = desktopSidebarProps.chatCollaborator;
  const setChatCollaboratorProvider = (providerId: string) => {
    if (!chatCollaborator) return;
    if (providerId === '__unconfigured__' || providerId === '') {
      usePersonaStore.getState().updateCollaborator(chatCollaborator.id, {
        advanced: { providerId: '', providerRouteMode: providerId ? 'unconfigured' : 'inherit', modelOverride: '' }
      });
      return;
    }
    const selected = overlaysProps.api.providers.find((item) => item.id === providerId);
    if (!selected) return;
    usePersonaStore.getState().updateCollaborator(chatCollaborator.id, {
      advanced: { providerId: selected.id, providerRouteMode: 'fixed', modelOverride: getProviderModelBindingValue(selected) }
    });
  };
  const onOpenHomeConversation = (id: string) => {
    desktopSidebarProps.onOpenConversation(id);
    setChatHubOpen(false);
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
    else desktopSidebarProps.onCreateCollaboratorFromBuilder();
    setChatHubOpen(false);
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
                onBackToChat={useBottomNavigation ? () => { openChatList(); setChatHubOpen(true); } : topbarProps.actions.onOpenPreviewChat}
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
      id={kekeOriginalActive ? 'chat' : undefined}
      className={`app-shell ${useBottomNavigation && !kekeOriginalActive ? 'has-mobile-bottom-navigation' : ''} app-layout-${appLayoutSurface} ${hasWideLayout ? 'app-layout-wide' : 'app-layout-compact'} ${useDesktopSidebar ? 'has-desktop-sidebar' : ''} ${useDesktopSidebar && effectiveDesktopSidebarCollapsed ? 'desktop-sidebar-collapsed' : ''} ${activeWorld} world-chroma-${shellWorld} chat-render-${activeChatDensity} ${isWorldSwitching ? 'world-switching' : ''} ${isCollaboratorTransitionActive ? 'collaborator-transition-active' : ''} ${collectionScopeDrawerOpen ? 'collaborator-scope-drawer-active' : ''} ${themeTransitionPhase ? `theme-transition-${themeTransitionPhase}` : ''}`}
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
            onOpenApi: collectionOpenProviderSettings,
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
          chatHubOpen={showChatHub}
          sidebarProps={{ ...desktopSidebarProps, onOpenApi: collectionOpenProviderSettings, onOpenHome: () => onHomeOpenChange(true) }}
          topbarProps={{
            ...topbarProps,
            actions: {
              ...mobileTopbarActions,
              onOpenConversationList: activeWorld === 'chat' ? () => setChatHubOpen(true) : undefined,
              onOpenQuickSettings: () => setQuickSettingsOpen(true)
            }
          }}
        >
          {worldStack}
          {showChatHub ? (
            <div className="conflux-chat-hub">
              <DesktopAppSidebar
                {...desktopSidebarProps}
                presentation="hub"
                initialTab="library"
                collapsed={false}
                onToggleCollapsed={() => {}}
                conversations={[]}
                onBackToChat={() => onHomeOpenChange(true)}
                onOpenConversation={(id, messageId) => {
                  desktopSidebarProps.onOpenConversation(id, messageId);
                  setChatHubOpen(false);
                }}
                onSelectCollaborator={(id) => {
                  if (!id) return;
                  desktopSidebarProps.onSelectCollaborator(id);
                  setChatHubOpen(false);
                }}
                onCreateConversationForCollaborator={(id) => {
                  desktopSidebarProps.onCreateConversationForCollaborator?.(id);
                  setChatHubOpen(false);
                }}
                onCreateCustomCollaborator={desktopSidebarProps.onCreateCollaboratorFromBuilder}
              />
            </div>
          ) : null}
        </MobileAppShellFrame>
      )}

      {useBottomNavigation ? (
        <MobileBottomNavigation
          kekeTabs={kekeOriginalActive}
          activeWorld={activeWorld}
          collectionShelf={topbarProps.state.collectionShelf}
          homeOpen={homeOpen}
          settingsOpen={topbarProps.state.menuOpen}
          onOpenChat={() => {
            if (activeWorld !== 'chat') openChatList();
            setChatHubOpen(true);
            onHomeOpenChange(false);
          }}
          onOpenGroup={() => {
            if (activeWorld !== 'group') desktopSidebarProps.onOpenGroupWorld();
            onHomeOpenChange(false);
          }}
          onOpenHome={() => onHomeOpenChange(true)}
          onOpenArchive={() => {
            if (activeWorld !== 'collection' || topbarProps.state.collectionShelf !== 'album') {
              desktopSidebarProps.onSelectShelf('album');
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

      <AppReplyNotificationStack {...replyNotificationProps} onOpen={(notification) => {
          setChatHubOpen(false);
          replyNotificationProps.onOpen(notification);
        }} />
      <PersistenceReadFailureNotice
        notice={persistenceReadFailureNotice}
        onRetry={onRetryPersistenceReadFailure}
        onOpenBackup={onOpenBackupFromReadFailure}
      />
      <ConfluxQuickSettingsDrawer
        open={quickSettingsOpen && !homeOpen && activeWorld === 'chat' && !showChatHub}
        onClose={() => setQuickSettingsOpen(false)}
        provider={overlaysProps.api}
        onOpenApi={collectionOpenProviderSettings}
        onOpenMenu={openQuickMenuPage}
        currentPersona={chatCollaborator}
        onSetPersonaProvider={setChatCollaboratorProvider}
        onOpenPersona={chatCollaborator
          ? () => desktopSidebarProps.onEditCollaborator(chatCollaborator.id)
          : undefined}
        onOpenCodeCards={() => desktopSidebarProps.onSelectShelf('code')}
      />
      <AppShellOverlays {...overlaysProps} />
    </main>
  );
}
