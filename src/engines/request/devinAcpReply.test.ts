import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestDevinAcpReply } from './devinAcpReply';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('ACP chat reply over the existing request pipeline', () => {
  it('streams ACP chunks and sends conversation-scoped request context', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"started","promptId":"test"}', '',
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"你好"}}}', '',
      'data: {"type":"done","result":{}}', ''
    ].join('\n') + '\n', {
      status: 200, headers: { 'content-type': 'text/event-stream' }
    }));
    const onProgress = vi.fn();
    const answer = await requestDevinAcpReply({
      prompt: '你好', initialContext: '[system]\n你是助手\n\n[user]\n你好',
      conversationId: 'chat-test-123', onProgress
    });
    expect(answer.content).toBe('你好');
    expect(onProgress).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(url).toBe('/devin-acp/prompt');
    expect(JSON.parse(String(options?.body))).toMatchObject({
      prompt: '你好', conversationId: 'chat-test-123'
    });
  });

  it('rejects a truncated stream', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response(
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"半句"}}}\n\n',
      { status: 200, headers: { 'content-type': 'text/event-stream' } }
    ));
    await expect(requestDevinAcpReply({ prompt: '测试' }))
      .rejects.toThrow('without completion');
  });
});
