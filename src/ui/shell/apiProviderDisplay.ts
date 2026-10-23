import { POLARIS_PUBLIC_PROVIDER_MODEL } from '../../engines/freeProvider';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import type { ProviderProfile } from '../../types/domain';

export const POLARIS_BUILT_IN_MODEL_LABEL = 'Polaris 内置线路';

export function isBuiltInProviderDisplay(provider: ProviderProfile) {
  return resolveProviderCapability(provider).route.isBuiltInTrial;
}

export function getProviderModelDisplayLabel(
  provider: ProviderProfile,
  fallback = '还没填模型',
  builtInLabel = POLARIS_BUILT_IN_MODEL_LABEL
) {
  return isBuiltInProviderDisplay(provider)
    ? builtInLabel
    : (provider.model || fallback);
}

export function getProviderModelBindingValue(provider: ProviderProfile) {
  return isBuiltInProviderDisplay(provider)
    ? POLARIS_PUBLIC_PROVIDER_MODEL
    : provider.model;
}

export function getProviderMissingFields(provider: ProviderProfile) {
  if (isBuiltInProviderDisplay(provider)) return [];
  return (['baseUrl', 'apiKey', 'model'] as const).filter(field => !provider[field].trim());
}
