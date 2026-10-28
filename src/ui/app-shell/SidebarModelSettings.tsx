import { useId } from 'react';
import { resolvePersonaProviderBinding } from '../../engines/personaProviderBinding';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import { canDiscoverProviderModels } from '../../engines/providerModelDiscovery';
import { usePersonaStore } from '../../stores/personaStore';
import { selectRuntimeApi, useRuntimeStore } from '../../stores/runtimeStore';
import type { Persona } from '../../types/domain';
import { useProviderModelDiscovery } from '../shell/useProviderModelDiscovery';

const DEPTHS = [
  { value: '', label: '默认' },
  { value: '1024', label: '低' },
  { value: '4096', label: '中' },
  { value: '8192', label: '高' }
];

export function SidebarModelSettings({ persona, onOpenSettings }: { persona: Persona; onOpenSettings: () => void }) {
  const id = useId();
  const providers = useRuntimeStore((state) => state.providers);
  const globalApi = useRuntimeStore(selectRuntimeApi);
  const isLocalPersona = usePersonaStore((state) => state.personas.some((item) => item.id === persona.id));
  const updateCollaborator = usePersonaStore((state) => state.updateCollaborator);
  const binding = resolvePersonaProviderBinding({ persona, providers, globalApi });
  const capability = resolveProviderCapability(binding.api);
  const discovery = useProviderModelDiscovery(binding.api);
  const hasRoute = Boolean(binding.fixedProvider || (!binding.fixedProviderId && persona.advanced.providerRouteMode === 'inherit'));
  const editable = isLocalPersona && hasRoute && !capability.route.isBuiltInTrial;
  const canPull = editable && canDiscoverProviderModels(binding.api);
  const budget = persona.advanced.thinkingBudget || '';
  const canSetDepth = editable && capability.thinking.sendBudget;
  const models = Array.from(new Set([binding.modelId, ...discovery.models.map((model) => model.id)].filter(Boolean)));
  const update = (advanced: Partial<Persona['advanced']>) => updateCollaborator(persona.id, { advanced });

  return (
    <section className="conflux-profile-model" aria-label="当前 AI 模型设置">
      <div className="conflux-profile-model-heading">
        <strong>模型与思考</strong>
        <button type="button" onClick={onOpenSettings}>API 设置</button>
      </div>
      <p>{hasRoute ? binding.api.name : '请先为当前 AI 配置 API 线路'}</p>
      <label htmlFor={`${id}-model`}>当前模型</label>
      <select id={`${id}-model`} value={binding.modelId || ''} disabled={!editable} onChange={(event) => update({ modelOverride: event.target.value })}>
        {!binding.modelId ? <option value="">请选择模型</option> : null}
        {models.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
      <div className="conflux-profile-model-actions">
        <button type="button" disabled={!canPull || discovery.status === 'loading'} onClick={() => void discovery.refresh()}>
          {discovery.status === 'loading' ? '正在拉取…' : discovery.models.length ? '刷新模型列表' : '拉取模型列表'}
        </button>
        <button type="button" disabled={!editable || !binding.modelOverride} onClick={() => update({ modelOverride: '' })}>跟随线路模型</button>
      </div>
      <div role="status" aria-live="polite">
        {discovery.status === 'error' ? <p>{discovery.error}</p> : null}
        {discovery.status === 'success' ? <p>已拉取 {discovery.models.length} 个模型</p> : null}
      </div>
      {editable ? <details>
        <summary>手动填写模型</summary>
        <label htmlFor={`${id}-manual`}>模型 ID</label>
        <input id={`${id}-manual`} value={binding.modelOverride} placeholder={binding.api.model || '输入模型 ID'} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => update({ modelOverride: event.target.value })} />
      </details> : null}
      <label htmlFor={`${id}-depth`}>思考深度</label>
      <select id={`${id}-depth`} value={budget} disabled={!canSetDepth} onChange={(event) => update({ thinkingBudget: event.target.value })}>
        {DEPTHS.map((depth) => <option key={depth.value} value={depth.value}>{depth.label}</option>)}
        {!DEPTHS.some((depth) => depth.value === budget) ? <option value={budget}>自定义 · {budget}</option> : null}
      </select>
      <p>{canSetDepth
        ? capability.thinking.effortMapping === 'responses-effort'
          ? '低 / 中 / 高对应 low / medium / high；默认由模型决定。'
          : '低 / 中 / 高使用 1024 / 4096 / 8192 思考预算；默认由模型决定。'
        : '当前线路未开启思考能力或不支持思考预算，可在 API 设置中查看。'}</p>
      <p>仅保存到当前 AI，下次请求生效。</p>
    </section>
  );
}
