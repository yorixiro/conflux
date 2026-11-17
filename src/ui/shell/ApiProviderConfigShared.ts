import { findProviderPreset } from '../../config/catalog/providerCatalog';
import { getDefaultProviderPath } from '../../engines/providerProtocol';
import { canDiscoverProviderModels, type ProviderModelOption } from '../../engines/providerModelDiscovery';
import type { ProviderProfile } from '../../types/domain';
import { isBuiltInProviderDisplay } from './apiProviderDisplay';

export type ApiTestResult = null | { ok: boolean; message: string };

export type ApiProviderConfigFormProps = {
  api: ProviderProfile;
  providers: ProviderProfile[];
  modelPickerOpen: boolean;
  apiTesting: boolean;
  apiTestResult: ApiTestResult;
  onSetApiConfig: (patch: Partial<ProviderProfile>) => void;
  onToggleModelPicker: () => void;
  onRunApiTest: () => Promise<void>;
};

export type ApiProviderModelPickerState = {
  builtIn: boolean;
  acp: boolean;
  models: ProviderModelOption[];
  liveModelCount: number;
  loading: boolean;
  canRefresh: boolean;
  action: 'disabled' | 'discover' | 'toggle';
};

export function resolveApiProviderModelPickerState({
  api, open, presetModels, discoveredModels, status
}: {
  api: ProviderProfile;
  open: boolean;
  presetModels: string[];
  discoveredModels: ProviderModelOption[];
  status: 'idle' | 'loading' | 'success' | 'error';
}): ApiProviderModelPickerState {
  const builtIn = isBuiltInProviderDisplay(api);
  const acp = api.agentTransport === 'devin-acp';
  const loading = status === 'loading';
  const canRefresh = !builtIn && !loading && canDiscoverProviderModels(api);
  const models = discoveredModels.length ? discoveredModels : presetModels.map((id) => ({ id }));
  const hasChoices = acp || models.length > 0;
  const shouldDiscover = !acp && canRefresh && !discoveredModels.length
    && (!presetModels.length || status !== 'error');
  const action = builtIn || (!open && !hasChoices && !canRefresh)
    ? 'disabled'
    : !open && shouldDiscover ? 'discover' : 'toggle';
  return { builtIn, acp, models, liveModelCount: discoveredModels.length, loading, canRefresh, action };
}

export function shouldOpenAdvancedSettings(api: ProviderProfile, matchedPresetId?: string) {
  if (api.path.trim() !== getDefaultProviderPath(api.protocol)) return true;
  if (!matchedPresetId && api.protocol !== 'openai-completions') return true;
  return false;
}

export function resolveApiProviderFormViewModel(api: ProviderProfile) {
  const matchedPreset = findProviderPreset(api.baseUrl, api.path);

  return {
    matchedPreset,
    interfacePath: api.path || getDefaultProviderPath(api.protocol)
  };
}
