/** Local message metadata; no parallel DB or storage. */
export const CHAT_REACTION_CHOICES = ['❤️', '👍', '😂', '🥺', '✨'] as const;
export type ChatReactionEmoji = (typeof CHAT_REACTION_CHOICES)[number];

export function toggleReactionEmoji(current: readonly string[] | undefined, emoji: ChatReactionEmoji): string[] {
  const previous = [...new Set(current ?? [])];
  return previous.includes(emoji) ? previous.filter((item) => item !== emoji) : [...previous, emoji];
}
