import { useId, useState } from 'react';
import { buildProviderPresetPatch, PROVIDER_PRESETS } from '../../../../config/catalog/providerCatalog';
import { listSavedPersonaApiIds, addSavedPersonaApiId, removeSavedPersonaApiId } from '../../../../engines/personaApiConnections';
import { resolvePersonaProviderBinding } from '../../../../engines/personaProviderBinding';
import { getDefaultProviderPath } from '../../../../engines/providerProtocol';
import { usePersonaStore } from '../../../../stores/personaStore';
import { useRuntimeStore } from '../../../../stores/runtimeStore';
import type { ProviderProfile } from '../../../../types/domain';
import { getProviderModelBindingValue, getProviderModelDisplayLabel, isBuiltInProviderDisplay } from '../../apiProviderDisplay';
import { DevinAcpConnectionPanel } from '../../DevinAcpConnectionPanel';
import { PersonaModelSettings } from '../../PersonaModelSettings';
import type { PersonaTabProps } from '../personaUiShared';

type Props = Pick<PersonaTabProps, 'activePersona' | 'providers' | 'activeProviderId' | 'onUpdatePersona'> & {
  onUpdateProvider: (providerId: string, patch: Partial<ProviderProfile>) => void;
};

const PROTOCOLS: Array<{ value: ProviderProfile['protocol']; label: string }> = [
  { value: 'openai-completions', label: 'OpenAI Chat Completions' },
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'gemini-generate-content', label: 'Gemini Generate Content' }
];

/** Role-specific API selection. Provider secrets stay in the existing runtime store. */
export function PersonaApiConnectionPanel({
  activePersona,
  providers = [],
  activeProviderId,
  onUpdatePersona,
  onUpdateProvider
}: Props) {
  const fieldId = useId();
  const [sourceId, setSourceId] = useState('');
  const personas = usePersonaStore((state) => state.personas);
  const createProvider = useRuntimeStore((state) => state.createProvider);
  const duplicateProvider = useRuntimeStore((state) => state.duplicateProvider);
  if (!activePersona) return <p className="ps-footnote">请先选择一个 AI 角色。</p>;

  const advanced = activePersona.advanced;
  const savedIds = listSavedPersonaApiIds(advanced);
  const savedProviders = savedIds.map((id) => providers.find((p) => p.id === id)).filter((p): p is ProviderProfile => Boolean(p));
  const selectedId = advanced.providerId?.trim() || '';
  const current = providers.find((p) => p.id === selectedId) ?? null;
  const inheriting = !selectedId && advanced.providerRouteMode === 'inherit';
  const globalProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0] ?? null;
  const effective = current ?? (inheriting ? globalProvider : null);
  const binding = effective && globalProvider ? resolvePersonaProviderBinding({ persona: activePersona, providers, globalApi: globalProvider }) : null;

  // Legacy/shared connections stay read-only. Editing them starts from a private copy,
  // so changing one AI can never unexpectedly alter another AI's API credentials.
  const sharedElsewhere = Boolean(current && personas.some((p) => p.id !== activePersona.id &&
    (p.advanced.providerId === current.id || p.advanced.savedProviderIds?.includes(current.id))));
  const editable = Boolean(current && savedIds.includes(current.id) &&
    advanced.savedProviderIds?.includes(current.id) && !sharedElsewhere &&
    current.id !== activeProviderId && !isBuiltInProviderDisplay(current));
  const availableSources = providers.filter((p) => !isBuiltInProviderDisplay(p) && !savedIds.includes(p.id));

  function bindProvider(provider: ProviderProfile, nextIds: string[]) {
    onUpdatePersona({
      advanced: {
        providerId: provider.id,
        providerRouteMode: 'fixed',
        modelOverride: getProviderModelBindingValue(provider),
        savedProviderIds: nextIds
      }
    });
  }

  function createNew() {
    const id = createProvider('我的 API', { activate: false });
    const next = useRuntimeStore.getState().providers.find((p) => p.id === id);
    if (next) bindProvider(next, addSavedPersonaApiId(savedIds, id));
  }

  function copyFrom(source: ProviderProfile) {
    const id = duplicateProvider(source.id, source.name + ' · ' + activePersona.name, { activate: false });
    if (!id) return;
    const next = useRuntimeStore.getState().providers.find((p) => p.id === id);
    if (next) bindProvider(next, addSavedPersonaApiId(savedIds, id));
    setSourceId('');
  }

  function selectCurrent(value: string) {
    if (value === '__unconfigured__') {
      onUpdatePersona({ advanced: { providerId: '', providerRouteMode: 'unconfigured', modelOverride: '' } });
      return;
    }
    if (value === '__inherit__') {
      onUpdatePersona({ advanced: { providerId: '', providerRouteMode: 'inherit', modelOverride: '' } });
      return;
    }
    const next = providers.find((p) => p.id === value);
    if (next && savedIds.includes(next.id)) bindProvider(next, savedIds);
  }

  function removeCurrent() {
    if (!current) return;
    const remaining = removeSavedPersonaApiId(savedIds, current.id);
    const next = providers.find((p) => p.id === remaining[0]);
    if (next) bindProvider(next, remaining);
    else onUpdatePersona({
      advanced: { providerId: '', providerRouteMode: 'unconfigured', modelOverride: '', savedProviderIds: [] }
    });
  }

  const patchProvider = (patch: Partial<ProviderProfile>) => {
    if (!current || !editable) return;
    onUpdateProvider(current.id, patch);
  };

  return (
    <div className="conflux-role-connection">
      <div className="ps-field">
        <label className="ps-field-label" htmlFor={fieldId + '-saved'}>这个角色保存的 API</label>
        <select className="ps-input" id={fieldId + '-saved'}
          value={current ? current.id : inheriting ? '__inherit__' : '__unconfigured__'}
          onChange={(event) => selectCurrent(event.target.value)}>
          <option value="__unconfigured__">尚未选择</option>
          {inheriting ? <option value="__inherit__">原有全局连接（兼容旧设置）</option> : null}
          {current && !savedProviders.some((p) => p.id === current.id)
            ? <option value={current.id}>{current.name}（原有连接）</option> : null}
          {savedProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="provider-inline-actions">
        <button className="btn-secondary compact" type="button" onClick={createNew}>+ 新建 API</button>
        <label className="ps-field-label" htmlFor={fieldId + '-copy'}>复制已有 API 到这个角色</label>
        <select className="ps-input" id={fieldId + '-copy'} value={sourceId}
          onChange={(event) => {
            const id = event.target.value;
            setSourceId(id);
            const found = providers.find((p) => p.id === id);
            if (found) copyFrom(found);
          }}>
          <option value="">选择已有配置…</option>
          {availableSources.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {!effective && !selectedId ? <p className="conflux-role-notice">还没有配置 API。新建一个，或者复制已经保存的配置即可。</p> : null}
      {selectedId && !current ? <p className="conflux-role-notice">原绑定的 API 不存在，请重新选择；旧角色资料不会被自动替换。</p> : null}
      {binding?.status === 'missing-provider' ? <p className="conflux-role-notice">原 API 已不存在，请重新选择。</p> : null}
      {current ? (
        <>
          <div className="ps-field">
            <div className="ps-field-head">
              <label className="ps-field-label" htmlFor={fieldId + '-name'}>API 名称</label>
              {!editable ? <span className="ps-field-hint">共享或旧配置，只读</span> : null}
            </div>
            <input className="ps-input" id={fieldId + '-name'} value={current.name}
              disabled={!editable} onChange={(event) => patchProvider({ name: event.target.value })} />
          </div>
          {!editable ? (
            <div className="ps-field">
              <p className="ps-footnote">这条连接可能被其他角色或全局设置使用。先复制成当前角色专用配置，才可以安全修改地址和密钥。</p>
              {!isBuiltInProviderDisplay(current) ? <button className="btn-secondary compact" type="button" onClick={() => copyFrom(current)}>复制成我的独立 API</button> : null}
            </div>
          ) : null}
          {editable ? (
            <>
              <div className="ps-field">
                <label className="ps-field-label" htmlFor={fieldId + '-kind'}>连接类型</label>
                <select className="ps-input" id={fieldId + '-kind'}
                  value={current.agentTransport === 'devin-acp' ? 'devin-acp' : 'api'}
                  onChange={(event) => patchProvider({ agentTransport: event.target.value === 'devin-acp' ? 'devin-acp' : undefined })}>
                  <option value="api">普通 API</option>
                  <option value="devin-acp">Devin ACP</option>
                </select>
              </div>
              {current.agentTransport !== 'devin-acp' ? (
                <>
                  <div className="ps-field">
                    <label className="ps-field-label" htmlFor={fieldId + '-preset'}>供应商模板（可选）</label>
                    <select className="ps-input" id={fieldId + '-preset'} value=""
                      onChange={(event) => {
                        const patch = buildProviderPresetPatch(event.target.value);
                        if (patch) patchProvider(patch);
                      }}>
                      <option value="">自定义 API</option>
                      {PROVIDER_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    </select>
                  </div>
                  <div className="ps-field">
                    <label className="ps-field-label" htmlFor={fieldId + '-url'}>API 地址</label>
                    <input className="ps-input ps-input--mono" id={fieldId + '-url'} type="url"
                      value={current.baseUrl} placeholder="https://example.com/v1"
                      autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      onChange={(event) => patchProvider({ baseUrl: event.target.value })} />
                  </div>
                  <div className="ps-field">
                    <label className="ps-field-label" htmlFor={fieldId + '-key'}>API Key</label>
                    <input className="ps-input ps-input--mono" id={fieldId + '-key'} type="password"
                      value={current.apiKey} autoComplete="off" placeholder="填写密钥"
                      onChange={(event) => patchProvider({ apiKey: event.target.value })} />
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          {current.agentTransport === 'devin-acp' ? <DevinAcpConnectionPanel /> : (
            <>
              <p className="ps-footnote">{getProviderModelDisplayLabel(current)} · 模型仅对当前角色保存。</p>
              {editable ? <PersonaModelSettings key={activePersona.id} persona={activePersona} settings /> : null}
              {editable ? (
                <details className="conflux-role-optional">
                  <summary>高级设置 · 协议与请求路径</summary>
                  <div className="ps-field">
                    <label className="ps-field-label" htmlFor={fieldId + '-protocol'}>接口协议</label>
                    <select className="ps-input" id={fieldId + '-protocol'} value={current.protocol}
                      onChange={(event) => {
                        const protocol = event.target.value as ProviderProfile['protocol'];
                        patchProvider({ protocol, path: getDefaultProviderPath(protocol) });
                      }}>
                      {PROTOCOLS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="ps-field">
                    <label className="ps-field-label" htmlFor={fieldId + '-path'}>接口路径</label>
                    <input className="ps-input ps-input--mono" id={fieldId + '-path'} value={current.path}
                      onChange={(event) => patchProvider({ path: event.target.value })} />
                  </div>
                </details>
              ) : null}
            </>
          )}
          <button className="btn-secondary compact" type="button" onClick={removeCurrent}>从当前角色移除此 API</button>
          <p className="ps-footnote">移除只会取消该角色的保存与绑定，不删除 API 库里的密钥或其他角色的设置。</p>
        </>
      ) : inheriting && effective ? (
        <button className="btn-secondary compact" type="button" onClick={() => copyFrom(effective)}>复制原有连接并独立编辑</button>
      ) : null}
    </div>
  );
}
