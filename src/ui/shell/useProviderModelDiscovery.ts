import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { discoverProviderModels, type ProviderModelOption } from '../../engines/providerModelDiscovery';
import type { ProviderProfile } from '../../types/domain';

// Session-only discovery results shared by API settings and the chat selectors.
// Never serialized into settings, exports, or logs.
const emptyModels: ProviderModelOption[] = [];
const cache = new Map<string, { connection: ProviderProfile; models: ProviderModelOption[] }>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function sameConnection(a: ProviderProfile, b: ProviderProfile) {
  return a.id === b.id && a.baseUrl === b.baseUrl && a.path === b.path && a.protocol === b.protocol && a.apiKey === b.apiKey;
}
function getModels(api: ProviderProfile) {
  const entry = cache.get(api.id);
  return entry && sameConnection(entry.connection, api) ? entry.models : emptyModels;
}

export function useProviderModelDiscovery(api: ProviderProfile) {
  const request = useRef<AbortController | null>(null);
  const models = useSyncExternalStore(subscribe, () => getModels(api), () => emptyModels);
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; error: string | null }>({ status: 'idle', error: null });

  useEffect(() => {
    request.current?.abort();
    const previous = cache.get(api.id);
    if (previous && !sameConnection(previous.connection, api)) {
      cache.delete(api.id);
      listeners.forEach((listener) => listener());
    }
    setState({ status: 'idle', error: null });
    return () => { request.current?.abort(); };
  }, [api.id, api.baseUrl, api.path, api.protocol, api.apiKey]);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'loading', error: null });
    const result = await discoverProviderModels({ api, signal: controller.signal });
    if (controller.signal.aborted || request.current !== controller) return false;
    if (result.ok) {
      cache.set(api.id, { connection: api, models: result.models });
      listeners.forEach((listener) => listener());
      setState({ status: 'success', error: null });
      return true;
    }
    setState({ status: 'error', error: '模型列表拉取失败，请检查地址、密钥和网络后重试；也可以手动填写模型。' });
    return false;
  }

  return { ...state, models, refresh };
}
