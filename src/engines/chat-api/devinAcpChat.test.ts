import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AssistantRequestContext } from '../request/requestContext';
import { requestDevinAcpReply } from './devinAcpChat';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false }
}));

const originalFetch = globalThis.fetch;

function context(text: string): AssistantRequestContext {
  return {
    memorySlots: { session: [], profile: [], pin: [] },
    attachmentSlots: { enabled: false, pending: [] },
    segments: [{
      kind: 'conversation',
      messages: [{ role: 'user', content: text }]
    }]
  };
}

const provider = {
  id: 'acp-id', name: 'Devin ACP', agentTransport: 'devin-acp' as const,
  protocol: 'openai-completions' as const, baseUrl: '', apiKey: '', model: 'Devin ACP',
  path: '', capabilities: { images: false, streaming: true, thinking: false }
};

afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Devin ACP chat transport', () => {
  it('sends the conversation ID to the local proxy and reads ACP stream chunks', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"started","promptId":"test"}', '',
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"你好"}}}', '',
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"！"}}}', '',
      'data: {"type":"done","result":{}}', ''
    ].join('\n') + '\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' }
    }));
    const onProgress = vi.fn();
    const result = await requestDevinAcpReply({
      api: provider, context: context('测试'), sessionId: 'chat-123', onProgress
    });
    expect(result.content).toBe('你好！');
    expect(onProgress).toHaveBeenCalledTimes(2);
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(String(url)).toContain('/devin-acp/prompt');
    expect(JSON.parse(String(options?.body))).toMatchObject({
      conversationId: 'chat-123', prompt: '测试'
    });
  });

  it('rejects an unfinished stream instead of saving a partial reply as complete', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response(
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"半句"}}}\n\n',
      { status: 200, headers: { 'content-type': 'text/event-stream' } }
    ));
    await expect(requestDevinAcpReply({ api: provider, context: context('测试') }))
      .rejects.toThrow('提前中断');
  });
});
