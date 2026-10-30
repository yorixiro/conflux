import { describe, expect, it } from 'vitest';
import { addSavedPersonaApiId, listSavedPersonaApiIds, removeSavedPersonaApiId } from './personaApiConnections';
import { createPersonaTemplate } from '../config/persona/personaBuilder';

describe('per-persona API references', () => {
  it('preserves a legacy selected provider and deduplicates saved IDs', () => {
    expect(listSavedPersonaApiIds({ providerId: 'old', savedProviderIds: ['a', 'a', ''] })).toEqual(['a', 'old']);
  });
  it('round-trips saved API IDs through existing persona normalization', () => {
    const persona = createPersonaTemplate({
      id: 'persona-a', name: 'A', description: '',
      advanced: { providerId: 'one', savedProviderIds: ['one', 'two', 'two'] }
    });
    expect(persona.advanced.savedProviderIds).toEqual(['one', 'two']);
    expect(listSavedPersonaApiIds(persona.advanced)).toEqual(['one', 'two']);
  });
  it('adds and removes without changing unrelated references', () => {
    const first = addSavedPersonaApiId(['one'], 'two');
    expect(first).toEqual(['one', 'two']);
    expect(removeSavedPersonaApiId(first, 'one')).toEqual(['two']);
  });
});
