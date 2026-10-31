import type { ThemeVariables } from '../types/domain';

// Chat theme colors belong to the chat screen, never the application-wide :root.
export const CHAT_THEME_PALETTE_SELECTOR = '.app-shell[data-conflux-chat-theme="active"]';

type VariableWriter = Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'>;

export function reconcileChatThemeVariables(
  next: ThemeVariables,
  previous: ThemeVariables,
  chatScope: VariableWriter,
  root: VariableWriter
) {
  const removed = new Set(Object.keys(previous));
  for (const [key, value] of Object.entries(next)) {
    removed.delete(key);
    // Clear inline root overrides left by older versions, preserving system appearance.
    root.removeProperty(key);
    chatScope.setProperty(key, value);
  }
  for (const key of removed) {
    chatScope.removeProperty(key);
    root.removeProperty(key);
  }
}
