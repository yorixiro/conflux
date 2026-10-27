import { describe, expect, it } from 'vitest';
import type { ChatMessage, Conversation, PersonaConversationSummary } from '../types/domain';
import {
  openConversationMemorySource,
  searchCollaboratorMemorySources
} from './memoryToolSearch';

function message(id: string, role: ChatMessage['role'], content: string, timestamp: number): ChatMessage {
  return { id, role, content, timestamp };
}

function conversation(seed: Partial<Conversation> & Pick<Conversation, 'id' | 'messages'>): Conversation {
  return {
    title: seed.id,
    collaboratorId: 'pharos',
    pinnedAt: null,
    updatedAt: 10,
    ...seed
  };
}

function summary(seed: Partial<PersonaConversationSummary> & Pick<PersonaConversationSummary, 'id' | 'content'>): PersonaConversationSummary {
  return {
    kind: 'recent_topic',
    title: seed.id,
    sequence: 1,
    sourceConversationIds: ['old'],
    sourceMessageIds: ['old-user'],
    sourceCharCount: 100,
    generator: 'small_model',
    generatedAt: 1,
    updatedAt: 1,
    ...seed
  };
}

describe('memoryToolSearch', () => {
  it('returns summary and source candidates without opening full source text', () => {
    const result = searchCollaboratorMemorySources({
      query: '智齿牙龈肿痛',
      maxResults: 3,
      summaries: [
        summary({
          id: 'wisdom-summary',
          title: '她最近在长智齿',
          content: '她最近长智齿，牙龈肿痛，需要提醒看牙医。'
        })
      ],
      conversations: [
        conversation({
          id: 'old',
          messages: [
            message('old-user', 'user', '我最近长智齿，牙龈肿痛，但是一直拖着没去牙医。', 1),
            message('old-assistant', 'assistant', '那这次要认真处理，不要硬扛。', 2)
          ]
        })
      ],
      activeConversationId: 'active',
      currentCollaboratorId: 'pharos'
    });

    expect(result.summaries).toEqual([
      expect.objectContaining({
        id: 'wisdom-summary',
        sourceConversationIds: ['old'],
        sourceMessageIds: ['old-user']
      })
    ]);
    expect(result.sources).toEqual([
      expect.objectContaining({
        conversationId: 'old',
        sourceMessageIds: ['old-user', 'old-assistant']
      })
    ]);
  });

  it('opens only requested memory source messages and marks truncation', () => {
    const opened = openConversationMemorySource({
      sourceConversationId: 'old',
      sourceMessageIds: ['old-user'],
      maxChars: 5,
      conversations: [
        conversation({
          id: 'old',
          messages: [
            message('old-user', 'user', '这是一段需要回读的原文。', 1),
            message('old-assistant', 'assistant', '不应该一起打开。', 2)
          ]
        })
      ]
    });

    expect(opened).toEqual(expect.objectContaining({
      conversationId: 'old',
      truncated: true,
      messages: [expect.objectContaining({
        id: 'old-user',
        content: '这是一段需'
      })]
    }));
  });

  it('never returns a summary whose source belongs to a different collaborator or was deleted', () => {
    const result = searchCollaboratorMemorySources({
      query: '羽毛球',
      summaries: [summary({ id: 'foreign', content: '喜欢打羽毛球', sourceConversationIds: ['private-b'] })],
      conversations: [
        conversation({ id: 'private-b', collaboratorId: 'persona-b', messages: [message('b1', 'user', '我喜欢羽毛球', 1)] }),
        conversation({ id: 'own', collaboratorId: 'pharos', messages: [message('a1', 'user', '今天去散步', 1)] })
      ],
      currentCollaboratorId: 'pharos'
    });
    expect(result.summaries).toEqual([]);
    expect(result.sources).toEqual([]);
  });

  it('fails closed when any requested source message has been deleted', () => {
    expect(openConversationMemorySource({
      sourceConversationId: 'old',
      sourceMessageIds: ['old-user', 'deleted-id'],
      conversations: [conversation({ id: 'old', messages: [message('old-user', 'user', '留下的消息', 1)] })]
    })).toBeNull();
  });
});
