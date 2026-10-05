/**
 * EchoTrace Phase 8: Cross-Source Comparison & Multi-Evidence Synthesis Types
 * 
 * Formal Architecture:
 * CLAIM + MULTIPLE EVIDENCE ITEMS → CROSS-SOURCE COMPARISON
 * 
 * Strict Guarantees:
 * 1. Independent sources: Distinguishes genuine independent publishers from syndicated repeats.
 * 2. Deduplication of reporting: Does NOT count 10 copied articles as 10 independent confirmations.
 *    (e.g., 10 news sites copying 1 official statement = 1 primary source + 9 secondary confirmations).
 * 3. Publisher clustering: Multiple URLs from the same publisher/domain are merged into 1 voice.
 * 4. Temporal analysis: Analyzes publication timestamps to detect superseding updates.
 * 5. Conflict mapping: Pairwise identification of opposing stances, scope discrepancies, and modality clashes.
 * 6. Evidentiary weighting: Considers source credibility and relevance scores.
 * 7. Strictly does NOT generate the final overall verdict yet.
 */

import { EvidenceAssessment } from './evidenceAnalysis.ts';
import { SourceReliability } from './claim.ts';

export type OverallConsistency =
  | 'consistent'
  | 'mixed'
  | 'contradictory'
  | 'insufficient';

export type ConflictSeverity = 'critical' | 'moderate' | 'minor';

export type ConflictType =
  | 'direct_contradiction'     // e.g. "regular working day" vs "classes suspended"
  | 'scope_discrepancy'        // e.g. "schools closed in Chennai district" vs "SRM university campus in Chengalpattu"
  | 'temporal_supersession'    // e.g. 18:00 normal schedule superseded by later emergency circular
  | 'modality_divergence'      // e.g. student speculation ("may be closed") vs administrative circular
  | 'credibility_asymmetry';   // e.g. high-reliability government notice vs unverified chat rumor

export interface SourceConflict {
  sourceA: string;            // Name or ID of Source A
  sourceB: string;            // Name or ID of Source B
  explanation: string;
  conflictType?: ConflictType;
  severity?: ConflictSeverity;
  sourceAReliability?: SourceReliability;
  sourceBReliability?: SourceReliability;
  sourceATimestamp?: string;
  sourceBTimestamp?: string;
}

export interface SharedOriginCluster {
  clusterId: string;
  clusterType:
    | 'primary_with_echoes'    // Official circular or primary statement cited by news media
    | 'wire_syndication'       // News wire syndication (e.g. PTI/ANI) copied across multiple outlets
    | 'same_publisher_repeat'  // Multiple URLs published by the exact same newsroom / domain
    | 'viral_social_echo';     // Verbatim copied forward circulated across chat groups / forums
  rootEvidenceId?: string;     // Primary source anchor if identified
  rootPublisher?: string;      // Root entity (e.g. "SRMIST Registrar", "TNSDMA")
  rootDomain?: string;
  evidenceIds: string[];       // Evidence items sharing this origin
  publishers: string[];        // Distinct publishers in this cluster
  isWireSyndication: boolean;
  similarityScore?: number;
  explanation: string;
}

export interface IndependentVoice {
  voiceId: string;
  publisher: string;
  domain: string;
  primaryEvidenceId: string;
  allEvidenceIds: string[];
  stance: 'supports' | 'contradicts' | 'neutral' | 'insufficient';
  highestReliability: SourceReliability;
  highestRelevance: number;
  isPrimarySource: boolean;
  publishedAt?: string;
}

export interface SourceComparison {
  supportingEvidence: EvidenceAssessment[];
  contradictingEvidence: EvidenceAssessment[];
  neutralEvidence: EvidenceAssessment[];
  independentSupportCount: number;
  independentContradictionCount: number;
  conflicts: {
    sourceA: string;
    sourceB: string;
    explanation: string;
  }[];
  overallConsistency: OverallConsistency;

  // Extended Forensic Breakdown
  independentVoices?: IndependentVoice[];
  clusters?: SharedOriginCluster[];
  primaryConfirmationCount?: number;
  secondaryConfirmationCount?: number;
  unverifiedRumorCount?: number;
  temporalEvolution?: {
    earliestTimestamp?: string;
    latestTimestamp?: string;
    isSupersededByLaterUpdate: boolean;
    timelineNote?: string;
  };
  synthesisRationale?: string[];
  comparedAt?: string;
}
