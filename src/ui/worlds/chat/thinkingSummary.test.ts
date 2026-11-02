import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../../types/domain';
import { buildThinkingSessionSummary, buildThinkingSummary } from './thinkingSummary';

function createMessage(patch: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'role' | 'content'>): ChatMessage {
  return {
    timestamp: 0,
    ...patch
  };
}

describe('buildThinkingSessionSummary', () => {
  it('keeps soft line breaks inside the same summary item', () => {
    const items = buildThinkingSummary(
      [
        'The user sent me a file and seems to be sharing something interesting.',
        'Let me look at what this is before I decide how to respond.',
        'I should acknowledge it naturally.'
      ].join('\n')
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.detail).toContain('something interesting. Let me look at what this is');
  });

  it('still splits explicit list structure into separate items', () => {
    const items = buildThinkingSummary(
      [
        'I think they might be:',
        '1. Showing me the documentation',
        '2. Asking me to look at it for fun',
        '3. Wanting my opinion on it'
      ].join('\n')
    );

    expect(items).toHaveLength(4);
    expect(items[1]?.detail).toBe('Showing me the documentation');
    expect(items[3]?.detail).toBe('Wanting my opinion on it');
  });

  it('does not truncate thought items by default', () => {
    const items = buildThinkingSummary(
      [
        '1. 先确认目标',
        '2. 再确认约束',
        '3. 然后列方案',
        '4. 再排优先级',
        '5. 处理风险',
        '6. 收束回答',
        '7. 补一句提醒'
      ].join('\n')
    );

    expect(items).toHaveLength(7);
    expect(items[6]?.detail).toBe('补一句提醒');
  });

  it('splits long sentence groups across sentence punctuation', () => {
    const items = buildThinkingSummary(
      [
        '先确认用户看到的错误，并且把截图里反复出现的错误编号和真实 message 对上，这样才能区分只是界面边界兜底还是底层数据真的出了问题。',
        '再追踪源码里的正则语法，确认它是否会在 iOS WebView 里直接抛异常，因为这种异常会在组件渲染阶段发生，用户一打开页面就会被挡住。',
        '然后保持页面可打开，不碰本地数据，也不要让用户承担清缓存这种危险动作；最后给出修复和发布边界。'
      ].join('')
    );

    expect(items.map((item) => item.detail)).toEqual([
      '先确认用户看到的错误，并且把截图里反复出现的错误编号和真实 message 对上，这样才能区分只是界面边界兜底还是底层数据真的出了问题。 再追踪源码里的正则语法，确认它是否会在 iOS WebView 里直接抛异常，因为这种异常会在组件渲染阶段发生，用户一打开页面就会被挡住。',
      '然后保持页面可打开，不碰本地数据，也不要让用户承担清缓存这种危险动作； 最后给出修复和发布边界。'
    ]);
  });

  it('displays the provider original thinking text without modifying its formatting', () => {
    const original = '先梳理目标。\\n\\n再确定约束。';
    const summary = buildThinkingSessionSummary([
      createMessage({ id: 'user-1', role: 'user', content: '帮我想想' }),
      createMessage({ id: 'assistant-1', role: 'assistant', content: '我想好了。', thinkingText: original })
    ], 'assistant-1');

    expect(summary?.steps).toEqual([{ id: 'assistant-1', kind: 'thinking', rawText: original }]);
  });

  it('keeps provider thinking and tool events in original order', () => {
    const summary = buildThinkingSessionSummary([
      createMessage({ id: 'user-1', role: 'user', content: '查一下再回答' }),
      createMessage({ id: 'assistant-1', role: 'assistant', content: '', thinkingText: '先确认查询范围。' }),
      createMessage({
        id: 'tool-1', role: 'system', origin: 'tool-runtime', content: '已联网搜索',
        toolInvocation: { id: 'tool-1', kind: 'webSearch', status: 'executed', title: '联网搜索', summary: '已找到结果' }
      }),
      createMessage({ id: 'assistant-2', role: 'assistant', content: '整理完毕。', thinkingText: '根据结果回答。' })
    ], 'assistant-2');

    expect(summary?.steps.map(step => step.kind)).toEqual(['thinking', 'tool', 'thinking']);
    expect(summary?.steps[0]).toMatchObject({ rawText: '先确认查询范围。' });
    expect(summary?.steps[2]).toMatchObject({ rawText: '根据结果回答。' });
  });
});
