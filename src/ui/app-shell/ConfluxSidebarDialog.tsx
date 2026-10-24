import { useEffect, useRef } from 'react';
import { DesktopAppSidebar, type DesktopAppSidebarProps } from './DesktopAppSidebar';

/** The mobile drawer uses the same sidebar; native dialog handles focus, Escape and background inertness. */
export function ConfluxSidebarDialog({ open, onClose, initialTab = 'library', sidebarProps }: {
  open: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'library';
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
    <dialog ref={ref} className="conflux-sidebar-dialog" aria-label="当前 AI 资料与日历"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      {open ? <DesktopAppSidebar {...sidebarProps} key={initialTab} initialTab={initialTab} presentation="profile" collapsed={false} onToggleCollapsed={onClose}
        onOpenHome={sidebarProps.onOpenHome ? () => closeAfter(sidebarProps.onOpenHome!) : undefined}
        onOpenConversation={(id, messageId) => closeAfter(() => sidebarProps.onOpenConversation(id, messageId))}
        onCreateConversation={() => closeAfter(sidebarProps.onCreateConversation)}
        onSelectShelf={shelf => closeAfter(() => sidebarProps.onSelectShelf(shelf))}
        onCreateCustomCollaborator={() => closeAfter(sidebarProps.onCreateCustomCollaborator)}
        onCreateCollaboratorFromBuilder={() => closeAfter(sidebarProps.onCreateCollaboratorFromBuilder)}
        onEditCollaborator={id => closeAfter(() => sidebarProps.onEditCollaborator(id))}
        onSelectCollaborator={id => { sidebarProps.onSelectCollaborator(id); if (id) onClose(); }}
        onOpenSettings={() => closeAfter(sidebarProps.onOpenSettings)} /> : null}
    </dialog>
  );
}
