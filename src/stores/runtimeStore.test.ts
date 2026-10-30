import { beforeEach, describe, expect, it } from 'vitest';
import { selectRuntimeApi, useRuntimeStore } from './runtimeStore';

describe('runtimeStore role-only route creation', () => {
  it('creates a blank route without changing the global active route', () => {
    useRuntimeStore.setState(useRuntimeStore.getInitialState(), true);
    const previousActiveId = useRuntimeStore.getState().activeProviderId;
    const previousGlobalId = selectRuntimeApi(useRuntimeStore.getState()).id;

    const newId = useRuntimeStore.getState().createProvider('AI 专属线路', { activate: false });
    const state = useRuntimeStore.getState();

    expect(state.activeProviderId).toBe(previousActiveId);
    expect(selectRuntimeApi(state).id).toBe(previousGlobalId);
    expect(state.providers.find((provider) => provider.id === newId)).toMatchObject({
      apiKey: '',
      baseUrl: '',
      model: ''
    });
  });
});

describe('role-owned API duplication', () => {
  it('copies the provider and credentials without changing the global selection or source', () => {
    useRuntimeStore.setState(useRuntimeStore.getInitialState(), true);
    const sourceId = useRuntimeStore.getState().createProvider('Shared API', { activate: false });
    useRuntimeStore.getState().updateProvider(sourceId, {
      baseUrl: 'https://example.invalid/v1', apiKey: 'test-secret', model: 'model-a'
    });
    const before = useRuntimeStore.getState();
    const source = before.providers.find((provider) => provider.id === sourceId);
    const copyId = before.duplicateProvider(sourceId, 'Private Copy', { activate: false });
    const after = useRuntimeStore.getState();
    expect(after.activeProviderId).toBe(before.activeProviderId);
    expect(source).toEqual(after.providers.find((provider) => provider.id === sourceId));
    expect(after.providers.find((provider) => provider.id === copyId)).toMatchObject({
      name: 'Private Copy', baseUrl: 'https://example.invalid/v1', apiKey: 'test-secret', model: 'model-a'
    });
  });
});

describe('runtimeStore companion connections', () => {
  beforeEach(() => {
    useRuntimeStore.setState(useRuntimeStore.getInitialState(), true);
  });

  it('does not replace companion connection state when a patch changes nothing', () => {
    const connectionId = useRuntimeStore.getState().addCompanionConnection({
      id: 'companion-1',
      collaboratorId: 'companion:one',
      conversationId: 'conversation-1',
      relayUrl: 'http://192.168.0.108:8787',
      hostId: 'host-1',
      clientId: 'client-1',
      clientSecret: 'secret-1',
      lastError: 'Load failed'
    });
    const beforeConnections = useRuntimeStore.getState().companionConnections;

    useRuntimeStore.getState().updateCompanionConnection(connectionId, {
      lastError: 'Load failed'
    });

    expect(useRuntimeStore.getState().companionConnections).toBe(beforeConnections);
  });

  it('replaces companion connection state when a real field changes', () => {
    const connectionId = useRuntimeStore.getState().addCompanionConnection({
      id: 'companion-1',
      collaboratorId: 'companion:one',
      conversationId: 'conversation-1',
      relayUrl: 'http://192.168.0.108:8787',
      hostId: 'host-1',
      clientId: 'client-1',
      clientSecret: 'secret-1',
      lastError: 'Load failed'
    });
    const beforeConnections = useRuntimeStore.getState().companionConnections;

    useRuntimeStore.getState().updateCompanionConnection(connectionId, {
      lastError: 'Failed to fetch'
    });

    expect(useRuntimeStore.getState().companionConnections).not.toBe(beforeConnections);
    expect(useRuntimeStore.getState().companionConnections[0]?.lastError).toBe('Failed to fetch');
  });
});
