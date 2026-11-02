import type { AssistantToolContext } from '../assistantToolProtocol';
import { buildAssistantToolPromptSections } from '../tool-protocol/assistantToolProtocolPrompt';
import type { AssistantPromptPart } from './requestAudit';
import type { ChatMessage } from '../../types/domain';
import type { AssistantToolPromptProtocolMode } from '../tool-protocol/assistantToolProtocolPrompt';
import type { AssistantToolPromptSectionName } from '../tool-protocol/assistantToolProtocolPrompt';

const TOOL_CONTEXT_SECTION_NAMES = new Set<AssistantToolPromptSectionName>([
  'tool_context_capability',
  'ui_context_capability',
  'attachment_context_capability',
  'desktop_local_context_capability',
  'room_context_capability',
  'theme_context_capability'
]);

function buildToolCapabilityEntries(
  toolContext?: AssistantToolContext,
  protocolMode: AssistantToolPromptProtocolMode = 'hybrid'
): Array<Omit<AssistantPromptPart, 'enabled' | 'charCount'>> {
  const sections = buildAssistantToolPromptSections(toolContext, { protocolMode });
  if (!sections.length) return [];

  return sections.map((section) => ({
    name: section.name,
    label: section.label,
    role: 'system',
    layer: TOOL_CONTEXT_SECTION_NAMES.has(section.name) ? 'context' : 'capability',
    truncationPriority:
      section.name === 'tool_capability'
        ? 0
        : section.name === 'tool_catalog_capability' || section.name === 'tool_protocol_capability'
          ? 1
          : section.name === 'workspace_write_capability' || section.name === 'tool_rules_capability'
            ? 2
            : 3,
    content: section.content
  }));
}

export function buildCapabilityEntries(args: {
  messages: ChatMessage[];
  toolContext?: AssistantToolContext;
  toolProtocolMode?: AssistantToolPromptProtocolMode;
}): Array<Omit<AssistantPromptPart, 'enabled' | 'charCount'>> {
  void args.messages;

  return buildToolCapabilityEntries(args.toolContext, args.toolProtocolMode);
}
