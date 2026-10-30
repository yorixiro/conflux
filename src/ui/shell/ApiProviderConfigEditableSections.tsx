import type { ImageUnderstandingSettings, ProviderProfile } from '../../types/domain';
import { canDiscoverProviderModels, type ProviderModelOption } from '../../engines/providerModelDiscovery';
import { useI18n } from '../../i18n/useI18n';
import { getProviderModelDisplayLabel, isBuiltInProviderDisplay } from './apiProviderDisplay';

type ApiProviderModelSectionProps = {
  api: ProviderProfile;
  modelPickerOpen: boolean;
  presetModels: string[];
  discoveredModels: ProviderModelOption[];
  modelDiscoveryStatus: 'idle' | 'loading' | 'success' | 'error';
  modelDiscoveryError: string | null;
  onSetApiConfig: (patch: Partial<ProviderProfile>) => void;
  onOpenModelPicker: () => void;
  onRefreshModels: () => void;
};

export function ApiProviderModelSection({
  api,
  modelPickerOpen,
  presetModels,
  discoveredModels,
  modelDiscoveryStatus,
  modelDiscoveryError,
  onSetApiConfig,
  onOpenModelPicker,
  onRefreshModels
}: ApiProviderModelSectionProps) {
  const { t } = useI18n();
  const builtInProvider = isBuiltInProviderDisplay(api);
  const modelValue = builtInProvider
    ? getProviderModelDisplayLabel(api, t('apiProvider.model.emptyFallback'), t('apiProvider.model.builtInPlaceholder'))
    : api.model;
  const discoveredModelIds = discoveredModels.map((model) => model.id);
  const displayedModels = discoveredModelIds.length > 0 ? discoveredModelIds : presetModels;
  const canPickModels = displayedModels.length > 0;
  const canDiscoverModels = !builtInProvider && canDiscoverProviderModels(api);
  const discoveryLoading = modelDiscoveryStatus === 'loading';
  const modelPickerActionDisabled = builtInProvider || discoveryLoading || (!canPickModels && !canDiscoverModels);
  const shouldPullBeforeOpen = canDiscoverModels && discoveredModelIds.length === 0 && modelDiscoveryStatus !== 'error';
  const modelPickerActionLabel = discoveryLoading
    ? t('apiProvider.model.loadingList')
    : modelPickerOpen
      ? t('apiProvider.model.collapseList')
      : shouldPullBeforeOpen
        ? t('apiProvider.model.fetchList')
        : t('apiProvider.model.expandList');

  return (
    <section className="api-provider-section api-provider-section-config">
      <div className="api-provider-section-head">
        <h3>{t('apiProvider.model.title')}</h3>
      </div>
      <div className="settings-form">
        <div className="provider-model-row">
          <input
            value={modelValue}
            onChange={(event) => onSetApiConfig({ model: event.target.value })}
            placeholder={builtInProvider ? t('apiProvider.model.builtInPlaceholder') : 'gpt-5.2'}
            aria-label={t('apiProvider.model.ariaLabel')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            disabled={builtInProvider}
          />
          <button
            type="button"
            className="provider-model-toggle"
            onClick={onOpenModelPicker}
            aria-label={modelPickerActionLabel}
            title={modelPickerActionLabel}
            disabled={modelPickerActionDisabled}
          >
            {modelPickerOpen ? '▴' : '▾'}
          </button>
        </div>
        {!builtInProvider ? <button
          type="button"
          className="btn-secondary compact"
          onClick={onRefreshModels}
          disabled={!canDiscoverModels || discoveryLoading}
        >{discoveryLoading ? '正在拉取…' : discoveredModels.length ? '刷新模型列表' : '拉取模型列表'}</button> : null}
        {!builtInProvider && modelPickerOpen && canPickModels ? (
          <div className="provider-model-list">
            {displayedModels.map((model) => (
              <button
                key={model}
                type="button"
                className={`provider-model-chip ${api.model === model ? 'active' : ''}`}
                onClick={() => onSetApiConfig({ model })}
              >
                {model}
              </button>
            ))}
          </div>
        ) : null}
        {!builtInProvider && discoveryLoading ? (
          <p className="api-provider-inline-note">{t('apiProvider.model.fetchingNote')}</p>
        ) : null}
        {!builtInProvider && modelDiscoveryStatus === 'success' && discoveredModels.length > 0 ? (
          <p className="api-provider-inline-note">{t('apiProvider.model.fetchedNote', { count: discoveredModels.length })}</p>
        ) : null}
        {!builtInProvider && modelDiscoveryStatus === 'error' && modelDiscoveryError ? (
          <p className="api-provider-inline-note">{modelDiscoveryError}</p>
        ) : null}
      </div>
    </section>
  );
}

type ApiProviderCapabilitiesSectionProps = {
  api: ProviderProfile;
  onSetApiConfig: (patch: Partial<ProviderProfile>) => void;
};

const DEFAULT_PROVIDER_IMAGE_UNDERSTANDING: ImageUnderstandingSettings = {
  enabled: false
};

export function ApiProviderCapabilitiesSection({
  api,
  onSetApiConfig
}: ApiProviderCapabilitiesSectionProps) {
  const { t } = useI18n();
  return (
    <section className="api-provider-section api-provider-section-secondary">
      <div className="api-provider-section-head">
        <span className="api-provider-section-kicker">{t('apiProvider.capabilities.kicker')}</span>
        <h3>{t('apiProvider.capabilities.title')}</h3>
      </div>
      <div className="capability-group">
        <label className="memory-toggle">
          <div className="memory-toggle-copy">
            <strong>{t('apiProvider.capabilities.imagesTitle')}</strong>
            <span>{t('apiProvider.capabilities.imagesDetail')}</span>
          </div>
          <input
            type="checkbox"
            checked={api.capabilities.images}
            onChange={(event) => onSetApiConfig({ capabilities: { ...api.capabilities, images: event.target.checked } })}
          />
        </label>
        <label className="memory-toggle">
          <div className="memory-toggle-copy">
            <strong>{t('apiProvider.capabilities.streamingTitle')}</strong>
            <span>{t('apiProvider.capabilities.streamingDetail')}</span>
          </div>
          <input
            type="checkbox"
            checked={api.capabilities.streaming}
            onChange={(event) => onSetApiConfig({ capabilities: { ...api.capabilities, streaming: event.target.checked } })}
          />
        </label>
        <label className="memory-toggle">
          <div className="memory-toggle-copy">
            <strong>{t('apiProvider.capabilities.thinkingTitle')}</strong>
            <span>{t('apiProvider.capabilities.thinkingDetail')}</span>
          </div>
          <input
            type="checkbox"
            checked={api.capabilities.thinking}
            onChange={(event) => onSetApiConfig({ capabilities: { ...api.capabilities, thinking: event.target.checked } })}
          />
        </label>
      </div>
    </section>
  );
}

type ApiProviderImageUnderstandingSectionProps = {
  api: ProviderProfile;
  providers: ProviderProfile[];
  onSetApiConfig: (patch: Partial<ProviderProfile>) => void;
  requireExplicitProvider?: boolean;
};

export function ApiProviderImageUnderstandingSection({
  api,
  providers,
  onSetApiConfig,
  requireExplicitProvider = false
}: ApiProviderImageUnderstandingSectionProps) {
  const { t } = useI18n();
  const imageUnderstanding = api.imageUnderstanding ?? DEFAULT_PROVIDER_IMAGE_UNDERSTANDING;
  const stateLabel = imageUnderstanding.enabled ? t('settings.enabled') : t('settings.disabled');
  const patchImageUnderstanding = (patch: Partial<ImageUnderstandingSettings>) => {
    onSetApiConfig({
      imageUnderstanding: {
        ...imageUnderstanding,
        ...patch
      }
    });
  };

  return (
    <section className="api-provider-section api-provider-section-secondary">
      <div className="api-provider-section-head">
        <span className="api-provider-section-kicker">{t('apiProvider.imageUnderstanding.kicker')}</span>
        <h3>{t('apiProvider.imageUnderstanding.title')}</h3>
        <p>{t('apiProvider.imageUnderstanding.detail')}</p>
      </div>
      <div className="memory-toggle-grid">
        <div className="memory-toggle memory-toggle--switch toolbox-toggle-row" data-checked={imageUnderstanding.enabled ? 'true' : 'false'}>
          <div className="toolbox-toggle-row-head">
            <div className="memory-toggle-copy toolbox-toggle-copy">
              <strong>{t('apiProvider.imageUnderstanding.toggleTitle')}</strong>
              <span>{t('apiProvider.imageUnderstanding.toggleDetail')}</span>
            </div>
            <button
              type="button"
              className={`ps-toggle-sw memory-toggle-switch ${imageUnderstanding.enabled ? 'ps-toggle-sw--on' : ''}`}
              aria-pressed={imageUnderstanding.enabled}
              aria-label={`${t('apiProvider.imageUnderstanding.toggleTitle')} ${stateLabel}`}
              onClick={() => patchImageUnderstanding({ enabled: !imageUnderstanding.enabled })}
            >
              <span className="ps-toggle-knob" />
            </button>
          </div>

          {imageUnderstanding.enabled ? (
            <div className="toolbox-inline-config">
              <div className="settings-form">
                {requireExplicitProvider ? (
                  <p className="api-provider-inline-note">发送图片时，先由选定的看图 API 理解图片，再把描述交给 Fable。普通聊天不需要任何额外确认。</p>
                ) : null}
                <label>{t('apiProvider.imageUnderstanding.providerLabel')}</label>
                <select
                  value={imageUnderstanding.providerId ?? ''}
                  onChange={(event) => patchImageUnderstanding({ providerId: event.target.value || undefined })}
                >
                  <option value="">{requireExplicitProvider
                    ? '请选择支持图片输入的 API'
                    : t('apiProvider.imageUnderstanding.currentProvider')}</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} · {provider.model}
                    </option>
                  ))}
                </select>

                <label>{t('apiProvider.imageUnderstanding.modelLabel')}</label>
                <input
                  value={imageUnderstanding.modelOverride ?? ''}
                  onChange={(event) => patchImageUnderstanding({ modelOverride: event.target.value })}
                  placeholder={t('apiProvider.imageUnderstanding.modelPlaceholder')}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
