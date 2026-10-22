import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerConfluxServiceWorker } from './confluxServiceWorker';

const { isNativePlatform } = vi.hoisted(() => ({ isNativePlatform: vi.fn(() => false) }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform } }));

beforeEach(() => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('BASE_URL', '/');
  isNativePlatform.mockReturnValue(false);
  vi.stubGlobal('document', { readyState: 'complete', visibilityState: 'visible', addEventListener: vi.fn() });
  vi.stubGlobal('window', { location: new URL('https://conflux.example/'), addEventListener: vi.fn() });
  vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockResolvedValue({}) } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Conflux browser-only SW registration', () => {
  it('uses the Vite deployment base for script and scope', () => {
    vi.stubEnv('BASE_URL', '/conflux/');
    registerConfluxServiceWorker();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/conflux/sw.js', {
      scope: '/conflux/', updateViaCache: 'none'
    });
  });

  it.each(['native', 'development', 'file', 'unsupported'])('does not register on %s', (environment) => {
    const register = navigator.serviceWorker.register;
    if (environment === 'native') isNativePlatform.mockReturnValue(true);
    if (environment === 'development') vi.stubEnv('PROD', false);
    if (environment === 'file') vi.stubGlobal('window', { location: new URL('file:///app/index.html') });
    if (environment === 'unsupported') vi.stubGlobal('navigator', {});
    registerConfluxServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('waits for load before registering', () => {
    vi.stubGlobal('document', { readyState: 'loading' });
    registerConfluxServiceWorker();
    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    expect(window.addEventListener).toHaveBeenCalledWith('load', expect.any(Function), { once: true });
  });

  it('checks for an update when an installed page returns to the foreground', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.mocked(navigator.serviceWorker.register).mockResolvedValue({ update } as unknown as ServiceWorkerRegistration);
    registerConfluxServiceWorker();
    await vi.waitFor(() => expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function)));
    const onVisibilityChange = vi.mocked(document.addEventListener).mock.calls[0][1] as () => void;
    vi.stubGlobal('document', { ...document, visibilityState: 'hidden' });
    onVisibilityChange();
    expect(update).not.toHaveBeenCalled();
    vi.stubGlobal('document', { ...document, visibilityState: 'visible' });
    onVisibilityChange();
    expect(update).toHaveBeenCalledOnce();
  });

  it('keeps a resumed page usable when the update server is offline', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const update = vi.fn().mockRejectedValue(new Error('offline'));
    vi.mocked(navigator.serviceWorker.register).mockResolvedValue({ update } as unknown as ServiceWorkerRegistration);
    registerConfluxServiceWorker();
    await vi.waitFor(() => expect(document.addEventListener).toHaveBeenCalled());
    const onVisibilityChange = vi.mocked(document.addEventListener).mock.calls[0][1] as () => void;
    onVisibilityChange();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('Conflux PWA update check failed', expect.any(Error)));
  });
});
