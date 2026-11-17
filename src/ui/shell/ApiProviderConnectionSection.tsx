import { useEffect, useId, useRef, useState } from 'react';
import {
  buildProviderPresetPatch,
  PROVIDER_PRESETS
} from '../../config/catalog/providerCatalog';
import {
  getDefaultProviderPath,
} from '../../engines/providerProtocol';
import { getLocalizedProviderProtocolLabel } from '../../i18n/providerLabels';
import { useI18n } from '../../i18n/useI18n';
import type { ProviderProfile } from '../../types/domain';
import { HelpHint } from '../HelpHint';

type ApiProviderConnectionSectionProps = {
  api: ProviderProfile;
  matchedPresetName: string;
  selectedPresetId: string;
  advancedOpen: boolean;
  interfacePath: string;
  onSetSelectedPresetId: (presetId: string) => void;
  onSetAdvancedOpen: (next: boolean | ((previous: boolean) => boolean)) => void;
  onSetApiConfig: (patch: Partial<ProviderProfile>) => void;
};

export function ApiProviderConnectionSection({
  api,
  matchedPresetName,
  selectedPresetId,
  advancedOpen,
  interfacePath,
  onSetSelectedPresetId,
  onSetAdvancedOpen,
  onSetApiConfig
}: ApiProviderConnectionSectionProps) {
  const { t } = useI18n();
  const fieldId = useId();
  const acp = api.agentTransport === 'devin-acp';
  const healthRequest = useRef<AbortController | null>(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');

  async function checkConnection() {
    healthRequest.current?.abort();
    const controller = new AbortController();
    healthRequest.current = controller;
    setChecking(true);
    setStatus('正在连接本机 Devin…');
    try {
      const response = await fetch('/devin-acp/health', { cache: 'no-store', signal: controller.signal });
      const data = await response.json() as { running?: boolean; error?: string };
      if (!response.ok) throw new Error(data?.error || 'HTTP ' + response.status);
      if (!controller.signal.aborted) {
        setStatus(data?.running === true ? 'Devin 桥接在线' : 'Devin 未运行，请检查本机代理');
      }
    } catch {
      if (!controller.signal.aborted) setStatus('无法连接 Devin，请检查本机代理后重试');
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }

  useEffect(() => {
    if (acp) void checkConnection();
    return () => { healthRequest.current?.abort(); };
  }, [api.id, acp]);

  return (
    <section className="api-provider-section api-provider-section-config">
      <div className="api-provider-section-head">
        <h3>{t('apiProvider.connection.title')}</h3>
      </div>
      <div className="settings-form">
        {!acp ? <>
          <label htmlFor={`${fieldId}-template`}>{t('apiProvider.connection.templateLabel')}</label>
          <select
            id={`${fieldId}-template`}
            value={selectedPresetId}
            onChange={(event) => {
              const nextPresetId = event.target.value;
              onSetSelectedPresetId(nextPresetId);
              if (!nextPresetId) return;
              const patch = buildProviderPresetPatch(nextPresetId);
              if (!patch) return;
              onSetApiConfig(patch);
            }}
          >
            <option value="">{t('apiProvider.connection.manualOption')}</option>
            {PROVIDER_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </> : null}

        <label htmlFor={`${fieldId}-name`}>{t('apiProvider.connection.nameLabel')}</label>
        <input
          id={`${fieldId}-name`}
          value={api.name}
          onChange={(event) => onSetApiConfig({ name: event.target.value })}
          placeholder={t('apiProvider.connection.namePlaceholder')}
          autoComplete="off"
        />
        {!acp ? <>
          <label className="api-provider-field-label" htmlFor={`${fieldId}-base-url`}>
            <span>API Base URL</span>
            <HelpHint
              className="help-hint--below"
              label="API Base URL"
              text={t('apiProvider.connection.baseHelp')}
            />
          </label>
          <input
            id={`${fieldId}-base-url`}
            value={api.baseUrl}
            onChange={(event) => onSetApiConfig({ baseUrl: event.target.value })}
            placeholder="https://api.openai.com/v1"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
          <label className="api-provider-field-label" htmlFor={`${fieldId}-key`}>
            <span>API Key</span>
            <HelpHint
              className="help-hint--below"
              label="API Key"
              text={t('apiProvider.connection.keyHelp')}
            />
          </label>
          <input
            id={`${fieldId}-key`}
            className="api-provider-masked-input"
            value={api.apiKey}
            onChange={(event) => onSetApiConfig({ apiKey: event.target.value })}
            placeholder="sk-..."
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
        </> : (
          <>
            <p className="api-provider-inline-note">使用本机代理连接，无需填写 API 地址或密钥。</p>
            <div className="provider-inline-actions">
              <p role="status" aria-live="polite">{status}</p>
              <button className="btn-secondary compact" type="button"
                onClick={() => void checkConnection()} disabled={checking}>
                {checking ? '连接中…' : '重试连接'}
              </button>
            </div>
          </>
        )}
      </div>
      {!acp ? <>
        <div className="provider-health-note api-provider-connection-note">
          <strong>{matchedPresetName || t('apiProvider.connection.defaultPathNote')}</strong>
          <span>{getLocalizedProviderProtocolLabel(api.protocol, t)} · {interfacePath}</span>
        </div>
        <button
          type="button"
          className="btn-secondary compact api-provider-advanced-toggle"
          onClick={() => onSetAdvancedOpen((previous) => !previous)}
        >
          {advancedOpen ? t('apiProvider.connection.collapseAdvanced') : t('apiProvider.connection.expandAdvanced')}
        </button>
        {advancedOpen ? (
          <div className="settings-form api-provider-advanced-panel">
            <label>{t('apiProvider.connection.protocolLabel')}</label>
            <select
              value={api.protocol}
              onChange={(event) => {
                const protocol = event.target.value as ProviderProfile['protocol'];
                onSetApiConfig({
                  protocol,
                  path: getDefaultProviderPath(protocol)
                });
              }}
            >
              <option value="openai-completions">{getLocalizedProviderProtocolLabel('openai-completions', t)}</option>
              <option value="anthropic-messages">{getLocalizedProviderProtocolLabel('anthropic-messages', t)}</option>
              <option value="openai-responses">{getLocalizedProviderProtocolLabel('openai-responses', t)}</option>
              <option value="gemini-generate-content">{getLocalizedProviderProtocolLabel('gemini-generate-content', t)}</option>
            </select>
            <label>API Path</label>
            <input
              value={api.path}
              onChange={(event) => onSetApiConfig({ path: event.target.value })}
              placeholder="/chat/completions"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        ) : null}
      </> : null}
    </section>
  );
}
