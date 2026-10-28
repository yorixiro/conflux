import { useState, type ReactNode } from 'react';
import { ConfluxSidebarDialog } from './ConfluxSidebarDialog';
import type { DesktopAppSidebarProps } from './DesktopAppSidebar';
import { AppTopbar, type AppTopbarProps } from '../shell/AppTopbar';
import { useSpaceStore } from '../../stores/spaceStore';

type MobileAppShellFrameProps = {
  topbarProps: AppTopbarProps;
  sidebarProps?: Omit<DesktopAppSidebarProps, 'collapsed' | 'onToggleCollapsed'>;
  children: ReactNode;
};

export function MobileAppShellFrame({
  topbarProps,
  sidebarProps,
  children
}: MobileAppShellFrameProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const presetId = useSpaceStore((space) => space.theme.activePresetId);
  const kekeOriginal = (presetId === 'keke-doodle' || presetId === 'keke-pois') && topbarProps.state.activeWorld === 'chat';
  return (
    <div className={kekeOriginal ? 'app-stage app' : 'app-stage'}>
      <AppTopbar {...topbarProps} chatCollaborator={sidebarProps?.chatCollaborator} actions={{ ...topbarProps.actions,
        onOpenSidebar: sidebarProps && topbarProps.state.activeWorld === 'chat' ? () => setSidebarOpen(true) : undefined
      }} />
      {children}
      {sidebarProps ? <ConfluxSidebarDialog open={sidebarOpen && topbarProps.state.activeWorld === 'chat'} onClose={() => setSidebarOpen(false)} initialTab="profile" sidebarProps={sidebarProps} /> : null}
    </div>
  );
}
