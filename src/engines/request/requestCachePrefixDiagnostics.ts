export type RequestCachePrefixDiagnostic = {
  status: 'stable' | 'changed' | 'unavailable';
  sharedMessageCount: number;
  previousMessageCount: number;
  changedPart?: 'system' | 'tools' | 'messages';
  changedMessageIndex?: number;
};

// Compare only request structure in memory. Never store the prompt, a diff of
// its contents, or any excerpt in the diagnostic result.
export function compareRequestCachePrefixes(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): RequestCachePrefixDiagnostic {
  const previousMessages = previous.messages;
  const currentMessages = current.messages;
  if (!Array.isArray(previousMessages) || !Array.isArray(currentMessages)) {
    return { status: 'unavailable', sharedMessageCount: 0, previousMessageCount: 0 };
  }

  const base = {
    sharedMessageCount: 0,
    previousMessageCount: previousMessages.length
  };

  if (JSON.stringify(previous.tools ?? []) !== JSON.stringify(current.tools ?? [])) {
    return { ...base, status: 'changed', changedPart: 'tools' };
  }
  if (JSON.stringify(previous.system ?? null) !== JSON.stringify(current.system ?? null)) {
    return { ...base, status: 'changed', changedPart: 'system' };
  }

  for (let index = 0; index < previousMessages.length; index += 1) {
    if (
      index >= currentMessages.length
      || JSON.stringify(previousMessages[index]) !== JSON.stringify(currentMessages[index])
    ) {
      return {
        status: 'changed',
        sharedMessageCount: index,
        previousMessageCount: previousMessages.length,
        changedPart: 'messages',
        changedMessageIndex: index
      };
    }
  }

  return {
    status: 'stable',
    sharedMessageCount: previousMessages.length,
    previousMessageCount: previousMessages.length
  };
}
