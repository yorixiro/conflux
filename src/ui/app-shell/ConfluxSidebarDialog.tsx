import { useEffect, useRef } from 'react';
import { DesktopAppSidebar, type DesktopAppSidebarProps } from './DesktopAppSidebar';

/** The mobile drawer uses the same sidebar; native dialog handles focus, Escape and background inertness. */
export function ConfluxSidebarDialog({ open, onClose, sidebarProps }: {
  open: boolean;
  onClose: () => void;
  sidebarProps: Omit<DesktopAppSidebarProps, 'collapsed' | 'onToggleCollapsed'>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  const closeAfter = (action: () => void) => { action(); onClose(); };
  return (
    <dialog ref={ref} className="conflux-sidebar-dialog" aria-label="聊天侧栏"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      {open ? <DesktopAppSidebar {...sidebarProps} collapsed={false} onToggleCollapsed={onClose}
        onOpenHome={sidebarProps.onOpenHome ? () => closeAfter(sidebarProps.onOpenHome!) : undefined}
        onOpenConversation={(id, messageId) => closeAfter(() => sidebarProps.onOpenConversation(id, messageId))}
        onCreateConversation={() => closeAfter(sidebarProps.onCreateConversation)}
        onSelectShelf={shelf => closeAfter(() => sidebarProps.onSelectShelf(shelf))}
        onCreateCustomCollaborator={() => closeAfter(sidebarProps.onCreateCustomCollaborator)}
        onEditCollaborator={() => closeAfter(sidebarProps.onEditCollaborator)}
        onOpenSettings={() => closeAfter(sidebarProps.onOpenSettings)} /> : null}
    </dialog>
  );
}
