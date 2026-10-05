/**
 * EchoTrace Phase 5: Source Content Fetching & Evidence Extraction Types
 * 
 * Formal Architecture:
 * SOURCES → FETCH SOURCE CONTENT → EXTRACT RELEVANT EVIDENCE
 * 
 * Strict Guarantees:
 * 1. Never simply uses search-result snippets as final evidence when the original source can be accessed.
 * 2. Fetches accessible source pages through backend boundary respecting robots.txt, rate limits, timeouts, and auth walls.
 * 3. Never bypasses authentication or access restrictions.
 * 4. Never fabricates content when a page cannot be accessed.
 * 5. Extracts only claim-relevant excerpts alongside surrounding context to prevent out-of-context deception.
 * 6. Preserves exact source URL and retrieval timestamp.
 * 7. Tracks explicit access statuses: accessible, partially_accessible, inaccessible, failed.
 * 8. Does NOT calculate final TRUE/FALSE verdict yet.
 */

export type EvidenceType =
  | 'official'
  | 'government'
  | 'news'
  | 'social'
  | 'secondary'
  | 'unknown';

export type FetchStatus =
  | 'accessible'
  | 'partially_accessible'
  | 'inaccessible'
  | 'failed';

/**
 * Standardized Evidence item extracted from an accessible external source page.
 */
export interface Evidence {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
  retrievedAt: string;
  excerpt: string;
  context?: string;
  relevanceScore: number; // 0.0 to 1.0
  evidenceType: EvidenceType;
  extractionMethod: string;
  fetchStatus?: FetchStatus;
  inaccessibleReason?: string;
  matchedKeywords?: string[];
}

/**
 * Raw fetched page content payload returned by the backend content fetcher boundary.
 */
export interface FetchedSourceContent {
  url: string;
  sourceId?: string;
  status: FetchStatus;
  statusCode?: number;
  title?: string;
  mainText?: string;
  description?: string;
  publishedTime?: string;
  canonicalUrl?: string;
  contentType?: string;
  contentLength?: number;
  inaccessibleReason?: string;
  retrievedAt: string;
  latencyMs: number;
  isPdf?: boolean;
}

/**
 * Batch result of evidence extraction across multiple normalized sources.
 */
export interface EvidenceExtractionBatchResult {
  evidenceList: Evidence[];
  totalSourcesProcessed: number;
  accessibleCount: number;
  partiallyAccessibleCount: number;
  inaccessibleCount: number;
  failedCount: number;
  extractedAt: string;
}

/**
 * Options for configuring source fetching and evidence extraction.
 */
export interface EvidenceExtractionOptions {
  timeoutMs?: number;
  maxExcerptLength?: number;
  maxContextLength?: number;
  minRelevanceScore?: number;
  respectRobotsTxt?: boolean;
}
