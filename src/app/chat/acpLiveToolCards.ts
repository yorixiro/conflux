/**
 * Ephemeral ACP tool presentation state.
 * Existing Conflux-native tools keep using persisted ToolInvocation cards.
 * This store handles Devin's agent-side tool updates and permission choices
 * without blocking the entire screen with window.confirm().
 */
export type AcpToolCard = {
  id: string;
  conversationId: string;
  title: string;
  description: string;
  state: 'running' | 'executed' | 'failed' | 'approval';
  options?: Array<{ optionId: string; name: string; kind: string }>;
};

let cards: AcpToolCard[] = [];
const listeners = new Set<() => void>();
const pendingPermissions = new Map<string, {
  resolve: (optionId: string | null) => void;
  signal?: AbortSignal;
  onAbort: () => void;
}>();

function notify() {
  for (const callback of listeners) callback();
}
function setCards(next: AcpToolCard[]) {
  cards = next;
  notify();
}
export function subscribeAcpToolCards(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}
export function getAcpToolCardsSnapshot() {
  return cards;
}

export function beginAcpToolStream(conversationId: string) {
  for (const card of cards.filter((entry) =>
    entry.conversationId === conversationId && entry.state === 'approval'
  )) {
    resolveAcpPermission(card.id, null);
  }
  setCards(cards.filter((card) => card.conversationId !== conversationId));
}

export function publishAcpToolUpdate(conversationId: string, update: {
  sessionUpdate?: string;
  toolCallId?: string;
  title?: string;
  name?: string;
  status?: string;
}) {
  if ((update.sessionUpdate !== 'tool_call' && update.sessionUpdate !== 'tool_call_update')
    || typeof update.toolCallId !== 'string') return;
  const id = 'tool:' + update.toolCallId;
  const prior = cards.find((card) => card.id === id && card.conversationId === conversationId);
  const state = update.status === 'completed'
    ? 'executed' as const
    : update.status === 'failed'
      ? 'failed' as const
      : update.status ? 'running' as const : prior?.state ?? 'running' as const;
  const next: AcpToolCard = {
    id, conversationId,
    title: update.title || prior?.title || update.name || 'Devin 工具',
    description: prior?.description || '',
    state
  };
  setCards([...cards.filter((card) => card.id !== id || card.conversationId !== conversationId), next].slice(-30));
}

export function requestAcpPermissionChoice(args: {
  conversationId: string;
  permissionId: string;
  title: string;
  description: string;
  options: Array<{ optionId: string; name: string; kind: string }>;
  signal?: AbortSignal;
}): Promise<string | null> {
  if (args.signal?.aborted) return Promise.resolve(null);
  return new Promise((resolve) => {
    const id = 'permission:' + args.permissionId;
    const onAbort = () => resolveAcpPermission(id, null);
    pendingPermissions.set(id, { resolve, signal: args.signal, onAbort });
    args.signal?.addEventListener('abort', onAbort, { once: true });
    setCards([...cards.filter((card) => card.id !== id), {
      id, conversationId: args.conversationId,
      title: args.title || 'Devin 请求操作权限',
      description: args.description,
      state: 'approval',
      options: args.options.filter((option) =>
        option.kind === 'allow_once' || option.kind === 'reject_once'
      )
    }].slice(-30));
  });
}

export function resolveAcpPermission(id: string, optionId: string | null) {
  const pending = pendingPermissions.get(id);
  if (!pending) return;
  const card = cards.find((entry) => entry.id === id);
  const selected = card?.options?.some((option) => option.optionId === optionId)
    ? optionId : null;
  pendingPermissions.delete(id);
  pending.signal?.removeEventListener('abort', pending.onAbort);
  setCards(cards.map((entry) => entry.id === id ? {
    ...entry,
    state: selected && card?.options?.find((option) => option.optionId === selected)?.kind === 'allow_once'
      ? 'running' : 'failed',
    options: undefined,
    description: selected ? '已回应权限请求' : '已取消权限请求'
  } : entry));
  pending.resolve(selected);
}

export function finishAcpToolStream(conversationId: string, succeeded: boolean) {
  for (const card of cards.filter((entry) => entry.conversationId === conversationId && entry.state === 'approval')) {
    resolveAcpPermission(card.id, null);
  }
  setCards(cards.map((entry) =>
    entry.conversationId === conversationId && entry.state === 'running'
      ? { ...entry, state: succeeded ? 'executed' as const : 'failed' as const }
      : entry
  ));
}
