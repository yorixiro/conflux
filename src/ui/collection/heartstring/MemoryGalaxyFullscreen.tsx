import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useSpaceStore } from '../../../stores/spaceStore';
import { createMemoryViewNavigation, type MemoryView, type MemoryViewNavigation } from './memoryViewNavigation';
import './heartstring.css';

const HeartstringMemoryAtlas = lazy(() => import('./HeartstringMemoryAtlas').then((module) => ({ default: module.HeartstringMemoryAtlas })));
const MemoryGalaxyContext = createContext<{ open: boolean; enter: () => void } | null>(null);

export function useMemoryGalaxy() {
  const context = useContext(MemoryGalaxyContext);
  if (!context) throw new Error('MemoryGalaxyProvider is required');
  return context;
}

/** The owner stays above responsive shell frames, so rotating/resizing retains the scene. */
export function MemoryGalaxyProvider({ children }: { children: ReactNode }) {
  const [navigation, setNavigation] = useState<MemoryViewNavigation | null>(null);
  const [view, setView] = useState<MemoryView>('sky');
  const navigationRef = useRef<MemoryViewNavigation | null>(null);
  useEffect(() => () => navigationRef.current?.dispose(), []);
  function enter() {
    if (navigationRef.current) return;
    // Explicit entry only: mount, StrictMode and Forward never open the galaxy.
    const next = createMemoryViewNavigation(window, {
      onView: setView,
      onExit: () => { navigationRef.current = null; setNavigation(null); },
      beforeLeaveView: () => {
        // Preserve the original entry editor's blur-to-save behavior on every Back path.
        const focused = document.activeElement as HTMLElement | null;
        if (focused?.closest('.memory-galaxy__management')) focused.blur();
      }
    });
    navigationRef.current = next;
    setNavigation(next);
  }
  return <MemoryGalaxyContext.Provider value={{ open: Boolean(navigation), enter }}>
    {children}
    {navigation && <MemoryGalaxyFullscreen navigation={navigation}>
      <Suspense fallback={<div className="memory-galaxy__loading"><button type="button" autoFocus onClick={() => navigation.exit()}>返回心弦</button><p role="status">正在打开记忆星河…</p></div>}>
        <HeartstringMemoryAtlas navigation={navigation} view={view} />
      </Suspense>
    </MemoryGalaxyFullscreen>}
  </MemoryGalaxyContext.Provider>;
}

/** Body portal + native top layer escape transformed world frames and isolate focus/touch. */
export function MemoryGalaxyFullscreen({ navigation, children }: {
  navigation: MemoryViewNavigation; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    const unsubscribe = useSpaceStore.subscribe((state, previous) => {
      if ((state.activeWorld !== previous.activeWorld || state.collectionShelf !== previous.collectionShelf)
        && (state.activeWorld !== 'collection' || state.collectionShelf !== 'album')) navigation.exit();
    });
    let removed = false;
    let removeBack: (() => void) | undefined;
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      void App.addListener('backButton', () => navigation.back()).then((listener) => {
        if (removed) void listener.remove();
        else removeBack = () => { void listener.remove(); };
      });
    }
    return () => {
      removed = true;
      removeBack?.();
      unsubscribe();
      dialog.close();
      document.body.style.overflow = overflow;
      const focus = previousFocus?.isConnected ? previousFocus : document.querySelector<HTMLElement>('[data-enter-memory]');
      focus?.focus({ preventScroll: true });
    };
  }, [navigation]);
  return createPortal(<dialog ref={ref} className="memory-galaxy-fullscreen" aria-label="记忆星河"
    onCancel={(event) => { event.preventDefault(); navigation.back(); }}>{children}</dialog>, document.body);
}
