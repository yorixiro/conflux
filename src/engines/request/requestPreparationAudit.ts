import type { AssistantToolContext } from '../assistantToolProtocol';
import { resolveAssistantToolRequestTools } from '../tool-protocol/assistantToolProtocolRequestTools';
import type { ChatMessage, Persona } from '../../types/domain';
import type { AssistantRequestAudit } from './requestAudit';
import type { AssistantRequestContext } from './requestContext';
import type { RequestMessage } from './requestMessage';
import type { CanonicalProviderCapabilitySet } from '../provider-runtime';
import { resolveProviderRuntimeToolChoice } from '../provider-runtime';

export function buildRequestTooling(
  toolContext: AssistantToolContext | undefined,
  providerCapabilities: CanonicalProviderCapabilitySet
): {
  tooling: AssistantRequestAudit['tooling'];
  toolRequest: ReturnType<typeof resolveAssistantToolRequestTools>;
} {
  const rawToolRequest = resolveAssistantToolRequestTools(toolContext);
  const nativeToolsAllowed = providerCapabilities.tools.promptProtocol === 'native-first';
  const toolRequest = {
    tools: nativeToolsAllowed ? rawToolRequest.tools : [],
    toolChoice:
      nativeToolsAllowed
        ? resolveProviderRuntimeToolChoice(rawToolRequest.toolChoice, providerCapabilities)
        : undefined
  };
  return {
    toolRequest,
    tooling: {
      enabled: toolRequest.tools.length > 0,
      toolCount: toolRequest.tools.length,
      toolChoice: toolRequest.tools.length ? toolRequest.toolChoice ?? null : null,
      toolNames: toolRequest.tools.map((tool) => tool.function.name)
    }
  };
}

export function buildRequestAudit(args: {
  assistantName: string;
  providerId: string;
  providerName: string;
  modelId: string;
  requestId: string;
  persona: Persona | null | undefined;
  personaPromptSource: AssistantRequestAudit['personaPromptSource'];
  messageLimit: number;
  tokenBudget: number;
  budgetPlan: AssistantRequestAudit['budgetPlan'];
  budgetUsage: AssistantRequestAudit['budgetUsage'];
  memoryPlan: AssistantRequestAudit['memoryPlan'];
  conversationSummaryPlan: AssistantRequestAudit['conversationSummaryPlan'];
  semanticRecallPlan: AssistantRequestAudit['semanticRecallPlan'];
  oneMemoryRecallPlan?: AssistantRequestAudit['oneMemoryRecallPlan'];
  semanticRecallContextCandidates?: AssistantRequestAudit['semanticRecallContextCandidates'];
  cachePlan: AssistantRequestAudit['cachePlan'];
  contextPlan: AssistantRequestAudit['contextPlan'];
  sourceMessages: ChatMessage[];
  conversation: RequestMessage[];
  promptParts: AssistantRequestAudit['promptParts'];
  truncation: AssistantRequestAudit['truncation'];
  tooling: AssistantRequestAudit['tooling'];
  requestReceipt: AssistantRequestAudit['requestReceipt'];
  context: AssistantRequestContext;
  timings: AssistantRequestAudit['timings'];
}): AssistantRequestAudit {
  const {
    assistantName,
    providerId,
    providerName,
    modelId,
    requestId,
    persona,
    personaPromptSource,
    messageLimit,
    tokenBudget,
    budgetPlan,
    budgetUsage,
    memoryPlan,
    conversationSummaryPlan,
    semanticRecallPlan,
    oneMemoryRecallPlan,
    semanticRecallContextCandidates,
    cachePlan,
    contextPlan,
    sourceMessages,
    conversation,
    promptParts,
    truncation,
    tooling,
    context
  } = args;

  return {
    requestId,
    assistantName,
    providerId,
    providerName,
    modelId,
    collaboratorId: persona?.id ?? null,
    personaPromptSource,
    messageLimit,
    tokenBudget,
    budgetPlan,
    budgetUsage,
    memoryPlan,
    conversationSummaryPlan,
    semanticRecallPlan,
    ...(oneMemoryRecallPlan ? { oneMemoryRecallPlan } : {}),
    semanticRecallContextCandidates,
    cachePlan,
    contextPlan,
    sourceMessageCount: sourceMessages.length,
    droppedToolMessageCount: contextPlan.entries.filter((entry) => entry.status === 'dropped_tool_message').length,
    keptMessageCount: conversation.length,
    trimmedMessageCount: contextPlan.entries.filter((entry) => entry.status !== 'kept' && entry.status !== 'dropped_tool_message').length,
    promptParts,
    truncation,
    tooling,
    requestReceipt: args.requestReceipt,
    context,
    timings: args.timings
  };
}
