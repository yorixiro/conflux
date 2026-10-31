import type { ChatMessage } from '../../types/domain';

/** Canonical persisted reaction choices for all three chat skins. */
export const CHAT_REACTION_CHOICES = ['♡', '✲', '☆', '哼', '❤️', '👍', '😂', '🥺', '✨'] as const;
export type ChatReactionEmoji = (typeof CHAT_REACTION_CHOICES)[number];

const LEGACY_KEY = 'kk-rx';
const LEGACY_CHOICES = new Set<string>(['♡', '✲', '☆', '哼']);

export function parseLegacyKekeReaction(raw: unknown, messageId: string): ChatReactionEmoji | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const choice = (raw as Record<string, unknown>)[messageId];
  return typeof choice === 'string' && LEGACY_CHOICES.has(choice) ? choice as ChatReactionEmoji : null;
}

export function readLegacyKekeReaction(messageId: string): ChatReactionEmoji | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseLegacyKekeReaction(JSON.parse(window.localStorage.getItem(LEGACY_KEY) || '{}'), messageId);
  } catch { return null; }
}

export function resolveMessageReactions(message: Pick<ChatMessage, 'id' | 'reactions'>): readonly string[] {
  const canonical = message.reactions ?? [];
  // An explicit [] records a canonical choice (including removal). Do not
  // resurrect historical localStorage markers after the user removed them.
  if (Array.isArray(message.reactions) && canonical.length === 0) return canonical;
  const legacy = readLegacyKekeReaction(message.id);
  return legacy && !canonical.includes(legacy) ? [...canonical, legacy] : canonical;
}

/** Called only after a canonical ChatMessage write persists successfully. */
export function clearLegacyKekeReaction(messageId: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(LEGACY_KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const records = raw as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(records, messageId)) return;
    delete records[messageId];
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify(records));
  } catch { /* Never let a disabled localStorage break the canonical update. */ }
}

export function toggleReactionEmoji(current: readonly string[] | undefined, emoji: ChatReactionEmoji): string[] {
  const previous = [...new Set(current ?? [])];
  return previous.includes(emoji) ? previous.filter((item) => item !== emoji) : [...previous, emoji];
}
