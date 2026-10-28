import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createPersonaTemplate } from '../../config/persona/personaBuilder';
import { DesktopAppSidebar, type DesktopAppSidebarProps } from './DesktopAppSidebar';

const theme = vi.hoisted(() => ({ activePresetId: 'keke-doodle' }));
vi.mock('../../stores/spaceStore', () => ({
  useSpaceStore: (selector: (state: unknown) => unknown) => selector({ theme, appLanguage: 'zh-CN', applyThemePreset: vi.fn() })
}));
vi.mock('../collaborator/PersonaAvatar', () => ({ PersonaAvatar: () => null }));
vi.mock('./useConversationLibrarySearch', () => ({
  useConversationLibrarySearch: () => ({ results: [], status: 'idle' })
}));
vi.mock('./SidebarModelSettings', () => ({
  SidebarModelSettings: ({ persona }: { persona: { id: string } }) => <section data-model-controls={persona.id}>模型与思考</section>
}));

function props(): DesktopAppSidebarProps {
  const chatPersona = createPersonaTemplate({ id: 'chat-ai', name: 'Chat AI', description: '' });
  const editingPersona = createPersonaTemplate({ id: 'editing-ai', name: 'Editing AI', description: '' });
  return {
    presentation: 'sidebar', initialTab: 'profile', activeWorld: 'chat',
    activeConversationId: null, collectionShelf: 'dialogue', collaboratorScopeId: editingPersona.id,
    currentCollaborator: editingPersona, chatCollaborator: chatPersona,
    collaborators: [chatPersona, editingPersona], conversations: [], shelfItems: [], collapsed: false,
    onToggleCollapsed: vi.fn(), onSelectCollaborator: vi.fn(), onCreateCustomCollaborator: vi.fn(),
    onCreateCollaboratorFromBuilder: vi.fn(), onEditCollaborator: vi.fn(), onSelectShelf: vi.fn(),
    onOpenConversation: vi.fn(), onRenameConversation: vi.fn(), onToggleConversationPinned: vi.fn(),
    onDeleteConversation: vi.fn(), onCreateConversation: vi.fn(), onOpenGroupWorld: vi.fn(),
    onOpenSettings: vi.fn(), onOpenApi: vi.fn()
  };
}

describe('profile model controls across themes', () => {
  it.each(['keke-doodle', 'keke-pois', 'polaris'])('renders controls for the chat AI once in %s', (preset) => {
    theme.activePresetId = preset;
    const html = renderToStaticMarkup(<DesktopAppSidebar {...props()} />);
    expect(html.match(/data-model-controls="chat-ai"/g)).toHaveLength(1);
    expect(html).not.toContain('data-model-controls="editing-ai"');
    if (preset.startsWith('keke-')) {
      expect(html.indexOf('keke-profile-sheet')).toBeLessThan(html.indexOf('data-model-controls'));
      expect(html.indexOf('data-model-controls')).toBeLessThan(html.indexOf('keke-calendar-wrap'));
      expect(html).toContain('keke-profile-lower');
    }
  });

  it('does not attach controls to a different AI when no chat AI is selected', () => {
    theme.activePresetId = 'keke-doodle';
    const html = renderToStaticMarkup(<DesktopAppSidebar {...props()} chatCollaborator={null} />);
    expect(html).not.toContain('data-model-controls=');
  });
});
