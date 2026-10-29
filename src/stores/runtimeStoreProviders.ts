import { createUid } from '../engines/id';
import { findProviderPreset } from '../config/catalog/providerCatalog';
import {
  isPolarisBuiltInProvider,
  isPolarisPublicProvider,
  normalizePolarisPublicProvider
} from '../engines/freeProvider';
import {
  DEFAULT_PROVIDER_PROTOCOL,
  getDefaultProviderPath,
  inferProviderProtocol
} from '../engines/providerProtocol';
import type { ProviderProfile } from '../types/domain';
import { normalizeImageUnderstandingSettings } from './runtimeStoreImageUnderstanding';

export const DEFAULT_CUSTOM_PROVIDER: Omit<ProviderProfile, 'id'> = {
  name: '新线路',
  protocol: DEFAULT_PROVIDER_PROTOCOL,
  baseUrl: '',
  path: getDefaultProviderPath(DEFAULT_PROVIDER_PROTOCOL),
  apiKey: '',
  model: '',
  capabilities: {
    images: false,
    streaming: true,
    thinking: false
  }
};

export const DEFAULT_PROVIDER: ProviderProfile = {
  id: 'provider-custom-default',
  ...DEFAULT_CUSTOM_PROVIDER,
  capabilities: {
    ...DEFAULT_CUSTOM_PROVIDER.capabilities
  }
};

const visibleProviderCache = new WeakMap<ProviderProfile[], ProviderProfile[]>();

function isPlaceholderCustomProvider(provider: ProviderProfile) {
  return (
    !isPolarisBuiltInProvider(provider) &&
    provider.id === DEFAULT_PROVIDER.id &&
    provider.name === DEFAULT_PROVIDER.name &&
    provider.baseUrl === DEFAULT_PROVIDER.baseUrl &&
    provider.path === DEFAULT_PROVIDER.path &&
    provider.apiKey === DEFAULT_PROVIDER.apiKey &&
    provider.model === DEFAULT_PROVIDER.model
  );
}

function capabilitiesEqual(
  left: ProviderProfile['capabilities'],
  right: ProviderProfile['capabilities']
) {
  return (
    left.images === right.images
    && left.streaming === right.streaming
    && left.thinking === right.thinking
  );
}

function shouldAdoptPresetName(currentName: string, previousPresetName?: string) {
  const normalizedName = currentName.trim();
  return (
    !normalizedName
    || normalizedName === DEFAULT_CUSTOM_PROVIDER.name
    || normalizedName === previousPresetName
  );
}

function shouldAdoptPresetModel(currentModel: string, previousDefaultModel?: string) {
  const normalizedModel = currentModel.trim();
  return !normalizedModel || normalizedModel === previousDefaultModel;
}

function shouldAdoptPresetCapabilities(
  currentCapabilities: ProviderProfile['capabilities'],
  previousCapabilities?: ProviderProfile['capabilities']
) {
  return capabilitiesEqual(
    currentCapabilities,
    previousCapabilities ?? DEFAULT_CUSTOM_PROVIDER.capabilities
  );
}

function normalizeCustomProvider(provider: Partial<ProviderProfile>, index: number): ProviderProfile {
  const protocol = inferProviderProtocol(provider);
  const normalizedBaseUrl = provider.baseUrl?.trim() ?? '';
  const normalizedPath = provider.path?.trim() || getDefaultProviderPath(protocol);
  const matchedPreset = normalizedBaseUrl ? findProviderPreset(normalizedBaseUrl, normalizedPath) : null;

  const normalized: ProviderProfile = {
    id: provider.id || createUid(`provider-${index}`),
    name: provider.name?.trim() || matchedPreset?.name || `线路 ${index + 1}`,
    protocol: matchedPreset?.protocol ?? protocol,
    ...(provider.agentTransport === 'devin-acp' ? { agentTransport: 'devin-acp' as const } : {}),
    baseUrl: normalizedBaseUrl,
    path: normalizedPath,
    apiKey: provider.apiKey?.trim() ?? '',
    model: provider.model?.trim() || matchedPreset?.defaultModel || DEFAULT_CUSTOM_PROVIDER.model,
    capabilities: {
      images: provider.capabilities?.images ?? matchedPreset?.capabilities.images ?? DEFAULT_CUSTOM_PROVIDER.capabilities.images,
      streaming: provider.capabilities?.streaming ?? matchedPreset?.capabilities.streaming ?? DEFAULT_CUSTOM_PROVIDER.capabilities.streaming,
      thinking: provider.capabilities?.thinking ?? matchedPreset?.capabilities.thinking ?? DEFAULT_CUSTOM_PROVIDER.capabilities.thinking
    }
  };
  return provider.imageUnderstanding === undefined
    ? normalized
    : {
        ...normalized,
        imageUnderstanding: normalizeImageUnderstandingSettings(provider.imageUnderstanding)
      };
}

export function createCustomProviderProfile(
  provider: Partial<ProviderProfile> = {},
  customProviderCount = 0
): ProviderProfile {
  return normalizeCustomProvider(provider, customProviderCount);
}

export function selectActiveProvider(providers: ProviderProfile[], activeProviderId: string | null): ProviderProfile {
  return (
    providers.find((entry) => entry.id === activeProviderId) ??
    providers[0] ??
    DEFAULT_PROVIDER
  );
}

export function filterVisibleProviders(
  providers: ProviderProfile[]
) {
  const cached = visibleProviderCache.get(providers);
  if (cached) return cached;

  visibleProviderCache.set(providers, providers);
  return providers;
}

export function selectVisibleActiveProvider(
  providers: ProviderProfile[],
  activeProviderId: string | null
): ProviderProfile {
  const visibleProviders = filterVisibleProviders(providers);
  return (
    visibleProviders.find((provider) => provider.id === activeProviderId) ??
    visibleProviders[0] ??
    DEFAULT_PROVIDER
  );
}

export function normalizeProviders(
  providers?: ProviderProfile[] | null
): ProviderProfile[] {
  const normalizedProviders = (providers ?? []).map((provider, index) => normalizeCustomProvider(provider, index));
  const customProviders = normalizedProviders.filter((provider) => !isPolarisBuiltInProvider(provider));
  const normalizedCustomProviders = customProviders.length
    ? customProviders
    : [{
        ...DEFAULT_PROVIDER,
        capabilities: {
          ...DEFAULT_PROVIDER.capabilities
        }
      }];

  return normalizedCustomProviders;
}

export function mergeProviderPatch(provider: ProviderProfile, patch: Partial<ProviderProfile>): ProviderProfile {
  if (isPolarisPublicProvider(provider)) {
    return normalizePolarisPublicProvider({
      model: patch.model ?? provider.model
    });
  }

  const previousPreset = findProviderPreset(provider.baseUrl, provider.path);
  const nextBaseUrl = patch.baseUrl !== undefined ? patch.baseUrl.trim() : provider.baseUrl;
  const matchedPreset = nextBaseUrl ? findProviderPreset(nextBaseUrl) : null;
  const nextProtocol = patch.protocol !== undefined
    ? inferProviderProtocol({ protocol: patch.protocol, path: patch.path ?? provider.path })
    : matchedPreset?.protocol ?? provider.protocol;
  const nextPath = patch.path !== undefined
    ? patch.path.trim()
    : patch.protocol !== undefined
      ? getDefaultProviderPath(nextProtocol)
      : matchedPreset?.path ?? provider.path;
  const nextName = patch.name !== undefined
    ? patch.name.trim()
    : matchedPreset && shouldAdoptPresetName(provider.name, previousPreset?.name)
      ? matchedPreset.name
      : provider.name;
  const nextModel = patch.model !== undefined
    ? patch.model.trim()
    : matchedPreset && shouldAdoptPresetModel(provider.model, previousPreset?.defaultModel)
      ? matchedPreset.defaultModel
      : provider.model;
  const nextCapabilities = patch.capabilities !== undefined
    ? {
        ...provider.capabilities,
        ...patch.capabilities
      }
    : matchedPreset && shouldAdoptPresetCapabilities(provider.capabilities, previousPreset?.capabilities)
      ? {
          ...matchedPreset.capabilities
        }
      : provider.capabilities;
  const nextImageUnderstanding = patch.imageUnderstanding !== undefined
    ? normalizeImageUnderstandingSettings(patch.imageUnderstanding)
    : provider.imageUnderstanding;

  return {
    ...provider,
    ...patch,
    name: nextName,
    protocol: nextProtocol,
    baseUrl: nextBaseUrl,
    path: nextPath,
    apiKey: patch.apiKey !== undefined ? patch.apiKey.trim() : provider.apiKey,
    model: nextModel,
    capabilities: nextCapabilities,
    ...(nextImageUnderstanding === undefined ? {} : { imageUnderstanding: nextImageUnderstanding })
  };
}

export function countUserEditableCustomProviders(providers: ProviderProfile[]) {
  return providers.filter((provider) => !isPolarisBuiltInProvider(provider) && !isPlaceholderCustomProvider(provider)).length;
}
