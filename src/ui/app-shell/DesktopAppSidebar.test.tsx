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

describe('chat list and profile separation', () => {
  it('places the AI directory on the conversation page, not inside the profile drawer', () => {
    const sidebar = props();
    const hubHtml = renderToStaticMarkup(<DesktopAppSidebar {...sidebar} presentation="hub" />);
    const profileHtml = renderToStaticMarkup(<DesktopAppSidebar {...sidebar} presentation="profile" />);
    expect(hubHtml).toContain('最近对话');
    expect(hubHtml).toContain('AI 通讯录');
    expect(profileHtml).not.toContain('AI 通讯录');
    expect(profileHtml).toContain('Chat AI');
  });
});

describe('profile stays focused on the persona across themes', () => {
  it.each(['keke-doodle', 'keke-pois', 'polaris'])('keeps model configuration out of the %s profile', (preset) => {
    theme.activePresetId = preset;
    const html = renderToStaticMarkup(<DesktopAppSidebar {...props()} />);
    expect(html).toContain('Chat AI');
    expect(html).not.toContain('拉取模型列表');
    expect(html).not.toContain('conflux-profile-model');
  });
});
