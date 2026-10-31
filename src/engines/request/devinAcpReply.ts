import type { AssistantReply, AssistantReplyProgress } from '../chatApi';
import type { AssistantRequestTool } from './requestContext';

export const DEVIN_ACP_PROVIDER_ID = 'conflux-devin-acp';

export async function requestDevinAcpReply(params: {
  prompt: string;
  initialContext?: string;
  images?: Array<{ mimeType: string; data: string }>;
  conversationId?: string;
  modelId?: string;
  signal?: AbortSignal;
  onProgress?: (reply: AssistantReplyProgress) => void;
  tools?: AssistantRequestTool[];
  onToolCall?: (call: { id: string; name: string; argumentsObject: Record<string, unknown> }) => Promise<{ isError: boolean; text: string }>;
}): Promise<AssistantReply> {
  const response = await fetch('/devin-acp/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt, initialContext: params.initialContext,
      ...(params.images?.length ? { images: params.images } : {}),
      conversationId: params.conversationId,
      modelId: params.modelId,
      tools: params.tools ?? []
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
      ? '4173 的本地 ACP 代理配置无效'
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
  let thinkingText = '';
  let contextUsage: { used: number; size: number } | undefined;
  let reportedUsage: AssistantReply['acpTokenReport'];
  let finished = false;
  const validTokens = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const readAgentUsage = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const fields = value as Record<string, unknown>;
    const result: NonNullable<AssistantReply['acpTokenReport']> = {};
    const mapping: Record<string, keyof typeof result> = {
      totalTokens: 'totalTokens',
      inputTokens: 'inputTokens',
      outputTokens: 'outputTokens',
      thoughtTokens: 'reasoningTokens',
      cachedReadTokens: 'cachedInputTokens',
      cachedWriteTokens: 'cacheCreationInputTokens'
    };
    for (const [source, target] of Object.entries(mapping)) {
      if (validTokens(fields[source])) result[target] = fields[source] as number;
    }
    if (Object.keys(result).length) reportedUsage = result;
  };
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
          update?: { sessionUpdate?: string; content?: { type?: string; text?: string }; used?: number; size?: number };
          result?: { usage?: unknown };
          error?: string;
          callId?: string;
          name?: string;
          arguments?: Record<string, unknown>;
          permissionId?: string;
          title?: string;
          description?: string;
          options?: Array<{ optionId: string; name: string; kind: string }>;
        };
        if (event.type === 'permission_request') {
          if (!event.permissionId || !Array.isArray(event.options)) throw new Error('Invalid ACP permission request');
          const allowOnce = event.options.find((option) => option.kind === 'allow_once');
          const rejectOnce = event.options.find((option) => option.kind === 'reject_once');
          const permissionDetails = [
            event.title || 'Devin 请求操作权限',
            event.description || '没有提供具体操作内容'
          ].join('\n');
          const approved = Boolean(allowOnce && typeof window !== 'undefined'
            && window.confirm(permissionDetails + '\n\n只允许本次操作？'));
          const response = await fetch('/devin-acp/permission/result', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              permissionId: event.permissionId,
              optionId: approved ? allowOnce?.optionId : rejectOnce?.optionId ?? null
            }),
            signal: params.signal
          });
          if (!response.ok && response.status !== 409) throw new Error('ACP permission reply failed');
          continue;
        }
        if (event.type === 'tool_request') {
          if (!event.callId || !event.name || !event.arguments
            || typeof event.arguments !== 'object' || Array.isArray(event.arguments)) {
            throw new Error('Invalid ACP tool request');
          }
          const call = {
            id: event.callId, name: event.name, argumentsObject: event.arguments
          };
          let receipt: { isError: boolean; text: string };
          try {
            receipt = params.onToolCall
              ? await params.onToolCall(call)
              : { isError: true, text: 'Browser tool executor unavailable' };
          } catch (error) {
            if (params.signal?.aborted) throw error;
            receipt = {
              isError: true,
              text: error instanceof Error ? error.message : 'Browser tool execution failed'
            };
          }
          const posted = await fetch('/devin-acp/tool/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callId: call.id, ...receipt }),
            signal: params.signal
          });
          // An expired/cancelled call is a failed MCP result, not a reason to
          // fabricate a successful tool outcome or discard the agent's reply.
          if (!posted.ok && posted.status !== 409) {
            throw new Error('ACP tool receipt was rejected');
          }
          continue;
        }
        if (event.type === 'error') throw new Error(event.error || 'ACP agent error');
        if (event.type === 'done') {
          finished = true;
          readAgentUsage(event.result?.usage);
        }
        if (event.type === 'update' && event.update?.sessionUpdate === 'usage_update'
          && validTokens(event.update.used) && validTokens(event.update.size)) {
          contextUsage = { used: event.update.used, size: event.update.size };
        }
        if (event.type === 'update') {
          const chunk = event.update?.content?.text;
          if (typeof chunk === 'string') {
            if (event.update?.sessionUpdate === 'agent_message_chunk') content += chunk;
            else if (event.update?.sessionUpdate === 'agent_thought_chunk') thinkingText += chunk;
            else continue;
            params.onProgress?.({
              content,
              model: 'Devin ACP',
              ...(thinkingText ? { thinkingText } : {})
            });
          }
        }
      }
      if (done) {
        // The last SSE frame is valid even without its final blank line.
        const trailing = buffer.trim();
        if (trailing) {
          const data = trailing.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
          if (data) {
            const event = JSON.parse(data) as {
              type: string; error?: string;
              result?: { usage?: unknown };
              update?: { sessionUpdate?: string; used?: number; size?: number };
            };
            if (event.type === 'error') throw new Error(event.error || 'ACP agent error');
            if (event.type === 'done') {
              finished = true;
              readAgentUsage(event.result?.usage);
            }
            if (event.type === 'update' && event.update?.sessionUpdate === 'usage_update'
              && validTokens(event.update.used) && validTokens(event.update.size)) {
              contextUsage = { used: event.update.used, size: event.update.size };
            }
          }
        }
        break;
      }
    }
    if (!finished) throw new Error('Devin ACP stream ended without completion');
    if (!content.trim()) throw new Error('Devin ACP returned no text');
    return {
      content,
      model: 'Devin ACP',
      ...(thinkingText ? { thinkingText } : {}),
      ...(contextUsage ? { acpContextUsage: contextUsage } : {}),
      ...(reportedUsage ? { acpTokenReport: reportedUsage } : {})
    };
  } finally {
    reader.releaseLock();
  }
}
