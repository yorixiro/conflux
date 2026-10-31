import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../types/domain';
import { normalizeChatMessage } from '../../engines/chatMessageNormalization';
import { serializeMessagePayload } from '../../engines/localData/chatSqliteSerialization';
import { toggleReactionEmoji } from './messageDecorations';

describe('real message decorations', () => {
  it('adds and removes independent reactions without mutating the original', () => {
    const original = ['❤️', '✨'];
    const added = toggleReactionEmoji(original, '👍');
    expect(added).toEqual(['❤️', '✨', '👍']);
    expect(original).toEqual(['❤️', '✨']);
    expect(toggleReactionEmoji(added, '❤️')).toEqual(['✨', '👍']);
    expect(toggleReactionEmoji(undefined, '🥺')).toEqual(['🥺']);
  });

  it('round-trips bookmark and reactions using the real LocalData serializer', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'saved', timestamp: 100,
      isFavorite: true, reactions: ['❤️', '✨'] };
    const stored = serializeMessagePayload(message, 'c1');
    const restored = normalizeChatMessage(JSON.parse(stored) as ChatMessage);
    expect(restored.id).toBe(message.id);
    expect(restored.content).toBe(message.content);
    expect(restored.isFavorite).toBe(true);
    expect(restored.reactions).toEqual(['❤️', '✨']);
  });
});
