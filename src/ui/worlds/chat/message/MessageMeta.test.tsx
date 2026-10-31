import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChatMessage } from '../../../../types/domain';
import { MessageMeta } from './MessageMeta';

function createAssistantMessage(extra?: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'assistant-1',
    role: 'assistant',
    content: '收到',
    timestamp: 1,
    assistantName: '小助手',
    model: 'Polaris',
    thinkingText: '内部思路',
    ...extra
  };
}

describe('MessageMeta', () => {
  it('hides thinking controls when thinking display is disabled', () => {
    const html = renderToStaticMarkup(
      <MessageMeta
        message={createAssistantMessage()}
        fallbackAssistantName="小助手"
        isThinkingActive={false}
        onOpenThinkingSummary={vi.fn()}
        showThinking={false}
      />
    );

    expect(html).toContain('小助手');
    expect(html).toContain('Polaris');
    expect(html).not.toContain('thinking-inline-trigger');
    expect(html).not.toContain('思路摘要');
  });

  it('hides model details when details are disabled', () => {
    const html = renderToStaticMarkup(
      <MessageMeta
        message={createAssistantMessage()}
        fallbackAssistantName="小助手"
        isThinkingActive={false}
        onOpenThinkingSummary={vi.fn()}
        showDetails={false}
        showThinking={false}
      />
    );

    expect(html).toContain('小助手');
    expect(html).not.toContain('Polaris');
  });
  it('uses a text thinking trigger instead of the Polaris star on every theme', () => {
    const html = renderToStaticMarkup(
      <MessageMeta
        message={createAssistantMessage()}
        fallbackAssistantName="小助手"
        isThinkingActive={false}
        onOpenThinkingSummary={vi.fn()}
      />
    );

    expect(html).toContain('thinking-inline-trigger');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('>thinking</span>');
    expect(html).not.toContain('polarisStar');
  });

});
