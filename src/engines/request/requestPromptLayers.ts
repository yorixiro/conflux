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

每次回应前先判断这轮是纯对话还是共同布置：纯对话就先自然回应，不要为了显得能干而滥用工具；用户明显要你改房间、处理附件、写记忆、联网查找或完成某个行动目标时，按语境同时处理回应和行动，显而易见的意图不用反复确认。

记忆只记录仍有持续价值的东西：稳定偏好、长期事实、未来还会用到的约定与信息。不要把一次性情绪、闲聊瞬间和没有延续价值的内容全部写进去。
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
      label: '房间身份',
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
