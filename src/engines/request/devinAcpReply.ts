import type { AssistantReply, AssistantReplyProgress } from '../chatApi';

export const DEVIN_ACP_PROVIDER_ID = 'conflux-devin-acp';

export async function requestDevinAcpReply(params: {
  prompt: string;
  initialContext?: string;
  conversationId?: string;
  signal?: AbortSignal;
  onProgress?: (reply: AssistantReplyProgress) => void;
}): Promise<AssistantReply> {
  const response = await fetch('/devin-acp/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt, initialContext: params.initialContext,
      conversationId: params.conversationId
    }),
    signal: params.signal
  });
  if (!response.ok) {
    const payload = await response.text();
    let reason = payload;
    try {
      const data: unknown = JSON.parse(payload);
      if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
        reason = data.error;
      }
    } catch { /* Keep the response text for non-JSON failures. */ }
    const hint = response.status === 503
      ? '4173 本地服务未配置 ACP 桥接密钥'
      : response.status === 502
        ? '4173 无法访问 Devin ACP 桥接进程'
        : response.status === 401 ? 'ACP 桥接鉴权失败，密钥不一致' : 'ACP 请求失败';
    throw new Error(`${hint}（HTTP ${response.status}）${reason ? '：' + reason.slice(0, 240) : ''}`);
  }
  if (!response.body) throw new Error('Devin ACP 没有返回消息流');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      // Normalize after joining chunks: CR and LF may arrive separately.
      buffer = buffer.replace(/\r\n/g, '\n');
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
        if (!data) continue;
        const event = JSON.parse(data) as {
          type: string;
          update?: { sessionUpdate?: string; content?: { type?: string; text?: string } };
          error?: string;
        };
        if (event.type === 'error') throw new Error(event.error || 'ACP agent error');
        if (event.type === 'done') finished = true;
        if (event.type === 'update' && event.update?.sessionUpdate === 'agent_message_chunk') {
          const chunk = event.update.content?.text;
          if (typeof chunk === 'string') {
            content += chunk;
            params.onProgress?.({ content, model: 'Devin ACP' });
          }
        }
      }
      if (done) {
        // The last SSE frame is valid even without its final blank line.
        const trailing = buffer.trim();
        if (trailing) {
          const data = trailing.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
          if (data) {
            const event = JSON.parse(data) as { type: string; error?: string };
            if (event.type === 'error') throw new Error(event.error || 'ACP agent error');
            if (event.type === 'done') finished = true;
          }
        }
        break;
      }
    }
    if (!finished) throw new Error('Devin ACP stream ended without completion');
    if (!content.trim()) throw new Error('Devin ACP returned no text');
    return { content, model: 'Devin ACP' };
  } finally {
    reader.releaseLock();
  }
}
