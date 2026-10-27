import type { ChatMemoryEvidence, Conversation } from '../../types/domain';
import type { AssistantRequestAudit } from './requestAudit';
import type { PassiveRecallDelivery } from './requestRecallGate';

type PassiveRecallReceipt = NonNullable<ChatMemoryEvidence['passiveRecallReceipt']>;

/** A planning decision alone is not proof that memory entered the provider context. */
export function buildPassiveRecallReceipt(
  audit: AssistantRequestAudit | null | undefined,
  deliveredAt: number
): PassiveRecallReceipt | null {
  const candidate = audit?.oneMemoryRecallPlan?.selected;
  if (!candidate || !audit?.collaboratorId || candidate.scopeId !== audit.collaboratorId
    || !candidate.id.trim() || !candidate.sourceRef.trim() || !candidate.text.trim()
    || !Number.isFinite(deliveredAt) || deliveredAt <= 0) return null;

  const injected = audit.context.segments.some((segment) =>
    (segment.kind === 'memory' || segment.kind === 'semantic_recall')
    && segment.messages.some((message) => typeof message.content === 'string'
      && message.content.includes(candidate.text.trim()))
  );
  if (!injected) return null;

  return {
    version: 1,
    id: candidate.id,
    scopeId: candidate.scopeId,
    sourceRef: candidate.sourceRef,
    ...(candidate.sourceConversationId ? { sourceConversationId: candidate.sourceConversationId } : {}),
    ...(candidate.sourceMessageIds?.length ? { sourceMessageIds: [...candidate.sourceMessageIds] } : {}),
    deliveredAt
  };
}

/** Receipts live on committed assistant messages, so deletion and backup follow LocalData chat lifecycle. */
export function collectPassiveRecallDeliveries(args: {
  conversations: Pick<Conversation, 'id' | 'collaboratorId' | 'messages'>[];
  currentScopeId: string;
  /** The live conversation catalog, used to ignore receipts referring to deleted source conversations. */
  existingConversationIds?: ReadonlySet<string>;
}): PassiveRecallDelivery[] {
  if (!args.currentScopeId.trim()) return [];
  const latestById = new Map<string, number>();
  const seenConversations = new Set<string>();
  for (const conversation of args.conversations) {
    if (seenConversations.has(conversation.id) || conversation.collaboratorId !== args.currentScopeId) continue;
    seenConversations.add(conversation.id);
    for (const message of conversation.messages) {
      if (message.role !== 'assistant' || message.requestRole === 'system') continue;
      const receipt = message.memoryEvidence?.passiveRecallReceipt;
      if (receipt?.version !== 1 || receipt.scopeId !== args.currentScopeId
        || !receipt.id?.trim() || !receipt.sourceRef?.trim()
        || !Number.isFinite(receipt.deliveredAt) || receipt.deliveredAt <= 0) continue;
      if (receipt.sourceConversationId && args.existingConversationIds
        && !args.existingConversationIds.has(receipt.sourceConversationId)) continue;
      latestById.set(receipt.id, Math.max(latestById.get(receipt.id) ?? 0, receipt.deliveredAt));
    }
  }
  return [...latestById].map(([id, deliveredAt]) => ({ id, deliveredAt }));
}
