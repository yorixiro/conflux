import { useEffect, useState, type ReactNode } from 'react';
import { ConfluxSidebarDialog } from './ConfluxSidebarDialog';
import type { DesktopAppSidebarProps } from './DesktopAppSidebar';
import { AppTopbar, type AppTopbarProps } from '../shell/AppTopbar';
import { useSpaceStore } from '../../stores/spaceStore';
import { KekeOriginalLayers, KEKE_APP_STYLE } from '../keke-original/KekeOriginalLayers';

type MobileAppShellFrameProps = {
  topbarProps: AppTopbarProps;
  sidebarProps?: Omit<DesktopAppSidebarProps, 'collapsed' | 'onToggleCollapsed'>;
  children: ReactNode;
  chatHubOpen?: boolean;
};

export function MobileAppShellFrame({
  topbarProps,
  sidebarProps,
  children,
  chatHubOpen = false
}: MobileAppShellFrameProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const presetId = useSpaceStore((space) => space.theme.activePresetId);
  const kekeOriginal = (presetId === 'keke-doodle' || presetId === 'keke-pois') && topbarProps.state.activeWorld === 'chat';
  const canOpenSidebar = Boolean(sidebarProps) && kekeOriginal;
  useEffect(() => {
    if (!canOpenSidebar) return undefined;
    let x0: number | null = null;
    const start = (event: TouchEvent) => { x0 = event.touches[0].clientX; };
    const end = (event: TouchEvent) => {
      if (x0 === null) return;
      const dx = event.changedTouches[0].clientX - x0;
      if (!sidebarOpen && x0 < 28 && dx > 60) setSidebarOpen(true);
      else if (sidebarOpen && dx < -60) setSidebarOpen(false);
      x0 = null;
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    return () => { document.removeEventListener('touchstart', start); document.removeEventListener('touchend', end); };
  }, [canOpenSidebar, sidebarOpen]);
  return (
    <div className={`${kekeOriginal ? 'app-stage app' : 'app-stage'}${chatHubOpen ? ' conflux-chat-hub-open' : ''}`} style={kekeOriginal ? KEKE_APP_STYLE : undefined}>
      {kekeOriginal ? <KekeOriginalLayers /> : null}
      {!chatHubOpen ? <AppTopbar {...topbarProps} chatCollaborator={sidebarProps?.chatCollaborator} actions={{ ...topbarProps.actions,
        onOpenSidebar: sidebarProps && topbarProps.state.activeWorld === 'chat' ? () => setSidebarOpen(true) : undefined
      }} /> : null}
      {children}
      {sidebarProps ? <ConfluxSidebarDialog open={sidebarOpen && topbarProps.state.activeWorld === 'chat'} onClose={() => setSidebarOpen(false)} initialTab="profile" sidebarProps={sidebarProps} /> : null}
    </div>
  );
}
