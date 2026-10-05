/**
 * EchoTrace Phase 4: Source Collection & Normalization Types
 * 
 * Formal Architecture:
 * SEARCH RESULTS → SOURCE COLLECTION → NORMALIZED SOURCES
 * 
 * Strict Guarantees:
 * 1. Preserves compatibility with existing EchoTrace Source model.
 * 2. Does NOT invent publisher names, authors, publication dates, or verification statuses.
 * 3. Distinguishes authentic source types (Official notice, Government source, News outlet,
 *    Official social account, Social post, Blog, Forum, Unknown).
 * 4. Provides transparent reliability assessments with explicit human-readable explanations.
 * 5. Prepares normalized records for Phase 5 content retrieval.
 */

import { Source, SourceReliability, SourceType, VerificationStatus } from './claim';
import { SearchResult } from './evidenceSearch';

/**
 * Transparent assessment explanation returned by assessSourceReliability()
 */
export interface SourceReliabilityAssessment {
  reliability: SourceReliability;
  explanation: string;
  score: number; // 0 to 100 confidence score
  factors: string[];
  flags?: string[];
}

/**
 * Audit trail detailing the query and search provenance of the collected source
 */
export interface SourceProvenance {
  originalQuery: string;
  searchProvider?: string;
  sourceTypeRank?: number;
  rawTitle?: string;
  rawSnippet?: string;
  relevanceScore?: number;
  canonicalUrl: string;
  collectedAt: string;
}

/**
 * Fully normalized source record derived from raw SearchResult.
 * Strictly implements and extends EchoTrace's existing Source type.
 */
export interface NormalizedSource extends Source {
  // Required URL of the authentic external document
  url: string;

  // Normalized host/domain (e.g., "srmist.edu.in", "thehindu.com")
  domain: string;

  // Publisher identity (null if not determinable from genuine metadata)
  publisher: string | null;

  // Genuine publication date (null if not provided in search metadata; never fabricated)
  publishedAt: string | null;

  // Exact retrieval timestamp
  retrievalTimestamp: string;

  // Transparent, explainable assessment explanation
  reliabilityExplanation: string;

  // Detailed provenance metadata
  provenance: SourceProvenance;

  // Phase 5 Content Fetching Hook
  contentFetchStatus: 'pending' | 'fetched' | 'unsupported' | 'failed';

  // Raw snippet from search provider
  snippet?: string;
}

/**
 * Aggregated result of normalizing a collection of search results
 */
export interface SourceCollectionResult {
  sources: NormalizedSource[];
  totalReceived: number;
  totalUnique: number;
  officialCount: number;
  governmentCount: number;
  newsCount: number;
  socialCount: number;
  otherCount: number;
  collectedAt: string;
}

/**
 * Configuration options for source normalization
 */
export interface SourceCollectorOptions {
  deduplicate?: boolean;
  filterLowQuality?: boolean;
  maxSources?: number;
  preferredDomain?: string;
}
