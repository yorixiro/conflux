import type { ChatMessage } from '../../../../types/domain';

export type TimelineRenderItem = {
  message: ChatMessage;
  toolMessages: ChatMessage[];
  messageCycleIndex: number | null;
  userBubbleIndex?: number;
  isAssistantContinuation: boolean;
  isTerminalAssistantInUserTurn: boolean;
};

const EMPTY_TOOL_MESSAGES: ChatMessage[] = [];

function buildToolMessagesByOriginId(messages: ChatMessage[], availableAssistantIds: ReadonlySet<string>) {
  const toolMessagesByOriginId = new Map<string, ChatMessage[]>();

  messages.forEach((message) => {
    const isRuntimeToolMessage =
      message.role === 'system'
      && message.origin === 'tool-runtime'
      && Boolean(message.toolInvocation);

    if (!isRuntimeToolMessage) return;

    const originMessageId = message.toolInvocation?.originMessageId?.trim();
    // An execution receipt must remain visible even when its originating
    // assistant message was deleted or excluded from the loaded history.
    if (!originMessageId || !availableAssistantIds.has(originMessageId)) return;

    const bucket = toolMessagesByOriginId.get(originMessageId) ?? [];
    bucket.push(message);
    toolMessagesByOriginId.set(originMessageId, bucket);
  });

  return toolMessagesByOriginId;
}

export function buildTimelineRenderItems(messages: ChatMessage[]): TimelineRenderItem[] {
  const items: TimelineRenderItem[] = [];
  const availableAssistantIds = new Set(
    messages
      .filter((message) => message.role === 'assistant' && !message.toolInvocation)
      .map((message) => message.id)
  );
  const toolMessagesByOriginId = buildToolMessagesByOriginId(messages, availableAssistantIds);
  let cycleIndex = 0;
  let userBubbleIndex = 0;
  let hasAssistantInCurrentUserTurn = false;

  messages.forEach((message, messageIndex) => {
    if (message.role === 'system' && message.origin === 'trigger-runtime') {
      hasAssistantInCurrentUserTurn = false;
      return;
    }

    const isRuntimeToolMessage =
      message.role === 'system'
      && message.origin === 'tool-runtime'
      && Boolean(message.toolInvocation);
    const originMessageId = message.toolInvocation?.originMessageId?.trim();

    if (isRuntimeToolMessage && originMessageId && availableAssistantIds.has(originMessageId)) {
      return;
    }

    if (message.role === 'user' && !message.toolInvocation) {
      hasAssistantInCurrentUserTurn = false;
    }

    const isCycleMessage = !message.toolInvocation && message.role !== 'system';
    const isUserBubble = message.role === 'user' && !message.toolInvocation;
    const toolMessages =
      message.role === 'assistant' && !message.toolInvocation
        ? toolMessagesByOriginId.get(message.id) ?? EMPTY_TOOL_MESSAGES
        : EMPTY_TOOL_MESSAGES;
    const isAssistantContinuation = message.role === 'assistant' && !message.toolInvocation && hasAssistantInCurrentUserTurn;
    const isAssistantMessage = message.role === 'assistant' && !message.toolInvocation;

    let isTerminalAssistantInUserTurn = false;
    if (isAssistantMessage) {
      isTerminalAssistantInUserTurn = true;
      for (let nextIndex = messageIndex + 1; nextIndex < messages.length; nextIndex += 1) {
        const nextMessage = messages[nextIndex];
        const isNextRuntimeToolMessage =
          nextMessage.role === 'system'
          && nextMessage.origin === 'tool-runtime'
          && Boolean(nextMessage.toolInvocation);

        if (isNextRuntimeToolMessage) continue;
        if (nextMessage.role === 'user' && !nextMessage.toolInvocation) break;
        if (nextMessage.role === 'assistant' && !nextMessage.toolInvocation) {
          isTerminalAssistantInUserTurn = false;
        }
        break;
      }
    }

    items.push({
      message,
      toolMessages,
      messageCycleIndex: isCycleMessage ? cycleIndex++ : null,
      userBubbleIndex: isUserBubble ? userBubbleIndex++ : undefined,
      isAssistantContinuation,
      isTerminalAssistantInUserTurn
    });

    if (message.role === 'assistant' && !message.toolInvocation) {
      hasAssistantInCurrentUserTurn = true;
    }
  });

  return items;
}
