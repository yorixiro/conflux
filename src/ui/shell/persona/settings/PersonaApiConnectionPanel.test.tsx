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

describe('role API settings surface', () => {
  it('only selects an existing provider, edits credentials in the original manager', () => {
    const html = renderToStaticMarkup(<PersonaApiConnectionPanel
      activePersona={persona} providers={[api]} onUpdatePersona={vi.fn()}
      onOpenProviderSettings={vi.fn()} />);
    expect(html.match(/<select/g)).toHaveLength(1);
    expect(html).toContain('使用的 API');
    expect(html).toContain('管理 API（地址、密钥与模型）');
    expect(html).toContain('角色模型');
    expect(html).not.toContain('复制成');
    expect(html).not.toContain('跟随全局');
    expect(html).not.toContain('API Key');
  });

  it('discloses an obsolete persona model override on an ACP provider', () => {
    const acp = { ...api, agentTransport: 'devin-acp' as const };
    const html = renderToStaticMarkup(<PersonaApiConnectionPanel
      activePersona={persona} providers={[acp]} onUpdatePersona={vi.fn()} />);
    expect(html).toContain('当前角色留有旧模型覆盖');
    expect(html).toContain('ACP 已忽略这个旧值');
    expect(html).toContain('清除旧模型覆盖');
    expect(html).toContain('claude-test');
  });

  it('keeps ACP model settings off the ordinary provider form', () => {
    const acp = { ...api, agentTransport: 'devin-acp' as const };
    const acpPersona = { ...persona, advanced: { ...persona.advanced, providerId: acp.id } };
    const html = renderToStaticMarkup(<PersonaApiConnectionPanel
      activePersona={acpPersona} providers={[acp]} onUpdatePersona={vi.fn()} />);
    expect(html).toContain('通过本地桥接发送聊天消息');
    expect(html).not.toContain('角色模型');
  });
});
