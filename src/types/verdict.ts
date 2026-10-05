/**
 * EchoTrace Phase 10: Final Verdict Engine Types
 * 
 * Formal Architecture:
 * ALL PREVIOUS EVIDENCE → FINAL VERDICT
 * 
 * Strict Guarantees:
 * 1. The verdict is synthesized from all previous pipeline stages:
 *    - ExtractedClaim (Phase 2)
 *    - Evidence & Fetch Status (Phases 3-5)
 *    - EvidenceAssessment & Element Alignment (Phase 6)
 *    - Source Credibility & Reliability Scores (Phase 7)
 *    - Cross-Source Comparison & Conflict Deduplication (Phase 8)
 *    - Evidence Graph & Provenance Topology (Phase 9)
 * 2. Possible final states:
 *    - 'supported'
 *    - 'contradicted'
 *    - 'mixed'
 *    - 'insufficient_evidence'
 *    - 'unverified'
 * 3. Epistemic Humility & Evidence-Bounded Verification:
 *    - Strictly does NOT claim absolute truth (e.g., NEVER "100% TRUE" or "100% FALSE").
 *    - Uses measured phrases:
 *      - "Supported by available evidence"
 *      - "Contradicted by authoritative evidence"
 *      - "Evidence is mixed"
 *      - "Insufficient evidence to determine"
 * 4. Confidence Representation:
 *    - Confidence represents confidence in the assessment based on available evidence,
 *      NOT mathematical certainty that the claim is true in the physical world.
 * 5. Explainability:
 *    - Explanation directly references actual evidence excerpts and source citations.
 *    - Exposes disagreements when sources conflict.
 *    - Identifies key factors with directional impact ('positive' | 'negative' | 'neutral').
 *    - States explicit investigative and epistemic limitations.
 */

import { ExtractedClaim } from './claimExtraction.ts';
import { Evidence } from './evidence.ts';
import { EvidenceAssessment } from './evidenceAnalysis.ts';
import { CredibilityAssessment } from './credibility.ts';
import { SourceComparison } from './sourceComparison.ts';
import { Source, VariantNode, GraphEdge } from './claim.ts';
import { NormalizedSource } from './sourceCollection.ts';

export type VerdictStatus =
  | 'supported'
  | 'contradicted'
  | 'mixed'
  | 'insufficient_evidence'
  | 'unverified';

export type VerdictImpact = 'positive' | 'negative' | 'neutral';

export interface VerdictKeyFactor {
  name: string;
  impact: VerdictImpact;
  explanation: string;
}

/**
 * Standardized EchoTrace Final Verdict object
 */
export type Verdict = {
  status:
    | 'supported'
    | 'contradicted'
    | 'mixed'
    | 'insufficient_evidence'
    | 'unverified';

  confidence: number;

  explanation: string;

  supportingEvidenceIds: string[];

  contradictingEvidenceIds: string[];

  keyFactors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    explanation: string;
  }[];

  limitations: string[];

  generatedAt: string;
};

/**
 * Input container for Verdict Engine evaluation
 */
export interface VerdictEngineInput {
  claim: ExtractedClaim | string;
  evidenceList?: Evidence[];
  assessments?: EvidenceAssessment[];
  credibilityAssessments?: CredibilityAssessment[] | Map<string, CredibilityAssessment>;
  sourceComparison?: SourceComparison;
  evidenceGraph?: { nodes: VariantNode[]; edges: GraphEdge[] };
  sources?: (NormalizedSource | Source)[];
  options?: VerdictEngineOptions;
}

/**
 * Optional evaluation tuning parameters
 */
export interface VerdictEngineOptions {
  minimumCorroboratingVoices?: number;
  strictPrimarySourceRequired?: boolean;
  allowPartialSupportVerdict?: boolean;
}
