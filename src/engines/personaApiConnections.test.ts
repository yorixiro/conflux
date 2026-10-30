import { describe, expect, it } from 'vitest';
import { addSavedPersonaApiId, listSavedPersonaApiIds, removeSavedPersonaApiId } from './personaApiConnections';

describe('per-persona API references', () => {
  it('preserves a legacy selected provider and deduplicates saved IDs', () => {
    expect(listSavedPersonaApiIds({ providerId: 'old', savedProviderIds: ['a', 'a', ''] })).toEqual(['a', 'old']);
  });
  it('adds and removes without changing unrelated references', () => {
    const first = addSavedPersonaApiId(['one'], 'two');
    expect(first).toEqual(['one', 'two']);
    expect(removeSavedPersonaApiId(first, 'one')).toEqual(['two']);
  });
});
