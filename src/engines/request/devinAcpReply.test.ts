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

  it('uses the model ID acknowledged by the ACP bridge, not the generic SWE label', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"started","promptId":"test","modelId":"alternate-model"}', '',
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"Hello"}}}', '',
      'data: {"type":"done","result":{}}', ''
    ].join('\n') + '\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    const onProgress = vi.fn();
    const answer = await requestDevinAcpReply({
      prompt: 'Hello', conversationId: 'chat-model', modelId: 'alternate-model', onProgress
    });
    expect(answer.model).toBe('Devin ACP · alternate-model');
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      model: 'Devin ACP · alternate-model'
    }));
    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(JSON.parse(String(options?.body)).modelId).toBe('alternate-model');
  });

  it('does not claim a selected model when the bridge did not acknowledge it', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"started","promptId":"legacy"}', '',
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"Hello"}}}', '',
      'data: {"type":"done","result":{}}', ''
    ].join('\n') + '\n', { status: 200 }));
    const answer = await requestDevinAcpReply({ prompt: 'Hello', modelId: 'alternate-model' });
    expect(answer.model).toBe('Devin ACP');
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

  it.each([
    ['end_turn', 'stop'],
    ['max_tokens', 'length'],
    ['refusal', 'refusal']
  ])('preserves the %s stop reason for the existing reply lifecycle', async (stopReason, finishReason) => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"部分回复"}}}',
      '', `data: ${JSON.stringify({ type: 'done', result: { stopReason } })}`, ''
    ].join('\n') + '\n', { status: 200 }));
    const answer = await requestDevinAcpReply({ prompt: '继续' });
    expect(answer.finishReason).toBe(finishReason);
    expect(answer.acpTokenReport).toBeUndefined();
    expect(answer.tokenUsage).toBeUndefined();
  });

  it.each(['max_turn_requests', 'cancelled'])('does not treat %s as completed work', async (stopReason) => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"已经改了一半"}}}',
      '', `data: ${JSON.stringify({ type: 'done', result: { stopReason } })}`
    ].join('\n'), { status: 200 }));
    const progress = vi.fn();
    await expect(requestDevinAcpReply({ prompt: '继续', onProgress: progress })).rejects.toThrow(stopReason);
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ content: '已经改了一半' }));
  });

  it('preserves quota errors after partial output without retrying the request', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"正在修改"}}}',
      '', 'data: {"type":"error","error":"Rate limit exceeded: quota exhausted"}', ''
    ].join('\n') + '\n', { status: 200 }));
    await expect(requestDevinAcpReply({ prompt: '继续' })).rejects.toThrow('quota exhausted');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retains cache usage actually reported by the CLI in the final receipt', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response([
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"完成"}}}',
      '', `data: ${JSON.stringify({ type: 'done', result: {
        stopReason: 'end_turn', usage: { inputTokens: 1200, outputTokens: 30, cachedReadTokens: 900 }
      } })}`
    ].join('\n'), { status: 200 }));
    const answer = await requestDevinAcpReply({ prompt: '继续' });
    expect(answer.finishReason).toBe('stop');
    expect(answer.acpTokenReport).toEqual({ inputTokens: 1200, outputTokens: 30, cachedInputTokens: 900 });
  });

  it('reports an empty completed turn without inventing a successful reply', async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => new Response(
      'data: {"type":"done","result":{"stopReason":"end_turn"}}\n\n', { status: 200 }
    ));
    await expect(requestDevinAcpReply({ prompt: '继续' })).rejects.toThrow('没有返回正文');
  });
});
