import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createPersonaTemplate } from '../../../../config/persona/personaBuilder';
import { createProviderRuntimeTestProvider } from '../../../../engines/provider-runtime/providerRuntimeFixtures';
import { PersonaApiConnectionPanel } from './PersonaApiConnectionPanel';

vi.mock('../../PersonaModelSettings', () => ({
  PersonaModelSettings: () => <div aria-label="角色模型">模型</div>
}));

const api = createProviderRuntimeTestProvider({
  id: 'api-a', name: 'Claude API', model: 'claude-test'
});
const persona = createPersonaTemplate({ id: 'persona-a', name: 'Claude', description: '' });
persona.advanced = {
  ...persona.advanced, providerId: api.id, providerRouteMode: 'fixed', modelOverride: api.model
};

describe('one-page persona API configuration', () => {
  it('shows name, address, key, role model and test without leaving the page', () => {
    const html = renderToStaticMarkup(<PersonaApiConnectionPanel
      activePersona={persona} providers={[api]} onUpdatePersona={vi.fn()}
      onUpdateProvider={vi.fn()} />);
    expect(html.match(/<select/g)).toHaveLength(1);
    expect(html).toContain('使用的 API');
    expect(html).toContain('API Base URL');
    expect(html).toContain('API Key');
    expect(html).toContain('角色模型');
    expect(html).toContain('测试连接');
    expect(html).toContain('＋ 新建 API');
    expect(html).not.toContain('复制成');
    expect(html).not.toContain('跟随全局');
    expect(html).not.toContain('管理 API（地址、密钥与模型）');
  });

  it('hides ordinary API credentials for ACP', () => {
    const acp = { ...api, agentTransport: 'devin-acp' as const };
    const acpPersona = { ...persona, advanced: { ...persona.advanced, providerId: acp.id } };
    const html = renderToStaticMarkup(<PersonaApiConnectionPanel
      activePersona={acpPersona} providers={[acp]}
      onUpdatePersona={vi.fn()} onUpdateProvider={vi.fn()} />);
    expect(html).toContain('检查桥接状态');
    expect(html).not.toContain('API Base URL');
    expect(html).not.toContain('角色模型');
  });
});
