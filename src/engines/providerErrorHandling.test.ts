import { describe, expect, it } from 'vitest';
import { explainConnectivityFailure, normalizeProviderErrorMessage } from './providerErrorHandling';

describe('normalizeProviderErrorMessage', () => {
  it.each([
    'rate_limit_error',
    'HTTP 429: upstream rejected the request',
    'API 429: too many requests',
    '本次请求触发限额',
    '当前额度用尽',
    '上游已限流'
  ])('recognizes CLI quota and rate errors without hiding the original: %s', (message) => {
    expect(normalizeProviderErrorMessage(message)).toMatchObject({
      code: 'rate_limited', rawMessage: message
    });
  });

  it('translates gateway 413 payload errors into a clear user message', () => {
    expect(
      normalizeProviderErrorMessage('API 413: <html><head><title>413 Request Entity Too Large</title></head></html>')
    ).toEqual({
      code: 'context_too_large',
      rawMessage: 'API 413: <html><head><title>413 Request Entity Too Large</title></head></html>',
      hintMessage: '当前请求体太大：这轮图片或上下文在网关层就被拦下了。可以重试、更换更小图片，或减少这轮历史。'
    });
  });

  it('translates wrapped proxy format errors even when they carry an API status prefix', () => {
    expect(
      normalizeProviderErrorMessage('API 400: {"error":{"message":"bad_response_status_code"}}')
    ).toEqual({
      code: 'proxy_incompatible',
      rawMessage: 'API 400: {"error":{"message":"bad_response_status_code"}}',
      hintMessage: '中转兼容问题：这个 provider 像是没吃下当前请求格式，可以试试换模型、关流式，或换直连接口。'
    });
  });

  it('recognizes wrapped 429 context-limit errors instead of surfacing raw payloads', () => {
    expect(
      normalizeProviderErrorMessage('API 429: {"error":{"message":"This request would exceed the model context window."}}')
    ).toEqual({
      code: 'context_too_large',
      rawMessage: 'API 429: {"error":{"message":"This request would exceed the model context window."}}',
      hintMessage: '当前请求太大：这轮上下文或工具提示太长，provider 没吃下。可以重试，或换更稳的直连 / 大上下文模型。'
    });
  });

  it('explains empty 400 responses without hiding the raw status', () => {
    expect(normalizeProviderErrorMessage('API 400:')).toEqual({
      code: 'provider_error',
      rawMessage: 'API 400:',
      hintMessage: '上游拒绝了这次请求，但没有返回错误正文。若只有这个旧对话持续失败，通常是历史里的长输出或工具记录被 provider 拒绝。'
    });
  });

  it('does not mistake empty response usage payloads for context-limit errors', () => {
    const rawMessage = 'API 返回为空：{"choices":[{"message":{"content":""},"finish_reason":"stop"}],"usage":{"prompt_tokens":9614}}';

    expect(normalizeProviderErrorMessage(rawMessage)).toEqual({
      code: 'provider_error',
      rawMessage: [
        'API 返回为空：provider 返回了空正文（finish=stop，input=9614）。',
        `原始片段：${rawMessage}`
      ].join('\n'),
      hintMessage: '上游返回了空内容：这通常是 provider 没处理好上一轮工具历史或当前请求格式，可以重试；如果一直复现，再换直连或换模型。'
    });
  });

  it('keeps raw empty payload evidence while explaining zero-output old-thread failures', () => {
    const rawMessage = 'API 返回为空：{"id":"chatcmpl-test","object":"chat.completion","model":"gpt-5.5","choices":[{"index":0,"message":{"role":"assistant","content":""},"finish_reason":"stop"}],"usage":{"prompt_tokens":20131,"completion_tokens":0}}';

    expect(normalizeProviderErrorMessage(rawMessage)).toEqual({
      code: 'provider_error',
      rawMessage: [
        'API 返回为空：provider 返回了空正文（model=gpt-5.5，finish=stop，input=20131，output=0）。',
        `原始片段：${rawMessage.slice(0, 260)}`
      ].join('\n'),
      hintMessage: '上游已经接收了请求，但没有生成任何正文。新对话能聊、旧对话复现时，优先怀疑旧对话历史 / 工具记录 / 中转兼容把这轮卡住了，不是 Key 整体坏掉。'
    });
  });

  it('still translates local auth failures without API wrapper', () => {
    expect(normalizeProviderErrorMessage('invalid api key')).toEqual({
      code: 'auth_failed',
      rawMessage: 'invalid api key',
      hintMessage: '认证失败：这个 provider 的 Key 可能无效、过期，或没有被正确带上。'
    });
  });

  it('recognizes provider invalid-model payloads as model availability failures', () => {
    expect(
      normalizeProviderErrorMessage('HTTP 400 from AmazonQ: {"message":"Invalid model.","reason":"INVALID_MODEL_ID"}')
    ).toEqual({
      code: 'model_unavailable',
      rawMessage: 'HTTP 400 from AmazonQ: {"message":"Invalid model.","reason":"INVALID_MODEL_ID"}',
      hintMessage: '模型不可用：当前 provider 上这个模型名可能已经下线、改名，或不支持当前路由。'
    });
  });
});

describe('explainConnectivityFailure', () => {
  it('explains mixed-content failures on https pages', () => {
    expect(
      explainConnectivityFailure({
        message: 'Load failed',
        endpoint: 'http://203.0.113.10/api/chat/completions',
        currentOrigin: 'https://polaris-two-topaz.vercel.app'
      })
    ).toContain('当前页面是 HTTPS');
  });

  it('explains native app cross-origin failures', () => {
    expect(
      explainConnectivityFailure({
        message: '网络请求失败',
        endpoint: 'https://relay.example.com/v1/chat/completions',
        isNativeApp: true
      })
    ).toContain('capacitor://localhost');
  });
});
