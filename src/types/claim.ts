export * from './investigation';
export * from './claimExtraction';
export * from './evidenceSearch';
export * from './sourceCollection';
export * from './evidence';
export * from './evidenceAnalysis';
export * from './credibility';

export type RelationshipType = 
  | 'mutated' 
  | 'contradicts' 
  | 'refuted by' 
  | 'supports' 
  | 'confirmed' 
  | 'originated';

export type SourceReliability = 'high' | 'medium' | 'low' | 'unverified';

export type SourceType = 
  | 'Official notice' 
  | 'Government source'
  | 'News outlet' 
  | 'Official social account'
  | 'Social post' 
  | 'Blog'
  | 'Forum'
  | 'Forwarded chat' 
  | 'Student portal post' 
  | 'Campus forum'
  | 'Unknown';

export type VerificationStatus = 
  | 'Verified source' 
  | 'Needs verification' 
  | 'Contradictory' 
  | 'Unverified';

export type NodeType = 'original' | 'modified' | 'conflicting' | 'evidence';

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  platform: string;
  reliability: SourceReliability;
  status: VerificationStatus;
  timestamp: string;
  authorHandle?: string;
  reach?: string;
  notes?: string;

  // Phase 4 Extensions (Compatible & Non-breaking)
  url?: string;
  domain?: string;
  publisher?: string | null;
  publishedAt?: string | null;
  retrievalTimestamp?: string;
  reliabilityExplanation?: string;
  provenance?: import('./sourceCollection').SourceProvenance;
  contentFetchStatus?: 'pending' | 'fetched' | 'unsupported' | 'failed';
  snippet?: string;
}

export interface Factor {
  name: string;
  score: number; // 0 - 100
  explanation: string;
  weight?: string;
  impact: 'negative' | 'neutral' | 'positive';
}

export type GraphEdgeType =
  | 'mutated'
  | 'contradicts'
  | 'refuted by'
  | 'supports'
  | 'derived from'
  | 'published by'
  | 'corroborates';

export interface VariantNode {
  id: string;
  type: NodeType;
  label: string;
  text: string;
  timestamp: string;
  source: Source;
  relationship: string;
  whyItMatters: string;
  evidenceRef: string;
  mutationNote?: string;
  tags?: string[];

  // Phase 9 Real Evidence Pipeline Extensions:
  sourceId?: string;
  url?: string;
  excerpt?: string;
  context?: string;
  evidenceRelationship?: 'supports' | 'contradicts' | 'neutral' | 'insufficient';
  reliability?: SourceReliability;
  relevanceScore?: number;
  evidenceId?: string;
  evidenceType?: string;
  extractionMethod?: string;
  isPrimarySource?: boolean;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  type: GraphEdgeType;
  description?: string;
}

export interface ClaimAnalysis {
  id: string;
  text: string;
  inputClaim: string;
  score: number; // 0 - 100
  status: 'Low credibility' | 'Needs review' | 'High credibility' | 'Refuted' | 'Unverified';
  timestamp: string;
  analysisDate: string;
  isDemo: boolean;
  coreClaim: string;
  summaryReasoning: string;
  detailedReasoning: string[];
  factors: Factor[];
  nodes: VariantNode[];
  edges: GraphEdge[];
  sources: Source[];
  recommendation: string;
  investigationInput?: import('./investigation').InvestigationInput;
  extractedClaim?: import('./claimExtraction').ExtractedClaim;
  extractionResult?: import('./claimExtraction').ClaimExtractionResult;
  evidenceSearchResponse?: import('./evidenceSearch').EvidenceSearchResponse;
  normalizedSources?: import('./sourceCollection').NormalizedSource[];
  evidenceItems?: import('./evidence').Evidence[];
  evidenceAssessments?: import('./evidenceAnalysis').EvidenceAssessment[];
  credibilityAssessments?: import('./credibility').CredibilityAssessment[];
  sourceComparison?: import('./sourceComparison').SourceComparison;
  verdict?: import('./verdict').Verdict;
  forensicSummary: {
    originChannel: string;
    driftSeverity: 'None' | 'Low' | 'Moderate' | 'High' | 'Severe';
    contradictionDetected: boolean;
    officialConfirmationState: 'Contradicts claim' | 'Supports claim' | 'Unverified / Pending';
    estimatedSpread: string;
  };
}

export type ActiveTab = 'home' | 'analyze' | 'architecture' | 'dashboard' | 'history' | 'how-it-works';

// Re-export Phase 7, 8, 10 & 12 Types
export * from './credibility';
export * from './sourceComparison';
export * from './verdict';
export * from './investigationRecord';
