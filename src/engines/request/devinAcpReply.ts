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
  if (!response.ok || !response.body) {
    throw new Error('Devin ACP: ' + response.status + ' ' + (await response.text()).slice(0, 300));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
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
    }
    if (!finished) throw new Error('Devin ACP stream ended without completion');
    if (!content.trim()) throw new Error('Devin ACP returned no text');
    return { content, model: 'Devin ACP' };
  } finally {
    reader.releaseLock();
  }
}
