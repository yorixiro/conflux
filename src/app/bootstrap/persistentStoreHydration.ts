import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { isDeveloperModeEnabled } from '../developer/developerModeRuntime';
import { reportPersistenceError } from '../../infrastructure/persistenceDiagnostics';
import { useChatStore } from '../../stores/chatStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { usePersonaStore } from '../../stores/personaStore';
import { useRuntimeStore } from '../../stores/runtimeStore';
import { useSpaceStore } from '../../stores/spaceStore';
import {
  readPersistedSpaceThemeState,
  writePersistedSpaceThemeState
} from '../../stores/spaceStorePersistence';

export type SpaceThemeHydrationState = Awaited<ReturnType<typeof readPersistedSpaceThemeState>>;
type StartupStoreName = 'chat' | 'collection' | 'persona' | 'runtime';

function isStartupStoreHydrated(store: StartupStoreName) {
  return {
    chat: useChatStore,
    collection: useCollectionStore,
    persona: usePersonaStore,
    runtime: useRuntimeStore
  }[store].getState().hydrated;
}

function hasUnhydratedStartupStores() {
  return (['chat', 'collection', 'persona', 'runtime'] as const).some((store) => !isStartupStoreHydrated(store));
}

export type StartupStoreHydrationResult = {
  shouldPersistPersonaAfterHydration: boolean;
  shouldPersistRuntimeAfterHydration: boolean;
};

function shouldRunStartupAssetGovernanceDebug() {
  if (typeof window === 'undefined') return false;
  try {
    return isDeveloperModeEnabled() || new URLSearchParams(window.location.search).get('debugAssets') === '1';
  } catch {
    return isDeveloperModeEnabled();
  }
}

export async function hydrateSpaceThemeState({
  readThemeState = readPersistedSpaceThemeState,
  writeThemeState = writePersistedSpaceThemeState,
  getSpaceState = useSpaceStore.getState,
  setSpaceState = useSpaceStore.setState,
  setThemeHydrated,
  markThemeReady,
  isCancelled = () => false,
  reportError = (error) => {
    reportPersistenceError({ label: '[space:persist]', store: 'space', operation: 'hydrate-theme' }, error);
  }
}: {
  readThemeState?: typeof readPersistedSpaceThemeState;
  writeThemeState?: typeof writePersistedSpaceThemeState;
  getSpaceState?: typeof useSpaceStore.getState;
  setSpaceState?: typeof useSpaceStore.setState;
  setThemeHydrated?: (hydrated: boolean) => void;
  markThemeReady?: () => void;
  isCancelled?: () => boolean;
  reportError?: (error: unknown) => void;
} = {}) {
  try {
    if (isCancelled()) return false;
    const persistedSpaceTheme = await readThemeState();
    if (isCancelled()) return false;
    if (persistedSpaceTheme) {
      setSpaceState(persistedSpaceTheme.themeState);
    } else {
      await writeThemeState(getSpaceState());
      if (isCancelled()) return false;
    }
    setThemeHydrated?.(true);
    return true;
  } catch (error) {
    reportError(error);
    return false;
  } finally {
    if (!isCancelled()) {
      markThemeReady?.();
    }
  }
}

async function hydrateStartupStore<T>(
  store: StartupStoreName,
  hydrate: () => Promise<T>,
  fallback: T,
  reportError: (store: StartupStoreName, error: unknown) => void
) {
  try {
    return await hydrate();
  } catch (error) {
    reportError(store, error);
    return fallback;
  }
}

export async function hydrateStartupStores({
  onlyUnhydrated = false,
  hydrateChat = () => useChatStore.getState().hydrateFromDb(),
  hydratePersona = () => usePersonaStore.getState().hydrateFromDb(),
  hydrateRuntime = () => useRuntimeStore.getState().hydrateFromDb(),
  hydrateCollection = () => useCollectionStore.getState().hydrateFromDb(),
  reportError = (store, error) => {
    reportPersistenceError({ label: '[store:persist]', store, operation: 'hydrate-startup' }, error);
  }
}: {
  onlyUnhydrated?: boolean;
  hydrateChat?: () => Promise<unknown>;
  hydratePersona?: () => Promise<boolean>;
  hydrateRuntime?: () => Promise<boolean>;
  hydrateCollection?: () => Promise<unknown>;
  reportError?: (store: StartupStoreName, error: unknown) => void;
} = {}): Promise<StartupStoreHydrationResult> {
  const [
    ,
    shouldPersistPersonaAfterHydration,
    shouldPersistRuntimeAfterHydration
  ] = await Promise.all([
    onlyUnhydrated && isStartupStoreHydrated('chat') ? null : hydrateStartupStore('chat', hydrateChat, null, reportError),
    onlyUnhydrated && isStartupStoreHydrated('persona') ? false : hydrateStartupStore('persona', hydratePersona, false, reportError),
    onlyUnhydrated && isStartupStoreHydrated('runtime') ? false : hydrateStartupStore('runtime', hydrateRuntime, false, reportError),
    onlyUnhydrated && isStartupStoreHydrated('collection') ? null : hydrateStartupStore('collection', hydrateCollection, null, reportError)
  ]);

  return {
    shouldPersistPersonaAfterHydration,
    shouldPersistRuntimeAfterHydration
  };
}

export function usePersistentStoreHydration(spaceThemeHydratedRef: MutableRefObject<boolean>) {
  const [startupThemeReady, setStartupThemeReady] = useState(false);
  const [startupStoresReady, setStartupStoresReady] = useState(false);
  const retryHydrationRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const hydrate = async () => {
      if (cancelled || pending) return;
      pending = true;
      try {
        const storeHydrationPromise = hydrateStartupStores({ onlyUnhydrated: true }).finally(() => {
          if (!cancelled) {
            setStartupStoresReady(true);
          }
        });
        if (!spaceThemeHydratedRef.current) {
          await hydrateSpaceThemeState({
            setThemeHydrated: (hydrated) => {
              spaceThemeHydratedRef.current = hydrated;
            },
            markThemeReady: () => setStartupThemeReady(true),
            isCancelled: () => cancelled
          });
        } else {
          setStartupThemeReady(true);
        }
        if (cancelled) return;

        const {
          shouldPersistPersonaAfterHydration,
          shouldPersistRuntimeAfterHydration
        } = await storeHydrationPromise;
        if (cancelled) return;

        await Promise.all([
          shouldPersistPersonaAfterHydration ? usePersonaStore.getState().persistToDb() : Promise.resolve(),
          shouldPersistRuntimeAfterHydration ? useRuntimeStore.getState().persistToDb() : Promise.resolve()
        ]);
        if (cancelled) return;

        if (isStartupStoreHydrated('chat') && isStartupStoreHydrated('collection')) {
          useChatStore.getState().reconcileConversationWorkspaceBindings(
            useCollectionStore.getState().roomProjects.map((project) => project.id)
          );
        }
        if (cancelled) return;

        if (shouldRunStartupAssetGovernanceDebug()) {
          try {
            const [
              { auditStoredAssets },
              { buildStableAssetGovernanceReferences },
              { buildAssetGovernanceDebugEntry, recordAssetGovernanceDebugEntry }
            ] = await Promise.all([
              import('../../engines/assetGovernance'),
              import('../data-work/assetGovernanceReferences'),
              import('../developer/assetGovernanceDebug')
            ]);
            const audit = await auditStoredAssets(await buildStableAssetGovernanceReferences());
            recordAssetGovernanceDebugEntry(buildAssetGovernanceDebugEntry({
              audit,
              deletedCount: 0,
              reason: 'startup-audit'
            }));
          } catch (error) {
            console.warn('[asset-governance]', error);
          }
        }
      } catch (error) {
        if (!cancelled) {
          reportPersistenceError({ label: '[store:persist]', store: 'startup', operation: 'hydrate-lifecycle' }, error);
        }
      } finally {
        pending = false;
        const needsRetry = !spaceThemeHydratedRef.current || hasUnhydratedStartupStores();
        if (!cancelled && needsRetry && retryCount < 3) {
          retryTimer = setTimeout(() => { retryTimer = null; void hydrate(); }, 500 * 2 ** retryCount++);
        }
      }
    };
    const retry = () => {
      if (spaceThemeHydratedRef.current && !hasUnhydratedStartupStores()) return;
      if (retryTimer !== null) clearTimeout(retryTimer);
      retryTimer = null;
      retryCount = 0;
      void hydrate();
    };
    retryHydrationRef.current = retry;
    window.addEventListener('focus', retry);
    const onVisible = () => { if (document.visibilityState === 'visible') retry(); };
    document.addEventListener('visibilitychange', onVisible);
    void hydrate();

    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', onVisible);
      retryHydrationRef.current = () => {};
    };
  }, [spaceThemeHydratedRef]);

  return {
    startupThemeReady,
    startupStoresReady,
    retryPersistenceReadFailure: () => retryHydrationRef.current()
  };
}
