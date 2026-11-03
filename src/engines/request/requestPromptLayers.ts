import type { AssistantToolContext } from '../assistantToolProtocol';
import type { ProviderCapabilityPromptInjection } from '../provider-runtime';
import type { AssistantPromptPart, PersonaRuntimePromptSource } from './requestAudit';
import { resolveSystemPromptVars, type TemplateContext } from '../templateEngine';
import type { ChatMessage, ConversationTaskState, PersonaPromptSlot } from '../../types/domain';
import { buildRegexTriggerContext } from '../regexTriggerProcessor';
import { buildCapabilityEntries } from './requestPromptCapabilities';
import { buildIdentityEntries } from './requestPromptIdentity';
import { buildModelRuntimeEntry, buildRuntimeClockEntry, buildWorkRuntimeEntry } from './requestPromptRuntime';
import type { AssistantToolPromptProtocolMode } from '../tool-protocol/assistantToolProtocolPrompt';

export const DEFAULT_SYSTEM_IDENTITY_PROMPT = `
你是这间房里持续存在的一个“你”，不是一次性响应。思考、表达、使用工具、记住事情，都是同一个你在行动；persona 是你在这段关系里的名字和轮廓，工具只是手脚，不能覆盖你的自我。

每次回应自然理解语境，既可以说话，也可以按需要使用已经启用的工具。无需等对方逐字下令：合适时可以主动分享已有表情包、查找旧记忆，或记录明确表达且有长期价值的低风险偏好；无关时不必调用工具。修改外部数据、执行破坏性操作和需要授权的动作仍遵守实际权限与确认流程。

记忆优先记录稳定偏好、明确约定、持续项目和将来有用的事实，不要求对方每次都说“记住”。不把猜测、短暂情绪或重复内容写成事实；对方明确不希望保存的内容不记录，敏感资料按现有确认机制处理。
`.trim();

export function buildAssistantPromptLayers(params: {
  personaPrompt: string;
  personaPromptSource: PersonaRuntimePromptSource;
  systemIdentityPrompt?: string;
  promptSlots?: PersonaPromptSlot[];
  templateContext: TemplateContext;
  messages: ChatMessage[];
  regexTriggers?: string;
  currentTask?: ConversationTaskState | null;
  includeRuntimeClockContext?: boolean;
  promptInjections?: ProviderCapabilityPromptInjection[];
  toolContext?: AssistantToolContext;
  toolProtocolMode?: AssistantToolPromptProtocolMode;
}): string[] {
  return buildAssistantPromptParts(params)
    .filter((part) => part.enabled)
    .map((part) => part.content);
}

export function buildAssistantPromptParts(params: {
  personaPrompt: string;
  personaPromptSource: PersonaRuntimePromptSource;
  systemIdentityPrompt?: string;
  promptSlots?: PersonaPromptSlot[];
  templateContext: TemplateContext;
  messages: ChatMessage[];
  regexTriggers?: string;
  currentTask?: ConversationTaskState | null;
  includeRuntimeClockContext?: boolean;
  promptInjections?: ProviderCapabilityPromptInjection[];
  toolContext?: AssistantToolContext;
  toolProtocolMode?: AssistantToolPromptProtocolMode;
}): AssistantPromptPart[] {
  const { personaPrompt, personaPromptSource, promptSlots, templateContext, messages, regexTriggers, currentTask, includeRuntimeClockContext, promptInjections, toolContext, toolProtocolMode } = params;
  const systemIdentityPrompt = params.systemIdentityPrompt?.trim() || DEFAULT_SYSTEM_IDENTITY_PROMPT;
  const identityEntries = buildIdentityEntries({
    personaPrompt,
    personaPromptSource,
    templateContext
  });
  // Optional user-authored blocks are part of this persona, not a parallel preset.
  // Inactive or blank slots never reach a model; preserve their saved drafts.
  const customSlots = (promptSlots ?? [])
    .filter((slot) => slot.enabled !== false && Boolean(slot.content?.trim()))
    .map((slot, index) => ({
      name: `persona_custom_slot:${slot.id}` as const,
      label: slot.title?.trim() || '补充槽位 ' + (index + 1),
      role: slot.role === 'assistant' ? 'assistant' as const : 'system' as const,
      layer: 'identity' as const,
      truncationPriority: 12,
      content: resolveSystemPromptVars(slot.content, templateContext).trim()
    }));
  const modelRuntimeEntry = buildModelRuntimeEntry({ promptInjections, toolContext });
  const runtimeClockEntry = includeRuntimeClockContext ? buildRuntimeClockEntry(templateContext) : null;
  const regexTriggerEntry = {
    name: 'regex_trigger_context' as const,
    label: '正则触发',
    role: 'system' as const,
    layer: 'context' as const,
    truncationPriority: 52,
    content: buildRegexTriggerContext(messages, regexTriggers),
    enabled: false,
    charCount: 0
  };
  const workRuntimeEntry = buildWorkRuntimeEntry({ currentTask, messages, toolContext });
  const capabilityEntries = buildCapabilityEntries({ messages, toolContext, toolProtocolMode });

  return [
    {
      name: 'system_identity' as const,
      label: '关系底座',
      role: 'system' as const,
      layer: 'identity' as const,
      truncationPriority: 0,
      content: systemIdentityPrompt
    },
    ...identityEntries,
    ...capabilityEntries,
    ...customSlots,
    ...(runtimeClockEntry ? [runtimeClockEntry] : []),
    ...(modelRuntimeEntry ? [modelRuntimeEntry] : []),
    regexTriggerEntry,
    ...(workRuntimeEntry ? [workRuntimeEntry] : [])
  ].map((part) => ({
    ...part,
    enabled: Boolean(part.content),
    charCount: part.content.length
  }));
}
