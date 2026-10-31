import { POLARIS_PUBLIC_PROVIDER_MODEL } from '../../engines/freeProvider';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import type { ProviderProfile } from '../../types/domain';

/** A legacy, credential-less Devin profile is an ACP connection pending explicit activation. */
export function isLegacyDevinAcpProvider(provider: ProviderProfile) {
  return provider.agentTransport !== 'devin-acp'
    && provider.name.trim() === 'Devin ACP'
    && !provider.baseUrl.trim()
    && !provider.apiKey.trim();
}

export const POLARIS_BUILT_IN_MODEL_LABEL = 'Polaris 内置线路';

export function isBuiltInProviderDisplay(provider: ProviderProfile) {
  return resolveProviderCapability(provider).route.isBuiltInTrial;
}

export function getProviderModelDisplayLabel(
  provider: ProviderProfile,
  fallback = '还没填模型',
  builtInLabel = POLARIS_BUILT_IN_MODEL_LABEL
) {
  if (provider.agentTransport === 'devin-acp') return '模型由代理管理';
  return isBuiltInProviderDisplay(provider)
    ? builtInLabel
    : (provider.model || fallback);
}

export function getProviderModelBindingValue(provider: ProviderProfile) {
  if (provider.agentTransport === 'devin-acp') return '';
  return isBuiltInProviderDisplay(provider)
    ? POLARIS_PUBLIC_PROVIDER_MODEL
    : provider.model;
}

export function getProviderMissingFields(provider: ProviderProfile) {
  if (provider.agentTransport === 'devin-acp' || isBuiltInProviderDisplay(provider)) return [];
  return (['baseUrl', 'apiKey', 'model'] as const).filter(field => !provider[field].trim());
}
