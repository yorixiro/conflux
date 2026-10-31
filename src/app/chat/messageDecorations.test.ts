import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../types/domain';
import { normalizeChatMessage } from '../../engines/chatMessageNormalization';
import { serializeMessagePayload } from '../../engines/localData/chatSqliteSerialization';
import { clearLegacyKekeReaction, parseLegacyKekeReaction, resolveMessageReactions, toggleReactionEmoji } from './messageDecorations';

describe('real message decorations', () => {
  it('adds and removes independent reactions without mutating the original', () => {
    const original = ['❤️', '✨'];
    const added = toggleReactionEmoji(original, '👍');
    expect(added).toEqual(['❤️', '✨', '👍']);
    expect(original).toEqual(['❤️', '✨']);
    expect(toggleReactionEmoji(added, '❤️')).toEqual(['✨', '👍']);
    expect(toggleReactionEmoji(undefined, '🥺')).toEqual(['🥺']);
  });

  it('reads old Keke marks as legacy values without overriding canonical empty reactions', () => {
    expect(parseLegacyKekeReaction({ m1: '哼' }, 'm1')).toBe('哼');
    expect(parseLegacyKekeReaction({ m1: 'invalid' }, 'm1')).toBeNull();
    expect(parseLegacyKekeReaction([], 'm1')).toBeNull();
    expect(resolveMessageReactions({ id: 'm1', reactions: [] })).toEqual([]);
    expect(toggleReactionEmoji(['哼'], '哼')).toEqual([]);
  });

  it('combines existing canonical reactions with legacy sticker marks and keeps other old entries', () => {
    let raw = JSON.stringify({ m1: '哼', m2: '☆' });
    vi.stubGlobal('window', { localStorage: {
      getItem: () => raw,
      setItem: (_key: string, value: string) => { raw = value; }
    } });
    try {
      expect(resolveMessageReactions({ id: 'm1', reactions: ['❤️'] })).toEqual(['❤️', '哼']);
      expect(resolveMessageReactions({ id: 'm1', reactions: undefined })).toEqual(['哼']);
      expect(resolveMessageReactions({ id: 'm1', reactions: [] })).toEqual([]);
      clearLegacyKekeReaction('m1');
      expect(JSON.parse(raw)).toEqual({ m2: '☆' });
      expect(resolveMessageReactions({ id: 'm1', reactions: ['❤️', '哼'] })).toEqual(['❤️', '哼']);
    } finally {
      vi.unstubAllGlobals();
    }
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
