import type { AssistantSemanticRecallContextCandidate } from './requestSemanticRecallPlan';
import {
  planPassiveRecall,
  type PassiveRecallCandidate,
  type PassiveRecallDelivery,
  type PassiveRecallEvidence,
  type PassiveRecallPlan
} from './requestRecallGate';

export type OneMemoryRecallRequestResult = {
  plan: PassiveRecallPlan;
  semanticCandidates: AssistantSemanticRecallContextCandidate[];
  exactMemoryLines: string[];
};

function normalizedConfidence(score: number | null) {
  return typeof score === 'number' && Number.isFinite(score)
    ? Math.min(1, Math.max(0, score))
    : 0;
}

/**
 * Adapter between Polaris' existing source-aware recall and the one-item gate.
 * Recent tails and voice anchors are deliberately not treated as matches:
 * recency on its own is not proof that a memory is relevant to this utterance.
 */
export async function planOneMemoryRequestRecall(args: {
  currentScopeId: string;
  candidates: AssistantSemanticRecallContextCandidate[];
  exact?: PassiveRecallEvidence[];
  recentContext: string;
  deliveries?: PassiveRecallDelivery[];
  now: number;
  reviewGrayZone?: (candidate: PassiveRecallCandidate) => boolean | Promise<boolean>;
}): Promise<OneMemoryRecallRequestResult> {
  const eligible = args.candidates.filter((candidate) =>
    (candidate.kind === 'matched_context' || candidate.kind === 'vector_match')
    && candidate.sourceConversationId
    && candidate.sourceMessageIds.length > 0
    && candidate.text.trim()
  );
  const canonicalSourceId = (candidate: AssistantSemanticRecallContextCandidate) =>
    `${candidate.sourceConversationId}:${[...candidate.sourceMessageIds].sort().join(',')}`;
  const asEvidence = (candidate: AssistantSemanticRecallContextCandidate): PassiveRecallEvidence => ({
    id: canonicalSourceId(candidate),
    scopeId: args.currentScopeId,
    text: candidate.text,
    sourceRef: canonicalSourceId(candidate),
    sourceConversationId: candidate.sourceConversationId,
    sourceMessageIds: candidate.sourceMessageIds,
    confidence: normalizedConfidence(candidate.score)
  });
  const plan = await planPassiveRecall({
    currentScopeId: args.currentScopeId,
    lexical: eligible.filter((candidate) => candidate.kind === 'matched_context').map(asEvidence),
    semantic: eligible.filter((candidate) => candidate.kind === 'vector_match').map(asEvidence),
    exact: args.exact,
    recentContext: args.recentContext,
    deliveries: args.deliveries,
    now: args.now,
    reviewGrayZone: args.reviewGrayZone
  });

  const selected = plan.selected;
  if (!selected) return { plan, semanticCandidates: [], exactMemoryLines: [] };
  return {
    plan,
    semanticCandidates: eligible.filter((candidate) => canonicalSourceId(candidate) === selected.id).slice(0, 1),
    exactMemoryLines: selected.lanes.includes('exact') && !eligible.some((candidate) => canonicalSourceId(candidate) === selected.id)
      ? [selected.text]
      : []
  };
}
