import { describe, expect, it } from 'vitest';
import { DEFAULT_PROVIDER } from '../../stores/runtimeStoreProviders';
import { isLegacyDevinAcpProvider } from './apiProviderDisplay';

describe('legacy Devin ACP profile detection', () => {
  const legacy = {
    ...DEFAULT_PROVIDER,
    id: 'legacy-devin',
    name: 'Devin ACP',
    baseUrl: '',
    apiKey: '',
    model: 'swe-2-high'
  };

  it('recognizes the persisted pre-ACP profile without changing it', () => {
    expect(isLegacyDevinAcpProvider(legacy)).toBe(true);
    expect(legacy.model).toBe('swe-2-high');
  });

  it('keeps a converted ACP and ordinary HTTP providers distinct', () => {
    expect(isLegacyDevinAcpProvider({ ...legacy, agentTransport: 'devin-acp' })).toBe(false);
    expect(isLegacyDevinAcpProvider({ ...legacy, baseUrl: 'https://example.com/v1' })).toBe(false);
    expect(isLegacyDevinAcpProvider({ ...legacy, name: 'Different API' })).toBe(false);
  });
});
