import { useEffect, useId, useState, type ReactNode } from 'react';
import { resolvePersonaProviderBinding } from '../../../../engines/personaProviderBinding';
import { useRuntimeStore } from '../../../../stores/runtimeStore';
import { ApiProviderConnectionSection } from '../../ApiProviderConnectionSection';
import { ApiProviderCapabilitiesSection, ApiProviderImageUnderstandingSection } from '../../ApiProviderConfigEditableSections';
import { resolveApiProviderFormViewModel, shouldOpenAdvancedSettings } from '../../ApiProviderConfigShared';
import {
  getProviderModelBindingValue,
  getProviderModelDisplayLabel,
  isBuiltInProviderDisplay
} from '../../apiProviderDisplay';
import type { I18nKey } from '../../../../i18n/messages';
import { useI18n } from '../../../../i18n/useI18n';
import type { McpServerConfig, ProviderProfile } from '../../../../types/domain';
import { Icon, type IconName } from '../../../Icon';
import { type PersonaTabProps } from '../personaUiShared';
import { CustomRequestSettingsTab } from './CustomRequestSettingsTab';
import { EngineSettingsTab } from './EngineSettingsTab';
import { PersonaMcpSettingsPage } from './PersonaMcpSettingsPage';

type RequestSettingsTabProps = PersonaTabProps & {
  onOpenProviderSettings?: () => void;
  onUpdateProvider: (providerId: string, patch: Partial<ProviderProfile>) => void;
  mcpServers: McpServerConfig[];
  mcpToolTimeoutSeconds: number;
  onCreateMcpServer: (seed?: Partial<McpServerConfig>) => string;
  onUpdateMcpServer: (serverId: string, patch: Partial<McpServerConfig>) => void;
};

type RequestSettingsPage = 'route' | 'engine' | 'custom' | 'mcp';

const REQUEST_PAGE_META: Array<{
  id: RequestSettingsPage;
  labelKey: I18nKey;
  icon: IconName;
}> = [
  { id: 'route', labelKey: 'request.settings.providerSection', icon: 'providerRoute' },
  { id: 'engine', labelKey: 'request.settings.engineSection', icon: 'orbit' },
  { id: 'custom', labelKey: 'request.settings.customSection', icon: 'code' },
  { id: 'mcp', labelKey: 'request.settings.mcpSection', icon: 'mcpServer' }
];

function RoleConnectionFields({ provider, providers, onUpdateProvider }: {
  provider: ProviderProfile;
  providers: ProviderProfile[];
  onUpdateProvider: RequestSettingsTabProps['onUpdateProvider'];
}) {
  const { matchedPreset, interfacePath } = resolveApiProviderFormViewModel(provider);
  const [presetId, setPresetId] = useState(matchedPreset?.id ?? '');
  const [advancedOpen, setAdvancedOpen] = useState(() => shouldOpenAdvancedSettings(provider, matchedPreset?.id));
  useEffect(() => { setPresetId(matchedPreset?.id ?? ''); }, [matchedPreset?.id]);
  const update = (patch: Partial<ProviderProfile>) => onUpdateProvider(provider.id, patch);
  if (isBuiltInProviderDisplay(provider)) return <p className="ps-footnote">内置线路的接口信息由程序管理。选择自定义线路后可以填写地址和密钥。</p>;
  return (
    <div className="conflux-role-connection">
      <p className="ps-footnote">下面修改的是「{provider.name}」这条线路。共用它的其他角色也会使用更新后的接口信息；角色专属模型由上方单独设置。</p>
      <ApiProviderConnectionSection
        api={provider}
        matchedPresetName={matchedPreset?.name ?? ''}
        selectedPresetId={presetId}
        advancedOpen={advancedOpen}
        interfacePath={interfacePath}
        onSetSelectedPresetId={setPresetId}
        onSetAdvancedOpen={setAdvancedOpen}
        onSetApiConfig={update}
      />
      <details className="conflux-role-optional">
        <summary>图片、流式与备用看图能力</summary>
        <ApiProviderCapabilitiesSection api={provider} onSetApiConfig={update} />
        <ApiProviderImageUnderstandingSection api={provider} providers={providers} onSetApiConfig={update} />
      </details>
    </div>
  );
}

function ProviderBindingSettings({
  activePersona,
  providers = [],
  activeProviderId,
  onUpdatePersona,
  onOpenProviderSettings,
  onUpdateProvider
}: RequestSettingsTabProps) {
  const { t } = useI18n();
  const fieldId = useId();
  const fixedProviderId = activePersona?.advanced.providerId?.trim() || '';
  const fixedProvider = providers.find((provider) => provider.id === fixedProviderId) ?? null;
  const routeMode = activePersona?.advanced.providerRouteMode;
  const selectValue = fixedProviderId || (routeMode === 'inherit' ? '' : '__unconfigured__');
  const hasProviderBinding = Boolean(fixedProviderId || activePersona?.advanced.modelOverride.trim() || routeMode === 'inherit');
  const fixedProviderBuiltIn = fixedProvider ? isBuiltInProviderDisplay(fixedProvider) : false;
  const globalProvider = providers.find(provider => provider.id === activeProviderId) ?? providers[0];
  const binding = globalProvider ? resolvePersonaProviderBinding({ globalApi: globalProvider, providers, persona: activePersona }) : null;
  const connectionProvider = binding?.fixedProvider ?? globalProvider;

  const updateProviderBinding = (providerId: string) => {
    if (providerId === '__unconfigured__') {
      onUpdatePersona({ advanced: { providerId: '', providerRouteMode: 'unconfigured', modelOverride: '' } });
      return;
    }
    if (!providerId) {
      onUpdatePersona({ advanced: { providerId: '', providerRouteMode: 'inherit', modelOverride: '' } });
      return;
    }
    const provider = providers.find((entry) => entry.id === providerId);
    if (!provider) return;
    onUpdatePersona({ advanced: { providerId: provider.id, providerRouteMode: 'fixed', modelOverride: getProviderModelBindingValue(provider) } });
  };

  return (
    <>
      {binding?.status === 'unconfigured'
        ? <p className="conflux-role-notice">本角色还没有绑定模型线路，选择线路后才能发送消息。</p>
        : binding?.status === 'missing-provider'
          ? <p className="conflux-role-notice">原绑定的模型线路已不存在。请重新选择，系统不会自动改用其他模型。</p>
          : binding
            ? <p className="conflux-role-notice">本角色实际使用：{binding.api.name} · {getProviderModelDisplayLabel(binding.api)}{!fixedProviderId ? '（跟随全局线路）' : ''}</p>
            : null}
      <div className="ps-field">
        <div className="ps-field-head">
          <label className="ps-field-label" htmlFor={`${fieldId}-provider`}>{t('request.settings.providerLabel')}</label>
          <span className="ps-field-hint">{t('request.settings.providerHint')}</span>
        </div>
        <select
          className="ps-input"
          id={`${fieldId}-provider`}
          value={selectValue}
          onChange={(event) => updateProviderBinding(event.target.value)}
        >
          <option value="__unconfigured__">未配置（暂不能聊天）</option>
          <option value="">{t('request.settings.followGlobalProvider')}</option>
          {fixedProviderId && !fixedProvider ? <option value={fixedProviderId} disabled>已失效的线路 · {fixedProviderId}</option> : null}
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} · {getProviderModelDisplayLabel(provider)}
            </option>
          ))}
        </select>
        <div className="provider-inline-actions">
          <button
            type="button"
            className="btn-secondary compact"
            disabled={!activePersona}
            onClick={() => {
              const nextId = useRuntimeStore.getState().createProvider('AI 专属线路', { activate: false });
              onUpdatePersona({ advanced: { providerId: nextId, providerRouteMode: 'fixed', modelOverride: '' } });
            }}
          >
            为当前 AI 新建空白线路
          </button>
          <button
            type="button"
            className="btn-secondary compact"
            onClick={() => updateProviderBinding('')}
            disabled={!hasProviderBinding}
          >
            {t('request.settings.followGlobal')}
          </button>
          {onOpenProviderSettings ? (
            <button
              type="button"
              className="btn-secondary compact"
              onClick={onOpenProviderSettings}
            >
              {t('request.settings.openProviderSettings')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ps-field">
        <div className="ps-field-head">
          <label className="ps-field-label" htmlFor={`${fieldId}-model`}>{t('request.settings.modelLabel')}</label>
          <span className="ps-field-hint">
            {fixedProviderBuiltIn
              ? t('request.settings.builtInModelHint')
              : fixedProvider
                ? t('request.settings.providerModelHint', { name: fixedProvider.name })
                : t('request.settings.globalModelHint')}
          </span>
        </div>
        <input
          className="ps-input ps-input--mono"
          id={`${fieldId}-model`}
          value={fixedProviderBuiltIn && fixedProvider ? getProviderModelDisplayLabel(fixedProvider) : (activePersona?.advanced.modelOverride || '')}
          onChange={(event) => onUpdatePersona({ advanced: { modelOverride: event.target.value } })}
          placeholder={fixedProviderBuiltIn ? t('request.settings.builtInModelPlaceholder') : t('request.settings.modelPlaceholder')}
          disabled={fixedProviderBuiltIn || (!fixedProvider && binding?.status !== 'ready')}
        />
      </div>
      {(fixedProvider || binding?.status === 'ready') && connectionProvider
        ? <RoleConnectionFields key={connectionProvider.id} provider={connectionProvider} providers={providers} onUpdateProvider={onUpdateProvider} />
        : null}
    </>
  );
}

function RequestSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="request-settings-section">
      <div className="request-settings-section-title">{title}</div>
      {children}
    </div>
  );
}

export function RequestSettingsTab(props: RequestSettingsTabProps) {
  const { t } = useI18n();
  const [activePage, setActivePage] = useState<RequestSettingsPage>('route');

  return (
    <div className="request-settings-flow">
      <div className="room-theme-page-nav request-page-nav" role="tablist" aria-label={t('request.settings.pageNavLabel')}>
        {REQUEST_PAGE_META.map((page) => (
          <button
            key={page.id}
            type="button"
            className={activePage === page.id ? 'active' : ''}
            onClick={() => setActivePage(page.id)}
          >
            <Icon name={page.icon} size={14} />
            <span>{t(page.labelKey)}</span>
          </button>
        ))}
      </div>

      {activePage === 'route' ? (
        <RequestSection title={t('request.settings.providerSection')}>
          <ProviderBindingSettings {...props} />
        </RequestSection>
      ) : null}
      {activePage === 'engine' ? (
        <RequestSection title={t('request.settings.engineSection')}>
          <EngineSettingsTab {...props} />
        </RequestSection>
      ) : null}
      {activePage === 'custom' ? (
        <RequestSection title={t('request.settings.customSection')}>
          <CustomRequestSettingsTab {...props} />
        </RequestSection>
      ) : null}
      {activePage === 'mcp' ? (
        <RequestSection title={t('request.settings.mcpSection')}>
          <PersonaMcpSettingsPage {...props} />
        </RequestSection>
      ) : null}
    </div>
  );
}
