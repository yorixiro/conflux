import { describe, expect, it, vi } from 'vitest';
import { createMemoryViewNavigation } from './memoryViewNavigation';

function browser() {
  const host = new EventTarget();
  const entries: unknown[] = [{ app: 'heartstring' }];
  let index = 0;
  const history = {
    get state() { return entries[index]; },
    pushState(state: unknown) { entries.splice(++index, entries.length, state); },
    replaceState(state: unknown) { entries[index] = state; },
    go: vi.fn((delta: number) => { index += delta; host.dispatchEvent(new Event('popstate')); }),
    back() { this.go(-1); }
  };
  return { host: Object.assign(host, { history }) as unknown as Window, history, entries };
}

describe('immersive memory navigation', () => {
  it('browser/native/ESC Back closes a child then returns to Heartstring, preserving the app entry', () => {
    const { host, history } = browser();
    const onView = vi.fn(), onExit = vi.fn();
    const beforeLeaveView = vi.fn();
    const page = createMemoryViewNavigation(host, { onView, onExit, beforeLeaveView });
    expect(history.state).toMatchObject({ app: 'heartstring' });
    page.open('directory');
    history.back();
    expect(onView).toHaveBeenLastCalledWith('sky');
    expect(onExit).not.toHaveBeenCalled();
    page.open('editor');
    beforeLeaveView.mockClear();
    page.back();
    expect(beforeLeaveView).toHaveBeenCalledOnce();
    expect(onView).toHaveBeenLastCalledWith('sky');
    page.back();
    expect(history.state).toEqual({ app: 'heartstring' });
    expect(onExit).toHaveBeenCalledOnce();
    page.dispose(); page.back();
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('explicit return exits both layers; reopening is explicit and does not accumulate child entries', () => {
    const { host, history, entries } = browser();
    const onExit = vi.fn();
    const page = createMemoryViewNavigation(host, { onView: vi.fn(), onExit });
    page.open('directory'); page.open('editor'); page.open('directory');
    expect(entries).toHaveLength(3);
    page.exit();
    expect(history.go).toHaveBeenLastCalledWith(-2);
    expect(onExit).toHaveBeenCalledOnce();
    const again = createMemoryViewNavigation(host, { onView: vi.fn(), onExit });
    expect(entries).toHaveLength(2);
    again.dispose(); again.dispose();
    expect(history.state).toEqual({ app: 'heartstring' });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('ignores repeated return while a real asynchronous history traversal is pending', () => {
    const { host, history } = browser();
    history.go = vi.fn();
    const page = createMemoryViewNavigation(host, { onView: vi.fn(), onExit: vi.fn() });
    page.exit(); page.exit(); page.back(); page.open('directory'); page.dispose();
    expect(history.go).toHaveBeenCalledOnce();
  });
});
