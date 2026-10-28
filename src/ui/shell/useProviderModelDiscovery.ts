import { useEffect, useRef, useState } from 'react';
import { discoverProviderModels, type ProviderModelOption } from '../../engines/providerModelDiscovery';
import type { ProviderProfile } from '../../types/domain';

/** A list belongs to one connection; never apply a late result to another route. */
export function useProviderModelDiscovery(api: ProviderProfile) {
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    models: ProviderModelOption[];
    error: string | null;
  }>({ status: 'idle', models: [], error: null });

  useEffect(() => {
    request.current?.abort();
    setState({ status: 'idle', models: [], error: null });
    return () => { request.current?.abort(); };
  }, [api.id, api.baseUrl, api.path, api.protocol, api.apiKey]);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState((previous) => ({ ...previous, status: 'loading', error: null }));
    const result = await discoverProviderModels({ api, signal: controller.signal });
    if (controller.signal.aborted || request.current !== controller) return false;
    if (result.ok) {
      setState({ status: 'success', models: result.models, error: null });
      return true;
    }
    // Keep the last successful list usable when a refresh fails. Do not echo
    // arbitrary upstream response bodies (which may contain credentials).
    setState((previous) => ({ ...previous, status: 'error', error: '模型列表拉取失败，请检查地址、密钥和网络后重试；也可以手动填写模型。' }));
    return false;
  }

  return { ...state, refresh };
}
