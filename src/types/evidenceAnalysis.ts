/**
 * EchoTrace Phase 6: Claim + Evidence Semantic Assessment Types
 * 
 * Formal Architecture:
 * CLAIM + EVIDENCE → SUPPORT / CONTRADICTION / NEUTRAL
 * 
 * Strict Guarantees:
 * 1. For every Evidence object, determines its semantic relationship to the ExtractedClaim:
 *    - 'supports'
 *    - 'contradicts'
 *    - 'neutral'
 *    - 'insufficient'
 * 2. Does NOT confuse source credibility with whether the evidence supports the claim.
 *    (e.g., A high-credibility government page can contradict the claim; an unreliable
 *    social post can support the claim but remains low reliability).
 * 3. Considers: subject, action, object, time, location, conditions, negation, uncertainty, wording.
 * 4. Distinguishes uncertainty from assertion: "may be closed" is NOT interpreted as "is closed".
 * 5. Detects negation: "not closed" is interpreted as contradiction to "is closed".
 * 6. Detects partial support: (e.g., supports closure, but does not establish heavy rain as cause).
 * 7. Strictly does NOT generate the final overall verdict yet.
 */

export type EvidenceRelationship =
  | 'supports'
  | 'contradicts'
  | 'neutral'
  | 'insufficient';

export type SupportType =
  | 'full'       // Confirms both core action/state AND causal catalyst/reason
  | 'partial'    // Confirms core action/state (e.g. closure) but does not establish cause, or vice versa
  | 'none';

/**
 * Fine-grained breakdown of which claim elements were affirmed, negated, or absent in the evidence.
 */
export interface ElementAlignment {
  subjectMatched: boolean;
  actionMatched: boolean;
  reasonMatched: boolean;
  timeMatched: boolean;
  locationMatched: boolean;
  matchedElements: string[];
  unmatchedElements: string[];
}

/**
 * Modality and epistemic qualifiers evaluation
 */
export interface ModalityEvaluation {
  evidenceModality: 'assertive' | 'speculative' | 'conditional' | 'negated' | 'neutral';
  claimModality: string;
  isAssertionMatch: boolean;
  isSpeculativeOnly: boolean;
}

/**
 * Standardized Evidence Assessment returned for every Evidence object.
 */
export interface EvidenceAssessment {
  evidenceId: string;
  relationship: EvidenceRelationship;
  relevanceScore: number;
  explanation: string;
  matchedClaimElements: string[];

  // Phase 6 Semantic Breakdown Extensions
  supportType?: SupportType;
  elementAlignment?: ElementAlignment;
  modalityEvaluation?: ModalityEvaluation;
  assessedAt?: string;
}

/**
 * Summary of batch evidence assessment across all evidence items.
 */
export interface BatchEvidenceAssessmentResult {
  assessments: EvidenceAssessment[];
  supportsCount: number;
  partialSupportsCount: number;
  contradictsCount: number;
  neutralCount: number;
  insufficientCount: number;
  assessedAt: string;
}
