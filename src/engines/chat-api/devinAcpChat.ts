import { buildInternalApiEndpoint } from './chatApiEndpoint';
import type { AssistantReply, RequestAssistantReplyParams } from './chatApiTypes';

function textContent(content: string | Array<{ type: string; text?: string }>) {
  return typeof content === 'string'
    ? content
    : content.filter((part) => part.type === 'text').map((part) => part.text || '').join('\n');
}

function buildAcpPrompt(context: RequestAssistantReplyParams['context']) {
  const segments = context.segments;
  const conversation = segments.filter((segment) => segment.kind === 'conversation')
    .flatMap((segment) => segment.messages);
  const latestUser = [...conversation].reverse().find((message) => message.role === 'user');
  const prompt = latestUser ? textContent(latestUser.content).trim() : '';
  if (!prompt) throw new Error('Devin ACP 当前仅支持包含文字的聊天消息。');

  // Only the first prompt in a chat needs the full context. The bridge then
  // preserves its own ACP session keyed by the existing conversation ID.
  const transcript = segments.flatMap((segment) => segment.messages)
    .map((message) => {
      const text = textContent(message.content).trim();
      return text ? '[' + message.role + ']\n' + text : '';
    }).filter(Boolean).join('\n\n');
  if (transcript.length > 150000) {
    throw new Error('Devin ACP 的会话上下文过长，请缩短历史记录后再试。');
  }
  return { prompt, initialContext: transcript };
}

export async function requestDevinAcpReply(
  { api, context, sessionId, signal, onProgress }: RequestAssistantReplyParams
): Promise<AssistantReply> {
  const { prompt, initialContext } = buildAcpPrompt(context);
  const response = await fetch(buildInternalApiEndpoint('/devin-acp/prompt'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt, initialContext,
      conversationId: sessionId || undefined
    }),
    signal
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error('Devin ACP 连接失败 (' + response.status + '): ' + error.slice(0, 220));
  }
  if (!response.body) throw new Error('Devin ACP 没有返回可读取的消息流。');

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';
  let text = '';
  let completed = false;
  const reply = (): AssistantReply => ({
    content: text,
    model: api.model || 'Devin ACP',
    nativeToolCalls: [],
    usedNativeToolCalls: false,
    nativeToolCallCount: 0
  });

  function consumeEvent(raw: string) {
    const line = raw.split('\n').find((part) => part.startsWith('data: '));
    if (!line) return;
    const event = JSON.parse(line.slice(6)) as {
      type?: string;
      update?: { sessionUpdate?: string; content?: { type?: string; text?: string } };
      error?: string;
    };
    if (event.type === 'error') throw new Error(event.error || 'Devin ACP 请求失败');
    if (event.type === 'done') completed = true;
    if (event.type === 'update' && event.update?.sessionUpdate === 'agent_message_chunk') {
      const delta = event.update.content?.text || '';
      if (delta) {
        text += delta;
        onProgress?.(reply());
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        consumeEvent(event);
      }
      if (done) break;
    }
    if (buffer.trim()) consumeEvent(buffer);
  } finally {
    reader.releaseLock();
  }
  if (!completed) throw new Error('Devin ACP 消息流提前中断，回复未完成。');
  if (!text.trim()) throw new Error('Devin ACP 请求已结束，但没有返回文本内容。');
  return reply();
}
