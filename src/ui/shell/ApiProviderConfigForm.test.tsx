import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROVIDER } from '../../stores/runtimeStoreProviders';
import { ApiProviderConfigForm } from './ApiProviderConfigForm';
import type { ProviderProfile } from '../../types/domain';

function renderProvider(api: ProviderProfile) {
  return renderToStaticMarkup(<ApiProviderConfigForm
    api={api} providers={[api]} modelPickerOpen apiTesting={false} apiTestResult={null}
    onSetApiConfig={vi.fn()} onToggleModelPicker={vi.fn()} onRunApiTest={vi.fn()}
  />);
}

describe('shared provider settings', () => {
  it('keeps ACP name, model picker and default model in the existing form without HTTP credentials', () => {
    const html = renderProvider({
      ...DEFAULT_PROVIDER, id: 'agent', name: 'My local agent', agentTransport: 'devin-acp',
      model: 'saved-agent-model', baseUrl: '', apiKey: ''
    });
    expect(html).toContain('value="My local agent"');
    expect(html).toContain('value="saved-agent-model"');
    expect(html).toContain('provider-model-list');
    expect(html).toContain('Devin 默认模型');
    expect(html).toContain('重试连接');
    expect(html).not.toContain('API Base URL');
    expect(html).not.toContain('API Key');
    expect(html).not.toContain('api-provider-test-button');
  });

  it('preserves ordinary provider connection fields and saved values', () => {
    const html = renderProvider({
      ...DEFAULT_PROVIDER, id: 'http', name: 'My HTTP API',
      baseUrl: 'https://api.example.com/v1', apiKey: 'test-only-key', model: 'saved-http-model'
    });
    expect(html).toContain('value="My HTTP API"');
    expect(html).toContain('value="https://api.example.com/v1"');
    expect(html).toContain('value="test-only-key"');
    expect(html).toContain('value="saved-http-model"');
    expect(html).not.toContain('重试连接');
  });

  it('leaves a legacy ACP connection unchanged until it is explicitly activated', () => {
    const api = { ...DEFAULT_PROVIDER, name: 'Devin ACP', baseUrl: '', apiKey: '', model: 'legacy-model' };
    const html = renderProvider(api);
    expect(html).toContain('启用 Devin ACP 本地代理');
    expect(html).not.toContain('API Base URL');
    expect(api.model).toBe('legacy-model');
    expect(api.agentTransport).toBeUndefined();
  });
});
