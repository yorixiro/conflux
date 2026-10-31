import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestDevinAcpReply } from './devinAcpReply';
import {
  getAcpToolCardsSnapshot,
  resolveAcpPermission,
  subscribeAcpToolCards
} from '../../app/chat/acpLiveToolCards';

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

  it('shows an inline permission card and sends the selected response with no browser confirm', async () => {
    const calls: string[] = [];
    globalThis.fetch = vi.fn<typeof fetch>(async (url, init) => {
      calls.push(String(url));
      if (url === '/devin-acp/permission/result') {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          permissionId: 'perm-1', optionId: 'allow-1'
        });
        return new Response(JSON.stringify({ accepted: true }), { status: 200 });
      }
      return new Response([
        'data: {"type":"permission_request","permissionId":"perm-1","title":"运行测试","options":[{"optionId":"allow-1","name":"允许本次","kind":"allow_once"},{"optionId":"deny-1","name":"拒绝","kind":"reject_once"}]}',
        '',
        'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"执行完毕"}}}',
        '',
        'data: {"type":"done","result":{}}',
        ''
      ].join('\n') + '\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
    });
    let seenInlineCard = false;
    const unsubscribe = subscribeAcpToolCards(() => {
      const card = getAcpToolCardsSnapshot().find((item) =>
        item.conversationId === 'inline-test::persona' && item.state === 'approval'
      );
      if (!card) return;
      seenInlineCard = true;
      resolveAcpPermission(card.id, 'allow-1');
    });
    try {
      const answer = await requestDevinAcpReply({
        prompt: '运行测试', conversationId: 'inline-test::persona'
      });
      expect(answer.content).toBe('执行完毕');
      expect(seenInlineCard).toBe(true);
      expect(calls).toEqual(['/devin-acp/prompt', '/devin-acp/permission/result']);
    } finally {
      unsubscribe();
    }
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
