import { useEffect, useRef } from 'react';
import { ImpactStyle } from '@capacitor/haptics';
import { buildChatWorldProps, buildTopbarProps } from '../../app/shell/buildAppShellProps';
import { useWorldFramePresence } from '../useWorldFramePresence';
import { triggerImpactActionHaptic } from '../haptics';
import type { ChatUiState } from '../worlds/chat/context/ChatUiState';
import { loadChatWorldModule, loadCollectionWorldModule, preloadLazyModule } from './appShellLazyModules';
import type { World } from '../../types/domain';

type UseAppShellWorldControllerArgs = {
  activeWorld: World;
  activeThemePreview: Parameters<typeof buildTopbarProps>[0]['activeThemePreview'];
  collectionShelf: Parameters<typeof buildTopbarProps>[0]['collectionShelf'];
  toggleWorld: () => void;
  derived: {
    topbarTitle: string;
    topbarTitleTone: 'brand' | 'collaborator';
    isAggregateCollectionScope: boolean;
    worldLabel: string;
    worldDetail: string | null;
    showWorldLabel: boolean;
    showTopbarShell: boolean;
    showTopbarTitle: boolean;
  };
  collection: {
    searchOpen: boolean;
    setSearchOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
    collaboratorSwitchOpen: boolean;
    setCollaboratorSwitchOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
    infoFullscreenOpen: boolean;
    setInfoFullscreenOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  };
  navigationActions: {
    openPreviewChat: () => void;
    prepareChatForWorldReturn: () => void;
    openFreshConversation: () => void;
  };
  chatUi: ChatUiState;
  toggleMenu: () => void;
  openSettings: () => void;
  openToolbox: () => void;
  openProviderSettings: () => void;
};

export function useAppShellWorldController({
  activeWorld,
  activeThemePreview,
  collectionShelf,
  toggleWorld,
  derived,
  collection,
  navigationActions,
  chatUi,
  toggleMenu,
  openSettings,
  openToolbox,
  openProviderSettings
}: UseAppShellWorldControllerArgs) {
  const worldPresence = useWorldFramePresence(activeWorld);
  const shellWorld = activeWorld;
  const previousWorldSwitchingRef = useRef(false);
  const isWorldSwitching = [
    worldPresence.renderChat,
    worldPresence.renderCollection,
    worldPresence.renderGroup
  ].filter(Boolean).length > 1;

  useEffect(() => {
    if (previousWorldSwitchingRef.current && !isWorldSwitching) {
      triggerImpactActionHaptic({
        settle: 'none',
        style: ImpactStyle.Light
      });
    }
    previousWorldSwitchingRef.current = isWorldSwitching;
  }, [isWorldSwitching]);

  const topbarProps = buildTopbarProps({
    activeWorld,
    title: derived.topbarTitle,
    titleTone: derived.topbarTitleTone,
    isAggregateCollectionScope: derived.isAggregateCollectionScope,
    worldLabel: derived.worldLabel,
    worldDetail: derived.worldDetail,
    showWorldLabel: derived.showWorldLabel,
    showTopbarShell: derived.showTopbarShell,
    showTopbarTitle: derived.showTopbarTitle,
    collaboratorSwitchOpen: collection.collaboratorSwitchOpen,
    collectionShelf,
    searchOpen: collection.searchOpen,
    collectionInfoFullscreenOpen: collection.infoFullscreenOpen,
    menuOpen: false,
    activeThemePreview,
    toggleWorld: () => {
      if (isWorldSwitching) return;
      const nextWorld = activeWorld === 'collection' ? 'chat' : 'collection';
      preloadLazyModule(nextWorld === 'chat' ? loadChatWorldModule : loadCollectionWorldModule);
      if (nextWorld === 'chat') {
        navigationActions.prepareChatForWorldReturn();
      }
      toggleWorld();
    },
    createConversation: navigationActions.openFreshConversation,
    toggleMenu,
    openSettings,
    openPreviewChat: navigationActions.openPreviewChat,
    setSearchOpen: collection.setSearchOpen,
    setCollaboratorSwitchOpen: collection.setCollaboratorSwitchOpen,
    setCollectionInfoFullscreenOpen: collection.setInfoFullscreenOpen
  });

  const chatWorldProps = buildChatWorldProps({
    activeWorld,
    isWorldSwitching,
    openToolbox,
    openProviderSettings,
    ui: chatUi
  });
  const groupWorldProps = {
    shell: {
      isActiveWorld: activeWorld === 'group',
      isWorldSwitching,
      // 退出群聊回到"选人"的动作里：打开切换房间抽屉，而不是落进某个协作者房间
      onExitToRoomSwitch: () => collection.setCollaboratorSwitchOpen(true)
    },
    ui: chatUi
  };

  return {
    worldPresence,
    shellWorld,
    topbarProps,
    chatWorldProps,
    groupWorldProps
  };
}
