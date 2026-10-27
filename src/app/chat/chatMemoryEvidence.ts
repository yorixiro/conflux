import type { AssistantRequestAudit } from '../../engines/request/requestAudit';
import type { ChatMemoryEvidence, ChatMemoryEvidenceItem } from '../../types/domain';
import { buildPassiveRecallReceipt } from '../../engines/request/requestRecallReceipts';

const MEMORY_EVIDENCE_EXCERPT_CHARS = 260;

function truncateEvidenceText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MEMORY_EVIDENCE_EXCERPT_CHARS) return normalized;
  return `${normalized.slice(0, MEMORY_EVIDENCE_EXCERPT_CHARS - 1).trim()}...`;
}

export function buildChatMemoryEvidenceFromAudit(
  audit: AssistantRequestAudit | null | undefined,
  deliveredAt = Date.now()
): ChatMemoryEvidence | undefined {
  // The legacy ranking list is not the injection list in one-memory mode.
  if (audit?.oneMemoryRecallPlan) {
    const receipt = buildPassiveRecallReceipt(audit, deliveredAt);
    const candidate = receipt && (audit.semanticRecallContextCandidates ?? []).find((item) =>
      item.sourceConversationId === receipt.sourceConversationId
      && [...item.sourceMessageIds].sort().join(',') === [...(receipt.sourceMessageIds ?? [])].sort().join(',')
    );
    const items: ChatMemoryEvidenceItem[] = candidate ? [{
      id: candidate.id,
      kind: candidate.kind,
      label: candidate.label,
      sourceConversationId: candidate.sourceConversationId,
      sourceMessageIds: candidate.sourceMessageIds,
      textExcerpt: truncateEvidenceText(candidate.text),
      estimatedTokens: Math.ceil(candidate.text.length / 4),
      charCount: candidate.text.length,
      score: candidate.score
    }] : [];

    return {
      requestId: audit.requestId,
      strategy: audit.semanticRecallPlan.strategy,
      status: audit.semanticRecallPlan.status,
      items,
      ...(receipt ? { passiveRecallReceipt: receipt } : {}),
      passiveRecallReview: {
        version: 1,
        evaluatedAt: deliveredAt,
        result: receipt ? 'injected' : audit.oneMemoryRecallPlan.selected ? 'not_injected' : 'no_match',
        decisions: audit.oneMemoryRecallPlan.decisions.slice(0, 12).map((decision) => ({ ...decision }))
      }
    };
  }
  if (!audit?.semanticRecallPlan.selectedCandidates.length) return undefined;

  const contextCandidatesById = new Map(
    (audit.semanticRecallContextCandidates ?? []).map((candidate) => [candidate.id, candidate])
  );
  const items: ChatMemoryEvidenceItem[] = audit.semanticRecallPlan.selectedCandidates.flatMap((candidate) => {
    if (candidate.kind === 'recent_tail') return [];
    const contextCandidate = contextCandidatesById.get(candidate.id);
    const textExcerpt = truncateEvidenceText(contextCandidate?.text ?? '');
    if (!textExcerpt) return [];

    return [{
      id: candidate.id,
      kind: candidate.kind,
      label: candidate.label,
      sourceConversationId: candidate.sourceConversationId,
      sourceMessageIds: candidate.sourceMessageIds,
      textExcerpt,
      estimatedTokens: candidate.estimatedTokens,
      charCount: candidate.charCount,
      score: candidate.score,
      ...(candidate.memoryChunkKind ? { memoryChunkKind: candidate.memoryChunkKind } : {})
    }];
  });

  if (!items.length) return undefined;

  return {
    requestId: audit.requestId,
    strategy: audit.semanticRecallPlan.strategy,
    status: audit.semanticRecallPlan.status,
    items
  };
}
