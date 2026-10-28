import type { AssistantSemanticRecallContextCandidate } from './requestSemanticRecallPlan';
import { tokenizeMemoryRecallTerms } from '../memoryRecallTerms';
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

const NEGATIVE_PREFERENCE = /不再?(?:喜欢|想|爱|要|吃)|不喜欢|不想|不要|讨厌|拒绝/;
const TEMPORAL_CUE = /今天|昨天|前天|明天|上周|下周|上个月|下个月|去年|今年|现在|最近/g;

function conflictingRecallCues(query: string, text: string): boolean {
  if (NEGATIVE_PREFERENCE.test(query) !== NEGATIVE_PREFERENCE.test(text)) return true;
  const requestedTime = new Set(query.match(TEMPORAL_CUE) ?? []);
  const sourceTime = new Set(text.match(TEMPORAL_CUE) ?? []);
  return requestedTime.size > 0 && sourceTime.size > 0
    && ![...requestedTime].some((cue) => sourceTime.has(cue));
}

/**
 * Legacy lexical scores include large anchor bonuses and are ranking scores,
 * not probabilities. Use query coverage to calibrate the opt-in gate instead.
 */
function lexicalRecallConfidence(score: number | null, query: string, text: string): number {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return 0;
  const queryTerms = tokenizeMemoryRecallTerms(query);
  if (!queryTerms.length) return 0;
  const sourceTerms = new Set(tokenizeMemoryRecallTerms(text));
  const matches = queryTerms.filter((term) => sourceTerms.has(term)).length;
  if (!matches) return 0;

  const coverage = matches / queryTerms.length;
  // One vague shared anchor cannot be promoted to a strong autobiographical fact.
  const strength = matches >= 3 ? 0.96 : matches === 2 ? 0.76 : 0.65;
  return Math.min(0.96, coverage * strength);
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
    confidence: conflictingRecallCues(args.recentContext, candidate.text)
      ? 0
      : candidate.kind === 'matched_context'
        ? lexicalRecallConfidence(candidate.score, args.recentContext, candidate.text)
        : normalizedConfidence(candidate.score)
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
