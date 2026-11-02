import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../../../types/domain';
import { buildTimelineRenderItems } from './messageTimelineItems';

function buildMessage(overrides: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'role' | 'content'>): ChatMessage {
  return {
    timestamp: 1,
    ...overrides
  };
}

describe('buildTimelineRenderItems', () => {
  it('keeps trigger runtime messages out of the visible timeline', () => {
    const previousAssistant = buildMessage({
      id: 'assistant-0',
      role: 'assistant',
      content: '上一条回复。'
    });
    const trigger = buildMessage({
      id: 'trigger-1',
      role: 'system',
      origin: 'trigger-runtime',
      content: '（定时唤醒：晚安）',
      requestRole: 'user',
      requestContent: '看看我现在状态'
    });
    const assistant = buildMessage({
      id: 'assistant-1',
      role: 'assistant',
      content: '醒了，我在。'
    });

    const items = buildTimelineRenderItems([previousAssistant, trigger, assistant]);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.message.id)).toEqual(['assistant-0', 'assistant-1']);
    expect(items[1]?.isAssistantContinuation).toBe(false);
  });

  it('attaches runtime tool messages to their origin assistant turn', () => {
    const assistant = buildMessage({
      id: 'assistant-1',
      role: 'assistant',
      content: '我先看一下。'
    });
    const tool = buildMessage({
      id: 'tool-1',
      role: 'system',
      origin: 'tool-runtime',
      content: '已读取卡片',
      toolInvocation: {
        id: 'tool-1',
        kind: 'readCodeCard',
        status: 'executed',
        title: '读取卡片',
        summary: '已读取卡片',
        originMessageId: 'assistant-1'
      }
    });
    const followup = buildMessage({
      id: 'assistant-2',
      role: 'assistant',
      content: '我继续改。'
    });

    const items = buildTimelineRenderItems([assistant, tool, followup]);

    expect(items).toHaveLength(2);
    expect(items[0]?.message.id).toBe('assistant-1');
    expect(items[0]?.toolMessages.map((message) => message.id)).toEqual(['tool-1']);
    expect(items[0]?.isAssistantContinuation).toBe(false);
    expect(items[0]?.isTerminalAssistantInUserTurn).toBe(false);
    expect(items[1]?.message.id).toBe('assistant-2');
    expect(items[1]?.toolMessages).toEqual([]);
    expect(items[1]?.isAssistantContinuation).toBe(true);
    expect(items[1]?.isTerminalAssistantInUserTurn).toBe(true);
  });

  it('keeps runtime tool messages standalone when no assistant origin exists', () => {
    const tool = buildMessage({
      id: 'tool-1',
      role: 'system',
      origin: 'tool-runtime',
      content: '已切换世界',
      toolInvocation: {
        id: 'tool-1',
        kind: 'switchWorld',
        status: 'executed',
        title: '切换世界',
        summary: '已切换世界'
      }
    });

    const items = buildTimelineRenderItems([tool]);

    expect(items).toHaveLength(1);
    expect(items[0]?.message.id).toBe('tool-1');
    expect(items[0]?.toolMessages).toEqual([]);
    expect(items[0]?.isAssistantContinuation).toBe(false);
    expect(items[0]?.isTerminalAssistantInUserTurn).toBe(false);
  });

  it('keeps execution receipts visible when their original assistant message is not loaded', () => {
    const tool = buildMessage({
      id: 'tool-orphan',
      role: 'system',
      origin: 'tool-runtime',
      content: '已写入文件',
      toolInvocation: {
        id: 'tool-orphan',
        kind: 'createProjectFile',
        status: 'executed',
        title: '创建文件',
        summary: '已写入文件',
        originMessageId: 'assistant-not-loaded',
        codeWriteDetails: [{
          label: 'index.html',
          language: 'html',
          code: '<main>hi</main>',
          addedLines: 1,
          removedLines: 0
        }]
      }
    });
    const unrelatedAssistant = buildMessage({
      id: 'assistant-visible',
      role: 'assistant',
      content: '我还在这里。'
    });

    const items = buildTimelineRenderItems([tool, unrelatedAssistant]);

    expect(items.map((item) => item.message.id)).toEqual(['tool-orphan', 'assistant-visible']);
    expect(items[0]?.toolMessages).toEqual([]);
    expect(items[0]?.message.toolInvocation?.codeWriteDetails?.[0]?.code).toBe('<main>hi</main>');
    expect(items[1]?.toolMessages).toEqual([]);
  });

  it('marks only the last assistant segment in a user turn as terminal', () => {
    const user = buildMessage({
      id: 'user-1',
      role: 'user',
      content: '帮我处理这个 zip'
    });
    const assistant1 = buildMessage({
      id: 'assistant-1',
      role: 'assistant',
      content: ''
    });
    const tool = buildMessage({
      id: 'tool-1',
      role: 'system',
      origin: 'tool-runtime',
      content: '已查看压缩包目录',
      toolInvocation: {
        id: 'tool-1',
        kind: 'inspectArchiveEntries',
        status: 'executed',
        title: '查看压缩包',
        summary: '已读取目录',
        originMessageId: 'assistant-1'
      }
    });
    const assistant2 = buildMessage({
      id: 'assistant-2',
      role: 'assistant',
      content: '我已经找到主文档了。'
    });

    const items = buildTimelineRenderItems([user, assistant1, tool, assistant2]);

    expect(items[1]?.message.id).toBe('assistant-1');
    expect(items[1]?.isTerminalAssistantInUserTurn).toBe(false);
    expect(items[2]?.message.id).toBe('assistant-2');
    expect(items[2]?.isTerminalAssistantInUserTurn).toBe(true);
  });
});
