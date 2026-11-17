import type { ProviderCompatibilityMode } from './provider-runtime/internal/providerProfile';

function parseErrorSnippet(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: {
        message?: unknown;
        type?: unknown;
        code?: unknown;
      };
      message?: unknown;
      type?: unknown;
      code?: unknown;
    };
    const parts = [
      typeof parsed.error?.message === 'string' ? parsed.error.message : null,
      typeof parsed.error?.type === 'string' ? parsed.error.type : null,
      typeof parsed.error?.code === 'string' ? parsed.error.code : null,
      typeof parsed.message === 'string' ? parsed.message : null,
      typeof parsed.type === 'string' ? parsed.type : null,
      typeof parsed.code === 'string' ? parsed.code : null
    ].filter(Boolean);
    return parts.join(' | ');
  } catch {
    return trimmed.slice(0, 180);
  }
}

function looksLikeContextLimitError(message: string, status?: number) {
  const lower = message.toLowerCase();
  return (
    status === 413
    || lower.includes('context_length_exceeded')
    || lower.includes('maximum context length')
    || lower.includes('max context length')
    || lower.includes('prompt is too long')
    || lower.includes('input is too long')
    || lower.includes('request too large')
    || lower.includes('payload too large')
    || lower.includes('too many tokens')
    || lower.includes('reduce the length')
    || lower.includes('would exceed')
    || lower.includes('request would exceed')
    || lower.includes('当前请求太大')
    || lower.includes('上下文或工具提示太长')
  );
}

export function isProviderFailureDiagnosticMessage(message: string) {
  const trimmed = message.trim();
  return (
    /^api 返回为空(?::|：|$)/i.test(trimmed)
    || /^api \d{3}:/i.test(trimmed)
    || /^http \d{3} from /i.test(trimmed)
  );
}

function extractEmptyProviderPayload(message: string): Record<string, unknown> | null {
  const payloadText = message.replace(/^api 返回为空(?::|：)?/i, '').trim();
  if (!payloadText) return null;
  const jsonStart = payloadText.indexOf('{');
  const jsonEnd = payloadText.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;

  try {
    const parsed = JSON.parse(payloadText.slice(jsonStart, jsonEnd + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function resolveEmptyProviderFacts(message: string) {
  const payload = extractEmptyProviderPayload(message);
  if (!payload) return null;

  const choice = Array.isArray(payload.choices) ? readObject(payload.choices[0]) : null;
  const usage = readObject(payload.usage);
  const finishReason =
    typeof choice?.finish_reason === 'string'
      ? choice.finish_reason
      : typeof choice?.finishReason === 'string'
        ? choice.finishReason
        : null;
  const inputTokens = readNumber(usage?.prompt_tokens) ?? readNumber(usage?.input_tokens);
  const outputTokens = readNumber(usage?.completion_tokens) ?? readNumber(usage?.output_tokens);
  const model = typeof payload.model === 'string' ? payload.model : null;

  return {
    model,
    finishReason,
    inputTokens,
    outputTokens
  };
}

function summarizeEmptyProviderRawMessage(message: string) {
  const facts = resolveEmptyProviderFacts(message);
  if (!facts) return message.trim() || 'API 返回为空';

  const parts = [
    facts.model ? `model=${facts.model}` : null,
    facts.finishReason ? `finish=${facts.finishReason}` : null,
    typeof facts.inputTokens === 'number' ? `input=${facts.inputTokens}` : null,
    typeof facts.outputTokens === 'number' ? `output=${facts.outputTokens}` : null
  ].filter(Boolean);
  const rawSnippet = message.trim().slice(0, 260);
  return [
    `API 返回为空：provider 返回了空正文${parts.length ? `（${parts.join('，')}）` : ''}。`,
    `原始片段：${rawSnippet}`
  ].join('\n');
}

function buildEmptyProviderHint(message: string) {
  const facts = resolveEmptyProviderFacts(message);
  if (
    facts
    && facts.finishReason === 'stop'
    && (facts.outputTokens === 0 || facts.outputTokens === null)
    && typeof facts.inputTokens === 'number'
    && facts.inputTokens >= 12_000
  ) {
    return '上游已经接收了请求，但没有生成任何正文。新对话能聊、旧对话复现时，优先怀疑旧对话历史 / 工具记录 / 中转兼容把这轮卡住了，不是 Key 整体坏掉。';
  }
  return '上游返回了空内容：这通常是 provider 没处理好上一轮工具历史或当前请求格式，可以重试；如果一直复现，再换直连或换模型。';
}

export function buildProviderFailureRequestContent(message: string) {
  const facts = resolveEmptyProviderFacts(message);
  const parts = [
    facts?.model ? `model=${facts.model}` : null,
    facts?.finishReason ? `finish=${facts.finishReason}` : null,
    typeof facts?.inputTokens === 'number' ? `input_tokens=${facts.inputTokens}` : null,
    typeof facts?.outputTokens === 'number' ? `output_tokens=${facts.outputTokens}` : null
  ].filter(Boolean);

  return [
    '[Polaris 本地请求诊断]',
    '上一轮 provider 请求失败或返回空正文；这不是助手给用户的语义回复。',
    parts.length ? `诊断摘要：${parts.join('，')}` : '诊断摘要：provider_error',
    '继续回答用户最新消息，不要把这条诊断当作助手已经说过的话。'
  ].join('\n');
}

export function humanizeProviderError(params: {
  mode: ProviderCompatibilityMode;
  status: number;
  responseText: string;
}): string | null {
  const { mode, status, responseText } = params;
  const snippet = parseErrorSnippet(responseText);
  const looksLikeWrappedProxyStatus =
    snippet.includes('bad_response_status_code') || snippet.includes('openai_error');

  if (looksLikeContextLimitError(snippet, status)) {
    return '当前请求太大了：这轮上下文或工具提示塞得太多，provider 没吃下。';
  }

  if (mode === 'proxy' && looksLikeWrappedProxyStatus) {
    if (status === 429) {
      return '第三方中转返回了包装过的 429，像是它没吃下当前请求格式或上游路由临时变脾气了。';
    }
    return '第三方中转把上游错误包装掉了，当前更像兼容问题，不像单纯 key 填错。';
  }

  if (mode === 'proxy' && (status === 400 || status === 415 || status === 422)) {
    return '第三方中转没有接受当前请求参数，像是接口兼容不完整。';
  }

  return null;
}

export type NormalizedProviderErrorCode =
  | 'rate_limited'
  | 'auth_failed'
  | 'model_unavailable'
  | 'proxy_incompatible'
  | 'context_too_large'
  | 'provider_error';

export function normalizeProviderErrorMessage(message: string): {
  code: NormalizedProviderErrorCode;
  rawMessage: string;
  hintMessage?: string;
} {
  const trimmed = message.trim();
  const lower = message.toLowerCase();
  const rawMessage = trimmed || '请求失败';

  if (/^api 413:/i.test(trimmed)) {
    return {
      code: 'context_too_large',
      rawMessage,
      hintMessage: '当前请求体太大：这轮图片或上下文在网关层就被拦下了。可以重试、更换更小图片，或减少这轮历史。'
    };
  }

  if (/^api 400:\s*$/i.test(trimmed)) {
    return {
      code: 'provider_error',
      rawMessage,
      hintMessage: '上游拒绝了这次请求，但没有返回错误正文。若只有这个旧对话持续失败，通常是历史里的长输出或工具记录被 provider 拒绝。'
    };
  }

  if (/^api 返回为空(?::|：|$)/i.test(trimmed)) {
    return {
      code: 'provider_error',
      rawMessage: summarizeEmptyProviderRawMessage(rawMessage),
      hintMessage: buildEmptyProviderHint(rawMessage)
    };
  }

  if (
    lower.includes('未提供令牌')
    || lower.includes('invalid api key')
    || lower.includes('incorrect api key')
    || lower.includes('unauthorized')
    || lower.includes('authentication')
    || lower.includes('api key')
  ) {
    return {
      code: 'auth_failed',
      rawMessage,
      hintMessage: '认证失败：这个 provider 的 Key 可能无效、过期，或没有被正确带上。'
    };
  }

  if (
    lower.includes('model_not_found')
    || lower.includes('model not found')
    || lower.includes('no such model')
    || lower.includes('invalid model')
    || lower.includes('invalid_model_id')
    || lower.includes('model is not available')
    || lower.includes('not supported model')
  ) {
    return {
      code: 'model_unavailable',
      rawMessage,
      hintMessage: '模型不可用：当前 provider 上这个模型名可能已经下线、改名，或不支持当前路由。'
    };
  }

  if (looksLikeContextLimitError(message)) {
    return {
      code: 'context_too_large',
      rawMessage,
      hintMessage: '当前请求太大：这轮上下文或工具提示太长，provider 没吃下。可以重试，或换更稳的直连 / 大上下文模型。'
    };
  }

  if (
    lower.includes('bad_response_status_code')
    || lower.includes('openai_error')
    || lower.includes('兼容问题')
    || lower.includes('第三方中转')
  ) {
    return {
      code: 'proxy_incompatible',
      rawMessage,
      hintMessage: '中转兼容问题：这个 provider 像是没吃下当前请求格式，可以试试换模型、关流式，或换直连接口。'
    };
  }

  if (
    lower.includes('rate limit')
    || lower.includes('rate_limit')
    || lower.includes('too many requests')
    || lower.includes('quota')
    || lower.includes('限流')
    || lower.includes('限额')
    || lower.includes('额度用尽')
    || /^(?:api|http)\s+429\b/i.test(trimmed)
  ) {
    return {
      code: 'rate_limited',
      rawMessage,
      hintMessage: '请求过于频繁或额度用尽：这个 provider 当前像是限流了。'
    };
  }

  if (/^api \d+:/i.test(trimmed)) {
    return {
      code: 'provider_error',
      rawMessage
    };
  }

  return {
    code: 'provider_error',
    rawMessage
  };
}

function isNetworkBoundaryError(message: string) {
  const lower = message.trim().toLowerCase();
  return (
    lower.includes('load failed')
    || lower.includes('failed to fetch')
    || lower.includes('network request failed')
    || lower.includes('networkerror')
    || lower.includes('网络请求失败')
  );
}

function formatEndpointLabel(endpoint: string) {
  try {
    const parsed = new URL(endpoint);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return endpoint;
  }
}

export function explainConnectivityFailure(params: {
  message: string;
  endpoint: string;
  currentOrigin?: string | null;
  isNativeApp?: boolean;
}): string | null {
  const { message, endpoint, currentOrigin, isNativeApp = false } = params;
  if (!isNetworkBoundaryError(message)) return null;

  try {
    const target = new URL(endpoint);
    const source = currentOrigin ? new URL(currentOrigin) : null;

    if (source?.protocol === 'https:' && target.protocol === 'http:') {
      return `这条线路在真正发出去前就被拦了：当前页面是 HTTPS，但目标 ${formatEndpointLabel(endpoint)} 还是 HTTP，浏览器会直接拦掉这种不安全请求。`;
    }
  } catch {
    // If URL parsing fails, fall through to the generic network-boundary guidance.
  }

  const targetLabel = formatEndpointLabel(endpoint);

  if (isNativeApp) {
    return `网络握手在响应前就断了：更像 ${targetLabel} 没放行 \`capacitor://localhost\` 的跨域预检，或者它自己的 HTTPS / 证书链有问题。`;
  }

  if (currentOrigin?.includes('.vercel.app')) {
    return `网络握手在响应前就断了：更像 ${targetLabel} 没放行当前 Vercel 站点的跨域预检，或者目标地址本身不可达。`;
  }

  return `网络握手在响应前就断了：先检查 ${targetLabel} 是否放行 OPTIONS 预检，以及 \`Authorization\`、\`Content-Type\` 这两个请求头。`;
}
