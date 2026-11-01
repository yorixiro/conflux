import { createUid } from '../../../engines/id';

export type MemoryView = 'sky' | 'directory' | 'editor';
const STATE_KEY = 'confluxMemoryView';

/** One in-app page, with at most one child panel. No URL/origin or store changes. */
export function createMemoryViewNavigation(host: Window, callbacks: {
  onView: (view: MemoryView) => void;
  onExit: () => void;
  beforeLeaveView?: () => void;
}) {
  const id = createUid('memory-view');
  let view: MemoryView = 'sky';
  let disposed = false;
  let pending = false;
  const marker = () => host.history.state?.[STATE_KEY];
  function write(next: MemoryView, replace: boolean) {
    callbacks.beforeLeaveView?.();
    const state = { ...host.history.state, [STATE_KEY]: { id, view: next } };
    if (replace) host.history.replaceState(state, '');
    else host.history.pushState(state, '');
    view = next;
    callbacks.onView(next);
  }
  function pop() {
    if (disposed) return;
    callbacks.beforeLeaveView?.();
    pending = false;
    const state = marker();
    if (state?.id === id) {
      view = state.view;
      callbacks.onView(view);
    } else {
      disposed = true;
      host.removeEventListener('popstate', pop);
      callbacks.onExit();
    }
  }
  host.addEventListener('popstate', pop);
  write('sky', false);
  return {
    open(next: Exclude<MemoryView, 'sky'>) {
      if (!disposed && !pending && next !== view) write(next, view !== 'sky');
    },
    back() {
      if (disposed || pending) return;
      pending = true;
      host.history.back();
    },
    exit() {
      if (disposed || pending) return;
      pending = true;
      host.history.go(view === 'sky' ? -1 : -2);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      host.removeEventListener('popstate', pop);
      if (marker()?.id === id && !pending) host.history.go(view === 'sky' ? -1 : -2);
    }
  };
}

export type MemoryViewNavigation = ReturnType<typeof createMemoryViewNavigation>;
