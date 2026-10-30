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
      conversationId: 'chat-test-123', modelId: 'claude-model', onProgress
    });
    expect(answer.content).toBe('你好');
    expect(onProgress).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(url).toBe('/devin-acp/prompt');
    expect(JSON.parse(String(options?.body))).toMatchObject({
      prompt: '你好', conversationId: 'chat-test-123', modelId: 'claude-model'
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
  it('reads an SSE completion split across response chunks without a trailing empty line', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"已连接"}}}\r'));
        controller.enqueue(encoder.encode('\n\r'));
        controller.enqueue(encoder.encode('\ndata: {"type":"done","result":{}}'));
        controller.close();
      }
    });
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response(stream, {
      status: 200, headers: { 'content-type': 'text/event-stream' }
    }));
    const reply = await requestDevinAcpReply({ prompt: '你好' });
    expect(reply.content).toBe('已连接');
  });

  it('explains a missing ACP server token instead of showing raw JSON', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ error: 'Devin ACP bridge is not configured for this local server.' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    ));
    await expect(requestDevinAcpReply({ prompt: '你好' }))
      .rejects.toThrow('4173 的本地 ACP 代理配置无效');
  });
  it('retains only ACP reasoning chunks actually emitted by the agent', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"update","update":{"sessionUpdate":"agent_thought_chunk","content":{"type":"text","text":"先检查"}}}', '',
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"你好"}}}', '',
      'data: {"type":"done","result":{}}', ''
    ].join('\\n') + '\\n', { status: 200 }));
    const answer = await requestDevinAcpReply({ prompt: '测试' });
    expect(answer.content).toBe('你好');
    expect(answer.thinkingText).toBe('先检查');
    expect(answer.tokenUsage).toBeUndefined();
  });

});
