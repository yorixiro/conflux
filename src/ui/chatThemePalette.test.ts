import { describe, expect, it, vi } from 'vitest';
import { CHAT_THEME_PALETTE_SELECTOR, reconcileChatThemeVariables } from './chatThemePalette';

describe('chat theme isolation', () => {
  it('targets only explicitly active chat shell', () => {
    expect(CHAT_THEME_PALETTE_SELECTOR).toContain('[data-conflux-chat-theme="active"]');
    expect(CHAT_THEME_PALETTE_SELECTOR).not.toContain(':root');
  });

  it('moves colors into chat scope and removes old root overrides', () => {
    const chat = { setProperty: vi.fn(), removeProperty: vi.fn() };
    const root = { setProperty: vi.fn(), removeProperty: vi.fn() };
    reconcileChatThemeVariables(
      { '--bg': '#faf7f5', '--accent': '#b0838c' },
      { '--bg': '#fff', '--obsolete': 'red' },
      chat,
      root
    );
    expect(chat.setProperty).toHaveBeenCalledWith('--bg', '#faf7f5');
    expect(chat.setProperty).toHaveBeenCalledWith('--accent', '#b0838c');
    expect(chat.removeProperty).toHaveBeenCalledWith('--obsolete');
    expect(root.setProperty).not.toHaveBeenCalled();
    expect(root.removeProperty).toHaveBeenCalledWith('--bg');
    expect(root.removeProperty).toHaveBeenCalledWith('--obsolete');
  });
});
