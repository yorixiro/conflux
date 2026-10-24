import { useState, type ReactNode } from 'react';
import { ConfluxSidebarDialog } from './ConfluxSidebarDialog';
import type { DesktopAppSidebarProps } from './DesktopAppSidebar';
import { AppTopbar, type AppTopbarProps } from '../shell/AppTopbar';

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
  return (
    <div className="app-stage">
      <AppTopbar {...topbarProps} chatCollaborator={sidebarProps?.chatCollaborator} actions={{ ...topbarProps.actions,
        onOpenSidebar: sidebarProps && topbarProps.state.activeWorld === 'chat' ? () => setSidebarOpen(true) : undefined
      }} />
      {children}
      {sidebarProps ? <ConfluxSidebarDialog open={sidebarOpen && topbarProps.state.activeWorld === 'chat'} onClose={() => setSidebarOpen(false)} initialTab="profile" sidebarProps={sidebarProps} /> : null}
    </div>
  );
}
