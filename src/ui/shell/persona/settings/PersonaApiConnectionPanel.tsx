import { useId, useState } from 'react';
import { addSavedPersonaApiId, listSavedPersonaApiIds } from '../../../../engines/personaApiConnections';
import { usePersonaStore } from '../../../../stores/personaStore';
import { useRuntimeStore } from '../../../../stores/runtimeStore';
import type { ProviderProfile } from '../../../../types/domain';
import { isBuiltInProviderDisplay } from '../../apiProviderDisplay';
import { PersonaModelSettings } from '../../PersonaModelSettings';
import type { PersonaTabProps } from '../personaUiShared';

type Props = Pick<PersonaTabProps, 'activePersona' | 'providers' | 'activeProviderId' | 'onUpdatePersona'> & {
  onUpdateProvider: (providerId: string, patch: Partial<ProviderProfile>) => void;
};

export function PersonaApiConnectionPanel({
  activePersona, providers = [], activeProviderId, onUpdatePersona, onUpdateProvider
}: Props) {
  const fieldId = useId();
  const [acpStatus, setAcpStatus] = useState('尚未检测');
  const personas = usePersonaStore((state) => state.personas);
  const createProvider = useRuntimeStore((state) => state.createProvider);
  const duplicateProvider = useRuntimeStore((state) => state.duplicateProvider);

  if (!activePersona) return <p className="ps-footnote">请先选择一个 AI 角色。</p>;

  const personaId = activePersona.id;
  const savedIds = listSavedPersonaApiIds(activePersona.advanced);
  const activeId = activePersona.advanced.providerId?.trim() || '';
  const current = providers.find((provider) => provider.id === activeId)
    ?? (activePersona.advanced.providerRouteMode === 'inherit'
      ? providers.find((provider) => provider.id === activeProviderId) ?? null
      : null);
  const hasMissingRoute = Boolean(activeId && !providers.some((provider) => provider.id === activeId));
  const shared = Boolean(current && (
    current.id === activeProviderId
    || !activePersona.advanced.savedProviderIds?.includes(current.id)
    || personas.some((persona) => persona.id !== personaId
      && (persona.advanced.providerId === current.id
        || persona.advanced.savedProviderIds?.includes(current.id)))
  ));
  const builtIn = current ? isBuiltInProviderDisplay(current) : false;
  const isAcp = current?.agentTransport === 'devin-acp';
  const legacyAcp = Boolean(current && !isAcp && current.name.trim() === 'Devin ACP'
    && !current.baseUrl.trim() && !current.apiKey.trim());

  function bind(provider: ProviderProfile) {
    onUpdatePersona({ advanced: {
      providerId: provider.id,
      providerRouteMode: 'fixed',
      modelOverride: provider.agentTransport === 'devin-acp' ? '' : provider.model,
      savedProviderIds: addSavedPersonaApiId(savedIds, provider.id)
    } });
    setAcpStatus('尚未检测');
  }

  function choose(value: string) {
    if (value === '__new__' || value === '__acp__') {
      const id = createProvider(value === '__acp__' ? 'Devin ACP' : '我的 API', { activate: false });
      if (value === '__acp__') {
        useRuntimeStore.getState().updateProvider(id, {
          name: 'Devin ACP', agentTransport: 'devin-acp', model: '', baseUrl: '', apiKey: ''
        });
      }
      const provider = useRuntimeStore.getState().providers.find((item) => item.id === id);
      if (provider) bind(provider);
      return;
    }
    const provider = providers.find((item) => item.id === value);
    if (provider) bind(provider);
  }

  function edit(patch: Partial<ProviderProfile>) {
    if (!current || builtIn) return;
    if (!shared) {
      onUpdateProvider(current.id, patch);
      return;
    }
    // Copy only when the user edits a shared connection, never on ordinary selection.
    const id = duplicateProvider(current.id, current.name, { activate: false });
    if (!id) return;
    onUpdateProvider(id, patch);
    const provider = useRuntimeStore.getState().providers.find((item) => item.id === id);
    if (provider) bind(provider);
  }

  async function checkAcp() {
    setAcpStatus('正在检测…');
    try {
      const response = await fetch('/devin-acp/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json() as { running?: boolean; sessionReady?: boolean };
      setAcpStatus(result.running
        ? (result.sessionReady ? '已连接，代理会话可用' : '桥接在线，尚未建立会话')
        : 'ACP 代理未运行');
    } catch {
      setAcpStatus('本地 ACP 桥接不可用');
    }
  }

  return (
    <div className="conflux-role-connection" style={{
      display: 'grid', gap: 16, width: '100%', maxWidth: 620,
      minWidth: 0, margin: '0 auto', boxSizing: 'border-box'
    }}>
      <div className="ps-field">
        <label className="ps-field-label" htmlFor={fieldId + '-api'}>使用的 API</label>
        <select className="ps-input" id={fieldId + '-api'} value={current?.id ?? ''}
          onChange={(event) => choose(event.target.value)}>
          <option value="" disabled>选择 API</option>
          {hasMissingRoute ? <option value="" disabled>原 API 已不存在</option> : null}
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>{provider.name}</option>
          ))}
          <option value="__new__">＋ 新建 API</option>
          <option value="__acp__">＋ 新建 Devin ACP</option>
        </select>
      </div>

      {hasMissingRoute ? <p className="conflux-role-notice">原配置已不存在，请选择已有 API。</p> : null}
      {!current && !hasMissingRoute ? <p className="ps-footnote">选择已有 API，或新建一条连接。</p> : null}

      {current && legacyAcp ? (
        <div className="ps-field" style={{ display: 'grid', gap: 10 }}>
          <strong>Devin ACP</strong>
          <span className="ps-footnote">这是旧的 ACP 配置，但连接类型尚未标记。修正后不会再显示普通 API 表单。</span>
          <button type="button" className="btn-secondary compact" style={{ justifySelf: 'start' }}
            onClick={() => edit({ agentTransport: 'devin-acp', model: '' })}>修正为 Devin ACP</button>
        </div>
      ) : current && isAcp ? (
        <div className="ps-field" style={{ display: 'grid', gap: 10 }}>
          <strong>Devin ACP</strong>
          <span className="ps-footnote">本地代理连接，无需 API 地址、密钥或模型 ID。</span>
          <p role="status" style={{ margin: 0 }}>{acpStatus}</p>
          <button type="button" className="btn-secondary compact"
            style={{ justifySelf: 'start' }} onClick={() => { void checkAcp(); }}>检测连接</button>
        </div>
      ) : current && !builtIn ? (
        <>
          <div className="ps-field">
            <label className="ps-field-label" htmlFor={fieldId + '-url'}>API 地址</label>
            <input className="ps-input" id={fieldId + '-url'} type="url"
              placeholder="https://example.com/v1" value={current.baseUrl}
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onChange={(event) => edit({ baseUrl: event.target.value })}/>
          </div>
          <div className="ps-field">
            <label className="ps-field-label" htmlFor={fieldId + '-key'}>API Key</label>
            <input className="ps-input" id={fieldId + '-key'} type="password"
              autoComplete="off" placeholder="填写密钥" value={current.apiKey}
              onChange={(event) => edit({ apiKey: event.target.value })}/>
          </div>
          <PersonaModelSettings key={activePersona.id + ':' + current.id}
            persona={activePersona} settings/>
        </>
      ) : current ? (
        <p className="ps-footnote">这是应用内置连接。选择自定义 API 后可填写地址、密钥和模型。</p>
      ) : null}
    </div>
  );
}
