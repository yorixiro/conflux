import type { Persona, ProviderProfile } from '../types/domain';

export type PersonaProviderBinding = {
  api: ProviderProfile;
  status: 'ready' | 'unconfigured' | 'missing-provider';
  fixedProvider: ProviderProfile | null;
  fixedProviderId: string | null;
  modelOverride: string;
  modelId: string;
};

export function resolvePersonaProviderStatus(
  persona: Persona | null | undefined,
  providers: ProviderProfile[]
): PersonaProviderBinding['status'] {
  const providerId = persona?.advanced?.providerId?.trim();
  if (providerId) {
    return providers.some((provider) => provider.id === providerId) ? 'ready' : 'missing-provider';
  }
  return persona?.advanced?.providerRouteMode === 'unconfigured'
    || persona?.advanced?.providerRouteMode === 'fixed'
    ? 'unconfigured'
    : 'ready';
}

export function resolvePersonaProviderBinding(args: {
  globalApi: ProviderProfile;
  providers: ProviderProfile[];
  persona?: Persona | null;
}): PersonaProviderBinding {
  const fixedProviderId = args.persona?.advanced?.providerId?.trim() || null;
  const fixedProvider = fixedProviderId
    ? args.providers.find((provider) => provider.id === fixedProviderId) ?? null
    : null;
  const baseApi = fixedProvider ?? args.globalApi;
  const modelOverride = fixedProviderId && !fixedProvider
    ? ''
    : args.persona?.advanced?.modelOverride.trim() || '';
  const modelId = modelOverride || baseApi.model;
  const api = modelId && modelId !== baseApi.model
    ? { ...baseApi, model: modelId }
    : baseApi;

  return {
    api,
    status: resolvePersonaProviderStatus(args.persona, args.providers),
    fixedProvider,
    fixedProviderId,
    modelOverride,
    modelId
  };
}
