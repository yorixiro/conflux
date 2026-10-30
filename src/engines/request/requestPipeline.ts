import type { AssistantToolContext } from '../assistantToolProtocol';
import { requestDevinAcpReply } from './devinAcpReply';
import { resolveAssistantToolRequestTools } from '../tool-protocol/assistantToolProtocolRequestTools';
import type { OpenAiToolHistoryMode } from '../provider-runtime/providerRuntimeOpenAiToolHistory';
import type { ProviderHttpRequest } from '../provider-runtime';
import type { AssistantRequestAudit } from './requestAudit';
import { recordRequestDebug } from './requestDebugRecorder';
import {
  prepareCollaboratorReplyRequest,
  messageContainsUnreadableImage,
  resolveRequestImageHydrationMessageIds,
  type RequestImageUnderstandingResult
} from './requestPreparation';
import type { RequestMessage } from './requestMessage';
import { applyRegexRules } from '../regexProcessor';
import { providerRuntimeSupportsImageInput } from '../provider-runtime';
import {
  requestAssistantReply,
  type AssistantReply,
  type AssistantReplyProgress
} from '../chatApi';
import { promoteInlineThinkingTags } from '../inlineThinkingTags';
import type {
  ChatMessage,
  Conversation,
  ConversationTaskState,
  ImageUnderstandingSettings,
  MemoryVectorRetrievalSettings,
  Persona,
  ProviderProfile,
  ToolLedgerEntry
} from '../../types/domain';

function normalizeAssistantOutput<T extends AssistantReply | AssistantReplyProgress>(
  reply: T,
  persona: Persona | null | undefined
): T {
  const promoted = promoteInlineThinkingTags(reply);
  return {
    ...promoted,
    content: applyRegexRules(promoted.content, persona?.advanced.regexRules, 'output'),
    thinkingText: promoted.thinkingText
      ? applyRegexRules(promoted.thinkingText, persona?.advanced.regexRules, 'output')
      : promoted.thinkingText
  };
}

function messageContainsImageMissingModelPayload(message: Pick<RequestMessage, 'attachments'> | undefined): boolean {
  return Boolean(message?.attachments?.some((attachment) =>
    attachment.kind === 'image'
    && !attachment.clearedAt
    && typeof attachment.dataUrl !== 'string'
  ));
}

export async function requestCollaboratorReply(params: {
  api: ProviderProfile;
  providers?: ProviderProfile[];
  globalApi?: ProviderProfile;
  memoryVectorRetrieval?: MemoryVectorRetrievalSettings;
  imageUnderstanding?: ImageUnderstandingSettings;
  persona: Persona | null | undefined;
  personas?: Persona[];
  messages: ChatMessage[];
  semanticRecallEnabled?: boolean;
  semanticRecallConversations?: Conversation[];
  loadSemanticRecallConversations?: (conversationIds: string[]) => Promise<Conversation[]>;
  activeConversationId?: string | null;
  toolLedger?: ToolLedgerEntry[];
  toolContext?: AssistantToolContext;
  currentTask?: ConversationTaskState | null;
  preferredOpenAiToolHistoryMode?: OpenAiToolHistoryMode;
  nickname?: string;
  signal?: AbortSignal;
  onProgress?: (reply: AssistantReplyProgress) => void;
  onAcpToolCall?: (call: { id: string; name: string; argumentsObject: Record<string, unknown> }) => Promise<{ isError: boolean; text: string }>;
  onAudit?: (audit: AssistantRequestAudit) => void;
  onImageUnderstandingResults?: (results: RequestImageUnderstandingResult[]) => void;
}): Promise<AssistantReply> {
  const {
    api,
    providers,
    globalApi,
    memoryVectorRetrieval,
    imageUnderstanding,
    persona,
    personas,
    messages,
    semanticRecallEnabled,
    semanticRecallConversations,
    loadSemanticRecallConversations,
    activeConversationId,
    toolLedger,
    toolContext,
    currentTask,
    preferredOpenAiToolHistoryMode,
    nickname,
    signal,
    onProgress,
    onAcpToolCall,
    onAudit,
    onImageUnderstandingResults
  } = params;
  const prepared = await prepareCollaboratorReplyRequest({
    api,
    providers,
    globalApi,
    memoryVectorRetrieval,
    imageUnderstanding,
    persona,
    personas,
    messages,
    semanticRecallEnabled,
    semanticRecallConversations,
    loadSemanticRecallConversations,
    activeConversationId,
    toolLedger,
    toolContext,
    currentTask,
    nickname,
    signal
  });
  onAudit?.(prepared.audit);
  if (prepared.imageUnderstandingResults.length > 0) {
    onImageUnderstandingResults?.(prepared.imageUnderstandingResults);
  }
  if (api.agentTransport === 'devin-acp') {
    // Text extracted by a configured vision provider may accompany the turn;
    // never forward an unreadable image or file to this text-only ACP transport.
    const unreadableAttachment = prepared.conversation.some((message) =>
      message.attachments?.some((attachment) =>
        !attachment.clearedAt && !attachment.textContent?.trim()
      )
    );
    if (unreadableAttachment) {
      throw new Error('Devin ACP 只能接收文字。请在本连接的图片理解设置中选择支持看图的 API。');
    }
    const prompt = prepared.context.segments.flatMap((segment) =>
      segment.messages.map((message) => {
        if (typeof message.content !== 'string') {
          throw new Error('Devin ACP bridge cannot serialize non-text request content');
        }
        return '[' + message.role + ']\n' + message.content;
      })
    ).join('\n\n');
    const conversationUserMessages = prepared.context.segments
      .filter((segment) => segment.kind === 'conversation')
      .flatMap((segment) => segment.messages)
      .filter((message) => message.role === 'user');
    const latestUser = conversationUserMessages[conversationUserMessages.length - 1]?.content;
    recordRequestDebug(prepared.audit, { phase: 'prepared' });
    try {
      const reply = await requestDevinAcpReply({
        prompt: typeof latestUser === 'string' && latestUser.trim() ? latestUser : prompt,
        initialContext: prompt,
        modelId: persona?.advanced.modelOverride?.trim()
          || (api.model !== 'Devin ACP' ? api.model.trim() : '')
          || undefined,
        conversationId: activeConversationId
          ? `${activeConversationId}::${persona?.id ?? 'default'}`
          : undefined,
        signal,
        tools: resolveAssistantToolRequestTools(toolContext).tools,
        onToolCall: onAcpToolCall,
        onProgress: onProgress
          ? (partial) => onProgress(normalizeAssistantOutput(partial, persona))
          : undefined
      });
      recordRequestDebug(prepared.audit, { phase: 'completed', reply });
      return normalizeAssistantOutput(reply, persona);
    } catch (error) {
      recordRequestDebug(prepared.audit, { phase: 'failed', error });
      throw error;
    }
  }
  const supportsImageInput = providerRuntimeSupportsImageInput(api, persona?.advanced);
  const conversation = prepared.conversation;
  const requestImageMessageIds = resolveRequestImageHydrationMessageIds(conversation);
  const requestImageMessages = conversation.filter((message) => requestImageMessageIds.has(message.id));
  if (supportsImageInput && requestImageMessages.some(messageContainsImageMissingModelPayload)) {
    throw new Error('图片附件没有成功进入模型请求；这轮不会只把文件名发给模型硬猜。请重试发送图片，或检查本地附件存储。');
  }
  if (!supportsImageInput && requestImageMessages.some(messageContainsUnreadableImage)) {
    throw new Error('当前模型没有直接图片能力，也没有可用的看图/OCR 模型；请切换支持图片的聊天模型，或在设置里配置看图/OCR 路线后再发送。');
  }

  recordRequestDebug(prepared.audit, { phase: 'prepared' });

  let reply: AssistantReply;
  let builtRequestForDebug: ProviderHttpRequest | null = null;
  try {
    reply = await requestAssistantReply({
      api,
      context: prepared.context,
      sessionId: activeConversationId ?? undefined,
      advanced: prepared.advanced,
      preferredOpenAiToolHistoryMode,
      onBuiltRequest: (request) => {
        builtRequestForDebug = request;
      },
      signal,
      onProgress: onProgress
        ? (partialReply) => onProgress(normalizeAssistantOutput(partialReply, persona))
        : undefined
    });
  } catch (error) {
    recordRequestDebug(prepared.audit, { phase: 'failed', error, builtRequest: builtRequestForDebug });
    throw error;
  }

  recordRequestDebug(prepared.audit, {
    phase: 'completed',
    reply,
    builtRequest: builtRequestForDebug
  });

  return normalizeAssistantOutput(reply, persona);
}
