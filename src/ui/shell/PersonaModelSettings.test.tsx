import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createPersonaTemplate } from '../../config/persona/personaBuilder';
import { createProviderRuntimeTestProvider } from '../../engines/provider-runtime/providerRuntimeFixtures';
import { PersonaModelSettings } from './PersonaModelSettings';

const state = vi.hoisted(() => ({ provider: null as any, personas: [] as any[], update: vi.fn(), refresh: vi.fn() }));
vi.mock('../../stores/runtimeStore', () => ({
  selectRuntimeApi: (s: any) => s.providers[0],
  useRuntimeStore: (select: any) => select({ providers: [state.provider], updateProvider: state.update })
}));
vi.mock('../../stores/personaStore', () => ({
  usePersonaStore: (select: any) => select({ personas: state.personas, updateCollaborator: state.update })
}));
vi.mock('./useProviderModelDiscovery', () => ({
  useProviderModelDiscovery: () => ({ models: [{ id: 'deepseek-v4-pro' }, { id: 'deepseek-v4-flash' }], status: 'success', refresh: state.refresh })
}));

function setup() {
  state.provider = createProviderRuntimeTestProvider({ id: 'route-a', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro', capabilities: { images: false, streaming: true, thinking: true } });
  const persona = createPersonaTemplate({ id: 'chat-ai', name: 'Chat AI', description: '' });
  persona.advanced = { ...persona.advanced, providerId: state.provider.id, providerRouteMode: 'fixed', modelOverride: 'deepseek-v4-flash', thinkingBudget: '16384' };
  state.personas = [persona];
  return persona;
}

describe('model and effort controls', () => {
  it('renders current model and supported effort in the compact chat strip, without connection forms', () => {
    const html = renderToStaticMarkup(<PersonaModelSettings persona={setup()} />);
    expect(html).toContain('chat-model-toolbar');
    expect(html).toContain('deepseek-v4-flash');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('跟随线路');
    expect(html).toContain('value="16384" selected=""');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('拉取模型列表');
    expect(html).not.toContain('手动填写');
    expect(state.refresh).not.toHaveBeenCalled();
  });
  it('places refresh and manual model input in API settings', () => {
    const html = renderToStaticMarkup(<PersonaModelSettings persona={setup()} settings />);
    expect(html).toContain('刷新模型列表');
    expect(html).toContain('>模型</label>');
    expect(html).toContain('list=');
    expect(html).not.toContain('模型 ID（也可手动填写）');
    expect(html).not.toContain('启用线路思考能力');
  });
  it('allows role-specific model selection on a shared API without editing shared capabilities', () => {
    const html = renderToStaticMarkup(
      <PersonaModelSettings persona={setup()} settings allowProviderCapabilityEdit={false} />
    );
    expect(html).toContain('>模型</label>');
    expect(html).toContain('deepseek-v4-flash');
    expect(html).not.toContain('启用线路思考能力');
    expect(html).not.toContain('disabled=""');
  });
  it('does not let an unconfigured persona inherit and change the global route', () => {
    const persona = setup();
    persona.advanced.providerId = '';
    persona.advanced.providerRouteMode = 'unconfigured';
    const html = renderToStaticMarkup(<PersonaModelSettings persona={persona} />);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
