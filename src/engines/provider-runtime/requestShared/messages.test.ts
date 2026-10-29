import { describe, expect, it } from 'vitest';
import { assembleAssistantContext } from '../../request/requestContext';
import type { RequestMessage } from '../../request/requestMessage';
import { buildOrderedMessages } from './messages';

const deepSeekContextPolicy = {
  collapseSystemMessages: false,
  deferVolatileSystemMessages: true,
  omitVolatileSystemMessages: true
};

function buildContext(historySummary: string, addNewTurn = false) {
  const messages: RequestMessage[] = [
    { id: 'user-1', role: 'user', content: '第一轮提问', timestamp: 1 },
    { id: 'assistant-1', role: 'assistant', content: '第一轮回答', timestamp: 2 },
    ...(addNewTurn
      ? [{ id: 'user-2', role: 'user' as const, content: '第二轮提问', timestamp: 3 }]
      : [])
  ];

  return assembleAssistantContext({
    systemPromptParts: [{ name: 'system_identity', layer: 'identity', content: '固定人设' }],
    messages,
    historySummaries: [historySummary]
  });
}

describe('DeepSeek ordered message prefix', () => {
  it('defers changing history summaries while preserving their contents', () => {
    const first = buildOrderedMessages(buildContext('旧历史摘要 A'), deepSeekContextPolicy);
    const second = buildOrderedMessages(buildContext('旧历史摘要 B', true), deepSeekContextPolicy);

    expect(first.map((message) => message.role)).toEqual(['system', 'user', 'assistant', 'system']);
    expect(first[3]?.content).toContain('旧历史摘要 A');
    expect(second.map((message) => message.role)).toEqual(['system', 'user', 'assistant', 'user', 'system']);
    expect(second[4]?.content).toContain('旧历史摘要 B');
    expect(second.slice(0, 3)).toEqual(first.slice(0, 3));
  });
});
