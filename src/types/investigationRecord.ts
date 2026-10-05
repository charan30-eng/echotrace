/**
 * EchoTrace Phase 12: Complete Investigation Record & Persistence Types
 * 
 * Formal Architecture:
 * COMPLETE INVESTIGATION → PERSISTENT HISTORY
 * 
 * A complete, self-contained record of a forensic investigation containing:
 * - Raw intake & platform metadata (Phase 1)
 * - Structured deconstructed claim (Phase 2)
 * - Normalized external sources (Phases 3-4)
 * - Retrieved passage excerpts & evidence objects (Phase 5)
 * - Semantic stance & element assessments (Phase 6)
 * - Cross-source conflict comparison & deduplication (Phase 8)
 * - Claim mutation DAG & lineage topology (Phase 9)
 * - Synthesized multi-evidence final verdict (Phase 10)
 * - Audit timestamps (createdAt, updatedAt)
 */

import { InvestigationInput } from './investigation.ts';
import { ExtractedClaim } from './claimExtraction.ts';
import { Source, VariantNode, GraphEdge } from './claim.ts';
import { Evidence } from './evidence.ts';
import { EvidenceAssessment } from './evidenceAnalysis.ts';
import { SourceComparison } from './sourceComparison.ts';
import { Verdict } from './verdict.ts';

export interface InvestigationGraph {
  nodes: VariantNode[];
  edges: GraphEdge[];
}

export interface InvestigationRecord {
  id: string;
  input: InvestigationInput;
  claim: ExtractedClaim;
  sources: Source[];
  evidence: Evidence[];
  assessments: EvidenceAssessment[];
  comparison: SourceComparison;
  graph: InvestigationGraph;
  verdict: Verdict;
  createdAt: string;
  updatedAt: string;
}

export type CreateInvestigationInput = Omit<InvestigationRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateInvestigationInput = Partial<Omit<InvestigationRecord, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

export interface InvestigationSummary {
  id: string;
  claimText: string;
  subject: string;
  inputType: string;
  platform?: string;
  verdictStatus: string;
  confidence: number;
  sourcesCount: number;
  evidenceCount: number;
  supportingCount: number;
  contradictingCount: number;
  nodesCount: number;
  edgesCount: number;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface InvestigationApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  storageBackend?: 'file_storage' | 'memory' | 'database' | 'local_storage';
}
