/**
 * Pure, opt-in planning for a one-memory passive recall lane.
 *
 * This does not create a second memory store or write delivery history. The
 * caller supplies scoped, ranked evidence and must record a delivery only
 * after the request actually includes it.
 */
export type RecallLane = 'semantic' | 'lexical' | 'exact';

export type PassiveRecallEvidence = {
  id: string;
  scopeId: string;
  text: string;
  /** Durable reference to the original message, document, or worldbook entry. */
  sourceRef: string;
  sourceConversationId?: string | null;
  sourceMessageIds?: string[];
  /** Normalized relevance, where 1 means an especially strong match. */
  confidence: number;
};

export type PassiveRecallDelivery = {
  id: string;
  deliveredAt: number;
};

export type PassiveRecallCandidate = PassiveRecallEvidence & {
  lanes: RecallLane[];
  fusedScore: number;
  bestConfidence: number;
};

export type PassiveRecallDecision = {
  id: string;
  status: 'selected' | 'blocked_scope' | 'blocked_context' | 'blocked_cooldown' | 'blocked_relevance' | 'blocked_review';
};

export type PassiveRecallPlan = {
  selected: PassiveRecallCandidate | null;
  decisions: PassiveRecallDecision[];
};

export type PassiveRecallPlanInput = {
  currentScopeId: string;
  semantic?: PassiveRecallEvidence[];
  lexical?: PassiveRecallEvidence[];
  exact?: PassiveRecallEvidence[];
  recentContext?: string;
  deliveries?: PassiveRecallDelivery[];
  now: number;
  cooldownMs?: number;
  /** A gray-zone match cannot pass without an explicit second opinion. */
  reviewGrayZone?: (candidate: PassiveRecallCandidate) => boolean | Promise<boolean>;
};

const RRF_K = 60;
export const PASSIVE_RECALL_DEFAULT_COOLDOWN_MS = 30 * 60_000;
const GRAY_ZONE_MIN_CONFIDENCE = 0.55;
const STRONG_CONFIDENCE = 0.78;

function normalize(text: string) {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function validEvidence(item: PassiveRecallEvidence) {
  return Boolean(item.id.trim() && item.scopeId.trim() && item.text.trim() && item.sourceRef.trim())
    && Number.isFinite(item.confidence)
    && item.confidence >= 0
    && item.confidence <= 1;
}

/** Reciprocal-rank fusion keeps lexical and vector scores on separate scales. */
export function fusePassiveRecallEvidence(input: Pick<PassiveRecallPlanInput, 'semantic' | 'lexical' | 'exact'>) {
  const byId = new Map<string, PassiveRecallCandidate>();
  const lists: Array<[RecallLane, PassiveRecallEvidence[], number]> = [
    ['lexical', input.lexical ?? [], 1],
    ['semantic', input.semantic ?? [], 1],
    ['exact', input.exact ?? [], 1.5]
  ];

  for (const [lane, items, weight] of lists) {
    const seenInLane = new Set<string>();
    for (const [index, evidence] of items.entries()) {
      if (!validEvidence(evidence) || seenInLane.has(evidence.id)) continue;
      seenInLane.add(evidence.id);
      const current = byId.get(evidence.id);
      if (current) {
        // A source may be found in more than one index, but it stays one fact.
        if (current.scopeId !== evidence.scopeId || normalize(current.text) !== normalize(evidence.text)) continue;
        current.lanes.push(lane);
        current.fusedScore += weight / (RRF_K + index + 1);
        current.bestConfidence = Math.max(current.bestConfidence, evidence.confidence);
      } else {
        byId.set(evidence.id, {
          ...evidence,
          lanes: [lane],
          fusedScore: weight / (RRF_K + index + 1),
          bestConfidence: evidence.confidence
        });
      }
    }
  }

  return [...byId.values()].sort((left, right) =>
    right.fusedScore - left.fusedScore
      || right.bestConfidence - left.bestConfidence
      || left.id.localeCompare(right.id)
  );
}

/** Selects zero or one item; no top-k fallback is injected implicitly. */
export async function planPassiveRecall(input: PassiveRecallPlanInput): Promise<PassiveRecallPlan> {
  const decisions: PassiveRecallDecision[] = [];
  if (!Number.isFinite(input.now)) return { selected: null, decisions };
  const recentContext = normalize(input.recentContext ?? '');
  const cooldownMs = Number.isFinite(input.cooldownMs) && (input.cooldownMs ?? 0) >= 0
    ? input.cooldownMs!
    : PASSIVE_RECALL_DEFAULT_COOLDOWN_MS;
  const latestDelivery = new Map<string, number>();
  for (const delivery of input.deliveries ?? []) {
    if (!Number.isFinite(delivery.deliveredAt)) continue;
    latestDelivery.set(delivery.id, Math.max(latestDelivery.get(delivery.id) ?? -Infinity, delivery.deliveredAt));
  }

  for (const candidate of fusePassiveRecallEvidence(input)) {
    const decide = (status: PassiveRecallDecision['status']) => decisions.push({ id: candidate.id, status });
    if (!input.currentScopeId || candidate.scopeId !== input.currentScopeId) {
      decide('blocked_scope');
      continue;
    }
    const candidateText = normalize(candidate.text);
    if (recentContext && candidateText.length >= 8 && recentContext.includes(candidateText)) {
      decide('blocked_context');
      continue;
    }
    const deliveredAt = latestDelivery.get(candidate.id);
    if (deliveredAt !== undefined && input.now >= deliveredAt && input.now - deliveredAt < cooldownMs) {
      decide('blocked_cooldown');
      continue;
    }
    if (!candidate.lanes.includes('exact') && candidate.bestConfidence < GRAY_ZONE_MIN_CONFIDENCE) {
      decide('blocked_relevance');
      continue;
    }
    if (!candidate.lanes.includes('exact') && candidate.bestConfidence < STRONG_CONFIDENCE) {
      let approved = false;
      try {
        approved = (await input.reviewGrayZone?.(candidate)) === true;
      } catch {
        // A failed second-stage evaluator cannot grant memory injection.
      }
      if (!approved) {
        decide('blocked_review');
        continue;
      }
    }
    decide('selected');
    return { selected: candidate, decisions };
  }

  return { selected: null, decisions };
}
