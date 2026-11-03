import { useEffect, useState } from 'react';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import { useProviderModelDiscovery } from './useProviderModelDiscovery';
import { ApiProviderConnectionSection } from './ApiProviderConnectionSection';
import { isLegacyDevinAcpProvider } from './apiProviderDisplay';
import {
  ApiProviderCapabilitiesSection,
  ApiProviderImageUnderstandingSection,
  ApiProviderModelSection
} from './ApiProviderConfigEditableSections';
import {
  ApiProviderConfigFormProps,
  resolveApiProviderFormViewModel,
  shouldOpenAdvancedSettings
} from './ApiProviderConfigShared';
import {
  ApiProviderDiagnosticsSection,
  ApiProviderSummarySection
} from './ApiProviderConfigStatusSections';

export function ApiProviderConfigForm({
  api,
  providers,
  modelPickerOpen,
  apiTesting,
  apiTestResult,
  onSetApiConfig,
  onToggleModelPicker,
  onRunApiTest
}: ApiProviderConfigFormProps) {
  const publicTrialProvider = resolveProviderCapability(api).route.isBuiltInTrial;
  const builtInProvider = publicTrialProvider;
  const {
    matchedPreset
  } = resolveApiProviderFormViewModel(api);
  const [selectedPresetId, setSelectedPresetId] = useState(matchedPreset?.id ?? '');
  const [advancedOpen, setAdvancedOpen] = useState(() => shouldOpenAdvancedSettings(api, matchedPreset?.id));
  const modelDiscovery = useProviderModelDiscovery(api);
  const presetModels = publicTrialProvider ? [] : (matchedPreset?.models ?? []);
  const legacyAcp = isLegacyDevinAcpProvider(api);

  useEffect(() => {
    setSelectedPresetId(matchedPreset?.id ?? '');
    setAdvancedOpen(shouldOpenAdvancedSettings(api, matchedPreset?.id));
  }, [api.id]);

  useEffect(() => {
    if (!selectedPresetId) return;
    const nextPresetId = matchedPreset?.id ?? '';
    if (nextPresetId !== selectedPresetId) {
      setSelectedPresetId(nextPresetId);
    }
  }, [matchedPreset?.id, selectedPresetId]);

  useEffect(() => {
    if (shouldOpenAdvancedSettings(api, matchedPreset?.id)) {
      setAdvancedOpen(true);
    }
  }, [api.path, api.protocol, matchedPreset?.id]);

  async function handleDiscoverModels() {
    const succeeded = await modelDiscovery.refresh();
    if (succeeded && !modelPickerOpen) onToggleModelPicker();
  }

  function handleModelPickerAction() {
    if (modelPickerOpen) {
      onToggleModelPicker();
      return;
    }
    if (
      modelDiscovery.models.length > 0
      || (
        presetModels.length > 0
        && (!api.baseUrl.trim() || !api.apiKey.trim() || modelDiscovery.status === 'error')
      )
    ) {
      onToggleModelPicker();
      return;
    }
    void handleDiscoverModels();
  }

  // Keep existing ACP records intact until the owner explicitly converts one.
  if (api.agentTransport === 'devin-acp' || legacyAcp) {
    return (
      <div className="api-provider-console">
        <section className="api-provider-section api-provider-section-config">
          <div className="api-provider-section-head"><h3>Devin ACP</h3></div>
          <button type="button" className="btn-secondary"
            onClick={() => onSetApiConfig({
              agentTransport: undefined,
              name: '自建中转',
              protocol: 'openai-completions',
              path: '/chat/completions',
              baseUrl: '',
              apiKey: '',
              model: ''
            })}>
            改为普通 API 连接
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="api-provider-console">
      {!builtInProvider ? (
        <ApiProviderConnectionSection
          api={api}
          selectedPresetId={selectedPresetId}
          advancedOpen={advancedOpen}
          onSetSelectedPresetId={setSelectedPresetId}
          onSetAdvancedOpen={setAdvancedOpen}
          onSetApiConfig={onSetApiConfig}
        />
      ) : null}

      <ApiProviderModelSection
        api={api}
        modelPickerOpen={modelPickerOpen}
        presetModels={presetModels}
        discoveredModels={modelDiscovery.models}
        modelDiscoveryStatus={modelDiscovery.status}
        modelDiscoveryError={modelDiscovery.error}
        onSetApiConfig={onSetApiConfig}
        onOpenModelPicker={handleModelPickerAction}
        onRefreshModels={() => void handleDiscoverModels()}
      />

      <details className="api-provider-more-settings">
        <summary>{t('apiProvider.setup.more')}</summary>
        <ApiProviderSummarySection
          apiTesting={apiTesting}
          apiTestResult={apiTestResult}
          onRunApiTest={onRunApiTest}
        />
        {!builtInProvider ? (
          <>
            <ApiProviderCapabilitiesSection api={api} onSetApiConfig={onSetApiConfig} />
            <ApiProviderImageUnderstandingSection api={api} providers={providers} onSetApiConfig={onSetApiConfig} />
          </>
        ) : null}
        <ApiProviderDiagnosticsSection />
      </details>
    </div>
  );
}
