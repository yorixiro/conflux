import { useId, useState } from 'react';
import { addSavedPersonaApiId, listSavedPersonaApiIds } from '../../../../engines/personaApiConnections';
import { testApiConnection } from '../../../../engines/providerConnectionTest';
import { useRuntimeStore } from '../../../../stores/runtimeStore';
import type { ProviderProfile } from '../../../../types/domain';
import { isBuiltInProviderDisplay } from '../../apiProviderDisplay';
import { ApiProviderConnectionFields } from '../../ApiProviderConnectionSection';
import { PersonaModelSettings } from '../../PersonaModelSettings';
import type { PersonaTabProps } from '../personaUiShared';

type Props = Pick<PersonaTabProps, 'activePersona' | 'providers' | 'onUpdatePersona'> & {
  onUpdateProvider: (providerId: string, patch: Partial<ProviderProfile>) => void;
};

/** A single screen for choosing, creating and configuring the current persona's API. */
export function PersonaApiConnectionPanel({
  activePersona, providers = [], onUpdatePersona, onUpdateProvider
}: Props) {
  const fieldId = useId();
  const createProvider = useRuntimeStore((state) => state.createProvider);
  const [testStatus, setTestStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([]);
  const [modelStatus, setModelStatus] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);

  if (!activePersona) return <p className="ps-footnote">请先选择一个 AI 角色。</p>;

  const providerId = activePersona.advanced.providerId?.trim() || '';
  const current = providers.find((provider) => provider.id === providerId) ?? null;
  const missing = Boolean(providerId && !current);
  const savedIds = listSavedPersonaApiIds(activePersona.advanced);
  const isAcp = current?.agentTransport === 'devin-acp';
  const legacyAcp = Boolean(current && !isAcp && current.name.trim() === 'Devin ACP'
    && !current.baseUrl.trim() && !current.apiKey.trim());
  const builtIn = current ? isBuiltInProviderDisplay(current) : false;

  function bindProvider(provider: ProviderProfile) {
    onUpdatePersona({
      advanced: {
        providerId: provider.id,
        providerRouteMode: 'fixed',
        modelOverride: provider.agentTransport === 'devin-acp' ? '' : provider.model,
        savedProviderIds: addSavedPersonaApiId(savedIds, provider.id)
      }
    });
    setTestStatus('');
    setModels([]);
    setModelStatus('');
  }

  function selectProvider(value: string) {
    if (value === '__new_api__' || value === '__new_acp__') {
      const isNewAcp = value === '__new_acp__';
      const id = createProvider(isNewAcp ? 'Devin ACP' : '我的 API', { activate: false });
      if (isNewAcp) {
        useRuntimeStore.getState().updateProvider(id, {
          agentTransport: 'devin-acp', model: '', baseUrl: '', apiKey: ''
        });
      }
      const provider = useRuntimeStore.getState().providers.find((item) => item.id === id);
      if (provider) bindProvider(provider);
      return;
    }
    const provider = providers.find((item) => item.id === value);
    if (provider) bindProvider(provider);
  }

  function patchProvider(patch: Partial<ProviderProfile>) {
    if (!current || builtIn) return;
    // The named API is edited in place; never silently duplicate a connection.
    onUpdateProvider(current.id, patch);
    setTestStatus('');
  }

  async function loadAcpModels() {
    if (loadingModels) return;
    setLoadingModels(true);
    setModelStatus('正在读取 Devin 模型列表…');
    try {
      const response = await fetch('/devin-acp/models', { cache: 'no-store' });
      const data = await response.json() as {
        models?: Array<{ id?: string; label?: string }>;
        available?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'HTTP ' + response.status);
      const options = (data.models || []).filter((model): model is { id: string; label: string } =>
        typeof model.id === 'string' && typeof model.label === 'string');
      setModels(options);
      setModelStatus(options.length
        ? `从 Devin ACP 读取到 ${options.length} 个模型`
        : '当前 Devin 代理没有提供模型列表，仍可使用默认模型聊天');
    } catch (error) {
      setModels([]);
      setModelStatus(error instanceof Error ? error.message : '无法拉取 ACP 模型列表');
    } finally {
      setLoadingModels(false);
    }
  }

  async function testConnection() {
    const personaForTest = activePersona;
    if (!current || testing || !personaForTest) return;
    setTesting(true);
    setTestStatus('正在检测…');
    try {
      if (current.agentTransport === 'devin-acp') {
        const result = await fetch('/devin-acp/health', { cache: 'no-store' });
        if (!result.ok) {
          const payload = await result.json().catch(() => null) as { error?: string } | null;
          const hint = result.status === 503
            ? '4173 本地 ACP 代理配置错误'
            : result.status === 502
              ? 'Devin ACP 桥接进程不可达'
              : result.status === 401 ? 'ACP 桥接密钥不一致' : 'ACP 连接失败';
          throw new Error(hint + '（HTTP ' + result.status + '）'
            + (payload?.error ? '：' + payload.error : ''));
        }
        const body = await result.json() as { running?: boolean; sessionReady?: boolean };
        setTestStatus(body.running
          ? (body.sessionReady ? '桥接在线，会话已建立' : '桥接在线，首次聊天时将建立会话')
          : 'Devin ACP 代理未运行');
      } else {
        const result = await testApiConnection({
          api: {
            ...current,
            model: personaForTest.advanced.modelOverride?.trim() || current.model
          },
          advanced: personaForTest.advanced
        });
        setTestStatus(result.ok ? (result.message || '连接成功') : result.error);
      }
    } catch (error) {
      setTestStatus(error instanceof Error ? error.message : '连接失败');
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="conflux-role-connection" aria-label="角色 API 设置">
      <div className="ps-field">
        <label className="ps-field-label" htmlFor={fieldId}>使用的 API</label>
        <select className="ps-input" id={fieldId} value={current?.id ?? ''}
          onChange={(event) => selectProvider(event.target.value)}>
          <option value="" disabled>{missing ? '原 API 已不存在' : '选择已有 API'}</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>{provider.name}</option>
          ))}
          <option value="__new_api__">＋ 新建 API</option>
          <option value="__new_acp__">＋ 新建 Devin ACP</option>
        </select>
      </div>

      {missing ? <p className="ps-footnote" role="status">原绑定已失效，请选择其他 API；旧配置未被删除。</p> : null}
      {!providerId && activePersona.advanced.providerRouteMode === 'inherit'
        ? <p className="ps-footnote">原角色连接保持不变；选定 API 后将固定使用它。</p> : null}

      {current && legacyAcp ? (
        <button type="button" className="btn-secondary compact"
          onClick={() => patchProvider({ agentTransport: 'devin-acp' })}>
          将此旧连接识别为 Devin ACP
        </button>
      ) : null}
      {current && isAcp ? (
        <>
          <p className="ps-footnote">本机 Devin ACP 无需手填 Token。模型由代理提供，未选择时使用代理默认模型。</p>
          <div className="ps-field">
            <label className="ps-field-label" htmlFor={fieldId + '-acp-model'}>模型</label>
            <select id={fieldId + '-acp-model'} className="ps-input"
              value={activePersona.advanced.modelOverride?.trim() || ''}
              onChange={(event) => {
                onUpdatePersona({ advanced: { modelOverride: event.target.value } });
                setTestStatus('');
              }}>
              <option value="">使用 Devin 默认模型</option>
              {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
              {activePersona.advanced.modelOverride?.trim()
                && !models.some((model) => model.id === activePersona.advanced.modelOverride?.trim())
                ? <option value={activePersona.advanced.modelOverride.trim()}>
                    {activePersona.advanced.modelOverride.trim()}（上次选择）
                  </option> : null}
            </select>
          </div>
          <button type="button" className="btn-secondary compact"
            disabled={loadingModels} onClick={() => void loadAcpModels()}>
            {loadingModels ? '拉取中…' : '拉取模型列表'}
          </button>
          {modelStatus ? <p role="status" className="ps-footnote">{modelStatus}</p> : null}
        </>
      ) : current && !builtIn && !legacyAcp ? (
        <>
          <div className="settings-form conflux-role-credentials">
            <ApiProviderConnectionFields api={current} onSetApiConfig={patchProvider} />
          </div>
          <PersonaModelSettings key={activePersona.id + ':' + current.id}
            persona={activePersona} settings />
          <p className="ps-footnote">修改此 API 将同步到所有使用它的角色；角色的模型选择独立保存。</p>
        </>
      ) : current && builtIn ? (
        <p className="ps-footnote">当前使用内置连接，无需填写 API 地址或密钥。</p>
      ) : null}

      {current && !legacyAcp ? (
        <div className="conflux-role-test">
          <button type="button" className="btn-secondary compact"
            disabled={testing} onClick={() => void testConnection()}>
            {testing ? '检测中…' : isAcp ? '检查桥接状态' : '测试连接'}
          </button>
          {testStatus ? <p className="ps-footnote" role="status" aria-live="polite">{testStatus}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
