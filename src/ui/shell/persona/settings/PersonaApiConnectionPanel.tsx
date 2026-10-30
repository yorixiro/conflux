import { useId } from 'react';
import { addSavedPersonaApiId, listSavedPersonaApiIds } from '../../../../engines/personaApiConnections';
import type { ProviderProfile } from '../../../../types/domain';
import { PersonaModelSettings } from '../../PersonaModelSettings';
import type { PersonaTabProps } from '../personaUiShared';

type Props = Pick<PersonaTabProps, 'activePersona' | 'providers' | 'onUpdatePersona'> & {
  onOpenProviderSettings?: () => void;
};

/**
 * Only the role-to-API binding lives here. Credentials and endpoint editing use
 * the existing API manager, so there is a single source of truth for the form.
 */
export function PersonaApiConnectionPanel({
  activePersona, providers = [], onUpdatePersona, onOpenProviderSettings
}: Props) {
  const fieldId = useId();

  if (!activePersona) return <p className="ps-footnote">请先选择一个 AI 角色。</p>;

  const activeId = activePersona.advanced.providerId?.trim() || '';
  const current = providers.find((provider) => provider.id === activeId) ?? null;
  const missing = Boolean(activeId && !current);
  const isAcp = current?.agentTransport === 'devin-acp';
  const savedIds = listSavedPersonaApiIds(activePersona.advanced);

  function selectProvider(id: string) {
    const provider = providers.find((item) => item.id === id);
    if (!provider) return;
    onUpdatePersona({
      advanced: {
        providerId: provider.id,
        providerRouteMode: 'fixed',
        modelOverride: provider.agentTransport === 'devin-acp' ? '' : provider.model,
        savedProviderIds: addSavedPersonaApiId(savedIds, provider.id)
      }
    });
  }

  return (
    <section className="conflux-role-connection" aria-label="角色 API 设置">
      <div className="ps-field">
        <label className="ps-field-label" htmlFor={fieldId}>使用的 API</label>
        <select className="ps-input" id={fieldId}
          value={current?.id ?? ''}
          onChange={(event) => selectProvider(event.target.value)}>
          <option value="" disabled>
            {missing ? '原 API 已不存在，请重新选择' : '选择已有 API'}
          </option>
          {providers.map((provider: ProviderProfile) => (
            <option key={provider.id} value={provider.id}>{provider.name}</option>
          ))}
        </select>
      </div>

      {!activeId && activePersona.advanced.providerRouteMode === 'inherit' ? (
        <p className="ps-footnote">旧角色连接仍保持原样；选择一个 API 后将固定使用它。</p>
      ) : null}
      {missing ? <p className="ps-footnote">原绑定不会被自动替换。</p> : null}

      {current && !isAcp ? (
        <PersonaModelSettings key={activePersona.id + ':' + current.id}
          persona={activePersona} settings />
      ) : null}
      {isAcp ? (
        <p className="ps-footnote" role="status">
          Devin ACP 通过本地桥接发送聊天消息，无需 API Key 或模型 ID。桥接必须先在线。
        </p>
      ) : null}

      {onOpenProviderSettings ? (
        <button type="button" className="btn-secondary compact"
          onClick={onOpenProviderSettings}>
          管理 API（地址、密钥与模型）
        </button>
      ) : (
        <p className="ps-footnote">请从应用的 API 设置中创建或编辑连接。</p>
      )}
    </section>
  );
}
