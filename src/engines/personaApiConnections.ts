import type { PersonaAdvancedSettings } from '../types/domain';

export function listSavedPersonaApiIds(advanced: Pick<PersonaAdvancedSettings, 'providerId' | 'savedProviderIds'>): string[] {
  return Array.from(new Set([
    ...(Array.isArray(advanced.savedProviderIds) ? advanced.savedProviderIds : []),
    advanced.providerId ?? ''
  ].filter((id): id is string => typeof id === 'string' && Boolean(id.trim())).map((id) => id.trim())));
}

export function addSavedPersonaApiId(ids: string[], id: string): string[] {
  return Array.from(new Set([...ids, id].filter(Boolean)));
}

export function removeSavedPersonaApiId(ids: string[], id: string): string[] {
  return ids.filter((entry) => entry !== id);
}
