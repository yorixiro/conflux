import { useId } from 'react';
import { resolvePersonaProviderBinding } from '../../engines/personaProviderBinding';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import { canDiscoverProviderModels } from '../../engines/providerModelDiscovery';
import { usePersonaStore } from '../../stores/personaStore';
import { selectRuntimeApi, useRuntimeStore } from '../../stores/runtimeStore';
import type { Persona } from '../../types/domain';
import { useProviderModelDiscovery } from './useProviderModelDiscovery';
import './PersonaModelSettings.css';

export function PersonaModelSettings({ persona, settings = false }: { persona: Persona; settings?: boolean }) {
  const id = useId();
  const providers = useRuntimeStore((state) => state.providers);
  const globalApi = useRuntimeStore(selectRuntimeApi);
  const editablePersona = usePersonaStore((state) => state.personas.some((item) => item.id === persona.id));
  const updateCollaborator = usePersonaStore((state) => state.updateCollaborator);
  const binding = resolvePersonaProviderBinding({ persona, providers, globalApi });
  const capability = resolveProviderCapability(binding.api);
  const supportsDepth = resolveProviderCapability({ ...binding.api, capabilities: { ...binding.api.capabilities, thinking: true } }).thinking.sendBudget;
  const updateProvider = useRuntimeStore((state) => state.updateProvider);
  const discovery = useProviderModelDiscovery(binding.api);
  const hasRoute = Boolean(binding.fixedProvider || (!binding.fixedProviderId && persona.advanced.providerRouteMode === 'inherit'));
  const editable = editablePersona && hasRoute && !capability.route.isBuiltInTrial;
  const canPull = editable && canDiscoverProviderModels(binding.api);
  const budget = persona.advanced.thinkingBudget || '';
  const canSetDepth = editable && capability.thinking.sendBudget;
  const deepseek = capability.thinking.effortMapping === 'deepseek-effort';
  const depths = deepseek
    ? [{ value: '', label: '默认' }, { value: '1024', label: '低' }, { value: '8192', label: '高' }, { value: '16384', label: '最高' }]
    : [{ value: '', label: '默认' }, { value: '1024', label: '低' }, { value: '4096', label: '中' }, { value: '8192', label: '高' }];
  const models = Array.from(new Set([binding.modelId, ...discovery.models.map((model) => model.id)].filter(Boolean)));
  const update = (advanced: Partial<Persona['advanced']>) => updateCollaborator(persona.id, { advanced });

  return <div className={settings ? 'persona-model-settings' : 'chat-model-toolbar'} aria-label="当前 AI 模型与思考强度">
    <div className="model-effort-row">
      <label className="model-quick-picker" title={binding.modelId || '在 API 设置中配置模型'}>
        <span className="model-quick-caption">模型</span>
        <select aria-label="选择模型" value={binding.modelOverride} disabled={!editable} onChange={(event) => update({ modelOverride: event.target.value })}>
          <option value="">{binding.fixedProvider?.model || globalApi.model || '未配置'} · 跟随线路</option>
          {models.map((model) => <option key={model} value={model}>{model}</option>)}
        </select>
        <span className="model-quick-arrow" aria-hidden="true">▾</span>
      </label>
      <label className="effort-quick-picker" title={canSetDepth ? '思考强度' : '请在 API 设置中检查思考能力'}>
        <span className="model-quick-caption">EFFORT</span>
        <select aria-label="思考强度" value={budget} disabled={!canSetDepth} onChange={(event) => update({ thinkingBudget: event.target.value })}>
          {depths.map((depth) => <option key={depth.value} value={depth.value}>{depth.label}</option>)}
          {!depths.some((depth) => depth.value === budget) ? <option value={budget}>自定义</option> : null}
        </select>
        <span className="model-quick-arrow" aria-hidden="true">▾</span>
      </label>
    </div>
    {settings ? <>
      <button className="btn-secondary compact" type="button" disabled={!canPull || discovery.status === 'loading'} onClick={() => void discovery.refresh()}>
        {discovery.status === 'loading' ? '正在拉取…' : discovery.models.length ? '刷新模型列表' : '拉取模型列表'}
      </button>
      <div role="status" aria-live="polite">
        {discovery.status === 'error' ? <p className="ps-footnote">{discovery.error}</p> : null}
        {discovery.status === 'success' ? <p className="ps-footnote">已拉取 {discovery.models.length} 个模型，可在聊天输入框下方切换。</p> : null}
      </div>
      <label className="ps-field-label" htmlFor={`${id}-manual`}>模型 ID（也可手动填写）</label>
      <input className="ps-input ps-input--mono" id={`${id}-manual`} disabled={!editable} value={binding.modelOverride} placeholder={binding.api.model || '输入模型 ID'} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => update({ modelOverride: event.target.value })} />
      {supportsDepth ? <label className="ps-field-label">
        <input type="checkbox" disabled={!editable} checked={binding.api.capabilities.thinking} onChange={(event) => updateProvider(binding.api.id, { capabilities: { ...binding.api.capabilities, thinking: event.target.checked } })} />
        启用线路思考能力（共用此线路的角色生效）
      </label> : null}
      {!canSetDepth ? <p className="ps-footnote">此线路尚未开启思考能力或当前协议不支持强度设置。</p> : null}
    </> : null}
  </div>;
}
