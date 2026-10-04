/**
 * EchoTrace Phase 3: Evidence Search Types
 * 
 * Formalizes the transition:
 * EXTRACTED CLAIM → REAL EVIDENCE SEARCH → SEARCH RESULTS
 * 
 * Architectural Guarantees:
 * 1. No fake search results or imaginary URLs.
 * 2. Pluggable provider architecture (WebSearch, OfficialSource, etc.).
 * 3. Multi-query generation across 5 distinct search strategies.
 * 4. Source priority ordering (Official > Gov > Primary > News > Verified Social > Secondary > Unknown > Anonymous).
 * 5. Explicit "unavailable" state when no external provider is configured.
 */

import { ExtractedClaim } from './claimExtraction';

/**
 * Source categories ranked in priority order (1 to 8).
 * EchoTrace prioritizes institutional and primary documentation over secondary or unverified social sources.
 */
export type SearchResultSourceType =
  | 'official'          // Rank 1: Official institutional portals (.edu, .ac.in, srmist.edu.in)
  | 'government'        // Rank 2: Government registries, disaster mgmt, police (.gov, .gov.in, .nic.in)
  | 'primary'           // Rank 3: Primary documents (PDF circulars, signed orders, gazettes)
  | 'news'              // Rank 4: Reputable news organizations (The Hindu, NDTV, Indian Express, etc.)
  | 'social_verified'   // Rank 5: Verified / public official institutional social accounts
  | 'secondary'         // Rank 6: Secondary sources (student portals, college aggregators, blogs)
  | 'unknown'           // Rank 7: Unknown or unclassified websites
  | 'anonymous_social'; // Rank 8: Anonymous social posts, forums, unverified chat threads

/**
 * Standardized search result returned by real evidence search providers.
 */
export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  publisher?: string;
  publishedAt?: string;
  sourceType: SearchResultSourceType | string;
  query: string;
  retrievedAt: string;
  priorityRank?: number; // 1 (highest priority) to 8 (lowest priority)
  relevanceScore?: number; // 0.0 to 1.0 relevance estimation
}

/**
 * The 5 search query strategies derived from an extracted claim:
 * 1. Exact claim
 * 2. Main entities + action
 * 3. Entity + event
 * 4. Entity + time
 * 5. Important keywords
 */
export type SearchStrategyKind =
  | 'exact_claim'
  | 'entities_action'
  | 'entity_event'
  | 'entity_time'
  | 'keywords'
  | 'official_target';

export interface GeneratedQuery {
  kind: SearchStrategyKind;
  query: string;
  rationale: string;
  targetDomain?: string;
}

export interface SearchQueryPlan {
  claimId: string;
  claimText: string;
  queries: GeneratedQuery[];
  generatedAt: string;
}

export type SearchResponseStatus =
  | 'uninitiated'       // Query plan formulated, pending user or pipeline search execution
  | 'success'           // Real search succeeded with results
  | 'unavailable'       // No provider API key configured; honest fallback (no fake data)
  | 'empty'             // Provider responded successfully but found 0 matching results
  | 'rate_limited'      // HTTP 429 or quota exceeded on search engine
  | 'timeout'           // Search aborted after timeout threshold
  | 'error';            // Provider or network error

export interface EvidenceSearchResponse {
  status: SearchResponseStatus;
  claimId: string;
  claimText: string;
  queryPlan: SearchQueryPlan;
  results: SearchResult[];
  totalResultsFound: number;
  uniqueUrlsCount: number;
  providerUsed?: string;
  executedQueries: string[];
  executionTimeMs: number;
  message?: string;
  error?: string;
  retrievedAt: string;
}

export interface SearchOptions {
  timeoutMs?: number;
  maxResultsPerQuery?: number;
  maxTotalResults?: number;
  filterDuplicates?: boolean;
  prioritySort?: boolean;
  providerOverride?: string;
}

/**
 * Extensible Provider Interface.
 * Allows search providers (WebSearch, OfficialSource, Tavily, Serper, Google, Gemini)
 * to be plugged in or replaced without touching the dashboard.
 */
export interface EvidenceSearchProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  search(queries: string[], options?: SearchOptions): Promise<SearchResult[]>;
}
