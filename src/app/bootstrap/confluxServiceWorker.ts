import { Capacitor } from '@capacitor/core';

/** Install browser-only offline static shell. Android uses its Capacitor native package. */
export function registerConfluxServiceWorker(): void {
  if (!import.meta.env.PROD || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) {
    return;
  }

  const register = () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch((error: unknown) => {
        console.warn('Conflux PWA shell registration failed', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}
