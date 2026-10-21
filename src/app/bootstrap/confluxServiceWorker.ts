import { Capacitor } from '@capacitor/core';

/** Install browser-only offline static shell. Android uses its Capacitor native package. */
export function registerConfluxServiceWorker(): void {
  if (!import.meta.env.PROD || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)
    || !['http:', 'https:'].includes(window.location.protocol)) {
    return;
  }

  const register = () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL, updateViaCache: 'none'
    })
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
