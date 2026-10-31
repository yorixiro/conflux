import type { Persona, ProviderProfile } from '../types/domain';
import { isPolarisBuiltInProvider } from './freeProvider';

export type PersonaProviderBinding = {
  api: ProviderProfile;
  status: 'ready' | 'unconfigured' | 'missing-provider';
  fixedProvider: ProviderProfile | null;
  fixedProviderId: string | null;
  modelOverride: string;
  modelId: string;
};

function hasUsableProviderRoute(provider: ProviderProfile, modelOverride?: string) {
  // ACP providers do not use the OpenAI-compatible URL/key/model fields.
  // This is a configured-route check, not a live bridge health check.
  if (provider.agentTransport === 'devin-acp') return true;
  if (isPolarisBuiltInProvider(provider)) return Boolean(modelOverride?.trim() || provider.model.trim());
  return Boolean((modelOverride?.trim() || provider.model.trim()) && provider.baseUrl.trim() && provider.apiKey.trim());
}

export function resolvePersonaProviderStatus(
  persona: Persona | null | undefined,
  providers: ProviderProfile[],
  globalApi?: ProviderProfile
): PersonaProviderBinding['status'] {
  if (!persona) return 'unconfigured';
  const providerId = persona?.advanced?.providerId?.trim();
  if (providerId) {
    const provider = providers.find((entry) => entry.id === providerId);
    if (!provider) return 'missing-provider';
    return hasUsableProviderRoute(provider, persona.advanced?.modelOverride) ? 'ready' : 'unconfigured';
  }
  // Historical personas without a route choice must not silently borrow the
  // global DeepSeek (or any other) connection. Only explicit opt-in inherits it.
  if (persona.advanced?.providerRouteMode !== 'inherit') return 'unconfigured';
  return globalApi && !hasUsableProviderRoute(globalApi, persona.advanced?.modelOverride)
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
    status: resolvePersonaProviderStatus(args.persona, args.providers, args.globalApi),
    fixedProvider,
    fixedProviderId,
    modelOverride,
    modelId
  };
}
