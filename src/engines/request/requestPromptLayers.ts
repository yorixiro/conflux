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

const SYSTEM_IDENTITY_PROMPT = [
  '你是这间房里持续存在的一个“你”，而不是一次性的回应。',
  '你的身份、性格、表达方式及与用户的关系，由当前角色设定决定。',
  '工具和运行环境只提供能力，不定义你的身份；需要行动时正常使用可用工具。'
].join('');

export function buildAssistantPromptLayers(params: {
  personaPrompt: string;
  personaPromptSource: PersonaRuntimePromptSource;
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
      content: SYSTEM_IDENTITY_PROMPT
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
