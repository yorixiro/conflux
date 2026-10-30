import { useEffect, useId, useRef, useState } from 'react';
import { resolvePersonaProviderBinding } from '../../engines/personaProviderBinding';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import { canDiscoverProviderModels } from '../../engines/providerModelDiscovery';
import { usePersonaStore } from '../../stores/personaStore';
import { selectRuntimeApi, useRuntimeStore } from '../../stores/runtimeStore';
import type { Persona } from '../../types/domain';
import { useProviderModelDiscovery } from './useProviderModelDiscovery';
import './PersonaModelSettings.css';

export function PersonaModelSettings({
  persona, settings = false
}: { persona: Persona; settings?: boolean }) {
  const id = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const providers = useRuntimeStore((state) => state.providers);
  const globalApi = useRuntimeStore(selectRuntimeApi);
  const editablePersona = usePersonaStore((state) => state.personas.some((item) => item.id === persona.id));
  const updateCollaborator = usePersonaStore((state) => state.updateCollaborator);
  const binding = resolvePersonaProviderBinding({ persona, providers, globalApi });
  const capability = resolveProviderCapability(binding.api);
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
  const models = discovery.models.filter((model) => `${model.id} ${model.label || ''}`.toLowerCase().includes(query.toLowerCase()));
  const update = (advanced: Partial<Persona['advanced']>) => updateCollaborator(persona.id, { advanced });

  useEffect(() => { setPickerOpen(false); setQuery(''); }, [persona.id, binding.api.id, binding.api.baseUrl, binding.api.path, binding.api.protocol, binding.api.apiKey]);
  useEffect(() => {
    if (!pickerOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [pickerOpen]);

  function togglePicker() {
    setPickerOpen(!pickerOpen);
    setQuery('');
    if (!pickerOpen && canPull && !discovery.models.length && discovery.status !== 'loading') void discovery.refresh();
  }

  if (binding.api.agentTransport === 'devin-acp') {
    return <div className={settings ? 'persona-model-settings' : 'chat-model-toolbar'} aria-label="Devin ACP 代理连接">
      <div className="model-effort-row"><span className="ps-footnote">Devin ACP · 模型由代理管理</span></div>
    </div>;
  }

  if (settings) {
    return <div className="persona-model-settings" aria-label="当前角色模型">
      <div className="ps-field">
        <label className="ps-field-label" htmlFor={id + '-model'}>模型</label>
        <input className="ps-input"
          id={id + '-model'} list={id + '-model-options'}
          disabled={!editable} value={binding.modelOverride}
          placeholder={binding.api.model || '输入或选择模型 ID'}
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={(event) => update({ modelOverride: event.target.value })} />
        <datalist id={id + '-model-options'}>
          {discovery.models.map((model) => <option key={model.id} value={model.id}>{model.label || model.id}</option>)}
        </datalist>
      </div>
      <button className="btn-secondary compact" type="button"
        disabled={!canPull || discovery.status === 'loading'}
        onClick={() => void discovery.refresh()}>
        {discovery.status === 'loading' ? '正在获取模型…' : '刷新模型列表'}
      </button>
      {discovery.status === 'error' ? <p className="ps-footnote" role="status">{discovery.error}</p> : null}
    </div>;
  }

  return <div className="chat-model-toolbar" aria-label="当前 AI 模型与思考强度">
    <div className="model-effort-row">
      <div className="model-quick-picker" ref={pickerRef} onKeyDown={(event) => {
        if (event.key === 'Escape' && pickerOpen) {
          event.stopPropagation(); setPickerOpen(false); triggerRef.current?.focus();
        }
      }}>
        <button className="model-quick-trigger" type="button" ref={triggerRef} aria-label="选择模型" aria-expanded={pickerOpen} aria-controls={`${id}-models`} disabled={!editable} onClick={togglePicker} title={binding.modelId || '选择模型'}>
          <span className="model-quick-caption">模型</span>
          <span className="model-quick-value">{binding.modelId || '未配置'}</span>
          <span className="model-quick-arrow" aria-hidden="true">▾</span>
        </button>
        {pickerOpen ? <div className="model-quick-menu" id={`${id}-models`} role="dialog" aria-label="选择 API 模型">
          <div className="model-quick-menu-heading">
            <strong>选择模型</strong>
            <button type="button" disabled={!canPull || discovery.status === 'loading'} onClick={() => void discovery.refresh()}>{discovery.status === 'loading' ? '正在拉取…' : '刷新列表'}</button>
          </div>
          <input aria-label="搜索模型" placeholder="搜索模型" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="model-quick-options">
            {models.map((model) => <button key={model.id} type="button" aria-pressed={binding.modelId === model.id} onClick={() => {
              update({ modelOverride: model.id }); setPickerOpen(false); triggerRef.current?.focus();
            }}>
              <span>{model.id}</span><span aria-hidden="true">{binding.modelId === model.id ? '✓' : ''}</span>
            </button>)}
          </div>
          <div className="model-quick-status" role="status" aria-live="polite">
            {discovery.status === 'loading' ? '正在获取此 API 的模型列表…' : discovery.status === 'error' ? discovery.error : !canPull ? '请先在 API 设置中填写地址和密钥。' : query && !models.length ? '没有匹配的模型' : null}
          </div>
        </div> : null}
      </div>
      <label className="effort-quick-picker" title={canSetDepth ? '思考强度' : '请在 API 设置中检查思考能力'}>
        <span className="model-quick-caption">思考</span>
        <span className="model-quick-value" aria-hidden="true">{depths.find((depth) => depth.value === budget)?.label || '自定义'}</span>
        <select aria-label="思考强度" value={budget} disabled={!canSetDepth} onChange={(event) => update({ thinkingBudget: event.target.value })}>
          {depths.map((depth) => <option key={depth.value} value={depth.value}>{depth.label}</option>)}
          {!depths.some((depth) => depth.value === budget) ? <option value={budget}>自定义</option> : null}
        </select>
        <span className="model-quick-arrow" aria-hidden="true">▾</span>
      </label>
    </div>
  </div>;
}
