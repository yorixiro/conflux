import { useState, type ReactNode } from 'react';
import { ConfluxSidebarDialog } from './ConfluxSidebarDialog';
import type { DesktopAppSidebarProps } from './DesktopAppSidebar';
import { AppTopbar, type AppTopbarProps } from '../shell/AppTopbar';

type MobileAppShellFrameProps = {
  topbarProps: AppTopbarProps;
  sidebarProps?: Omit<DesktopAppSidebarProps, 'collapsed' | 'onToggleCollapsed'>;
  chatHub?: ReactNode;
  children: ReactNode;
};

export function MobileAppShellFrame({
  topbarProps,
  sidebarProps,
  chatHub,
  children
}: MobileAppShellFrameProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className={`app-stage ${chatHub ? 'conflux-chat-hub-open' : ''}`}>
      {!chatHub ? <AppTopbar {...topbarProps} chatCollaborator={sidebarProps?.chatCollaborator} actions={{ ...topbarProps.actions,
        onOpenSidebar: sidebarProps && topbarProps.state.activeWorld === 'chat' ? () => setSidebarOpen(true) : undefined
      }} /> : null}
      {children}
      {chatHub}
      {sidebarProps ? <ConfluxSidebarDialog open={sidebarOpen && !chatHub && topbarProps.state.activeWorld === 'chat'} onClose={() => setSidebarOpen(false)} initialTab="profile" sidebarProps={sidebarProps} /> : null}
    </div>
  );
}
