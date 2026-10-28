import { describe, expect, it } from 'vitest';
import { buildOpenAiCompatibleRequest } from './providerRuntimeOpenAiCompatibleAdapter';
import { buildResponsesRequest } from './providerRuntimeResponsesAdapter';
import { createProviderRuntimeAdvanced, createProviderRuntimeTestContext, createProviderRuntimeTestProvider } from './providerRuntimeFixtures';

// DeepSeek documents low/high/max for V4; no budget_tokens field.
// https://api-docs.deepseek.com/guides/thinking_mode/
describe('DeepSeek V4 effort request controls', () => {
  it.each([
    ['1024', 'low'], ['8192', 'high'], ['16384', 'max'], ['', undefined]
  ])('serializes saved selection %s in both protocols', (thinkingBudget, effort) => {
    const input = {
      api: createProviderRuntimeTestProvider({ baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro', capabilities: { images: false, streaming: false, thinking: true } }),
      context: createProviderRuntimeTestContext({ withTools: false }),
      advanced: createProviderRuntimeAdvanced({ thinkingBudget })
    };
    const chat = buildOpenAiCompatibleRequest(input).body;
    expect(chat.reasoning_effort).toBe(effort);
    expect(chat.thinking).toEqual(effort ? { type: 'enabled' } : undefined);
    const responses = buildResponsesRequest({ ...input, api: { ...input.api, protocol: 'openai-responses', path: '/responses' } }).body;
    expect(responses.reasoning).toEqual(effort ? { effort } : undefined);
  });
  it.each(['disabled', 'legacy', 'other-host'])('does not send V4 effort for %s', (scenario) => {
    const request = buildOpenAiCompatibleRequest({
      api: createProviderRuntimeTestProvider({
        baseUrl: scenario === 'other-host' ? 'https://example.com/v1' : 'https://api.deepseek.com/v1',
        model: scenario === 'legacy' ? 'deepseek-reasoner' : 'deepseek-v4-pro',
        capabilities: { images: false, streaming: false, thinking: scenario !== 'disabled' }
      }),
      context: createProviderRuntimeTestContext({ withTools: false }),
      advanced: createProviderRuntimeAdvanced({ thinkingBudget: '16384' })
    });
    expect(request.body.reasoning_effort).toBeUndefined();
  });
});
