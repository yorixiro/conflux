import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROVIDER } from '../../stores/runtimeStoreProviders';
import { ApiProviderConfigForm } from './ApiProviderConfigForm';
import { ApiProviderModelSection } from './ApiProviderConfigEditableSections';
import { resolveApiProviderModelPickerState } from './ApiProviderConfigShared';
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

describe('model picker interaction state', () => {
  const api = { ...DEFAULT_PROVIDER, baseUrl: 'https://api.example.com/v1', apiKey: 'test-only' };
  const state = (patch: Partial<Parameters<typeof resolveApiProviderModelPickerState>[0]> = {}) =>
    resolveApiProviderModelPickerState({ api, open: false, presetModels: [], discoveredModels: [], status: 'idle', ...patch });

  it('requests models on first open but lets the user close while the request is pending', () => {
    expect(state().action).toBe('discover');
    const pending = state({ open: true, status: 'loading' });
    expect(pending.action).toBe('toggle');
    expect(pending.canRefresh).toBe(false);
    expect(state({ status: 'loading' }).action).toBe('disabled');
  });

  it.each(['idle', 'loading', 'error'] as const)('keeps the local agent default accessible while discovery is %s', (status) => {
    expect(state({ api: { ...DEFAULT_PROVIDER, agentTransport: 'devin-acp' }, status }).action).toBe('toggle');
  });

  it('keeps cached model labels available during refresh', () => {
    const models = [{ id: 'saved-model', label: 'Saved model' }];
    const pending = state({ status: 'loading', discoveredModels: models });
    expect(pending.action).toBe('toggle');
    expect(pending.models).toEqual(models);
    expect(pending.canRefresh).toBe(false);
  });

  it('keeps preset choices usable after discovery fails or credentials are missing', () => {
    expect(state({ presetModels: ['preset-model'], status: 'error' }).action).toBe('toggle');
    expect(state({ api: { ...api, apiKey: '' }, presetModels: ['preset-model'] }).action).toBe('toggle');
  });

  it('renders a working close control and disables only duplicate refreshes while loading', () => {
    const acp = { ...DEFAULT_PROVIDER, agentTransport: 'devin-acp' as const };
    const html = renderToStaticMarkup(<ApiProviderModelSection
      api={acp} modelPickerOpen
      picker={state({ api: acp, open: true, status: 'loading' })}
      modelDiscoveryStatus="loading" modelDiscoveryError={null}
      onSetApiConfig={vi.fn()} onOpenModelPicker={vi.fn()} onRefreshModels={vi.fn()}
    />);
    const toggle = html.match(/<button[^>]*class="provider-model-toggle"[^>]*>/)?.[0];
    expect(toggle).toContain('aria-label="收起模型列表"');
    expect(toggle).not.toContain('disabled');
    expect(html).toContain('disabled="">正在拉取…');
    expect(html).toContain('Devin 默认模型');
  });
});
