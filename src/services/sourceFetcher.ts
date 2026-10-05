/**
 * EchoTrace Phase 5: Source Content Fetcher Service
 * 
 * Formal Architecture:
 * SOURCES → FETCH SOURCE CONTENT → EXTRACT RELEVANT EVIDENCE
 * 
 * Strict Guarantees:
 * 1. Fetches accessible external source pages through the backend security gateway (/api/fetch).
 * 2. Respects robots.txt, domain rate limits, timeouts, and auth walls.
 * 3. Never bypasses authentication or access restrictions.
 * 4. Never fabricates content when a page cannot be accessed.
 * 5. Handles explicit fetch statuses: 'accessible' | 'partially_accessible' | 'inaccessible' | 'failed'.
 * 6. Implements in-memory session caching and controlled batch concurrency.
 */

import { FetchedSourceContent, FetchStatus } from '../types/evidence.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import { normalizeUrl } from './sourceClassifier.ts';

// In-memory session cache to avoid repeated HTTP calls for the same canonical URL
const sourceContentCache = new Map<string, FetchedSourceContent>();

export interface SourceFetcherOptions {
  timeoutMs?: number;
  concurrency?: number;
  bypassCache?: boolean;
}

/**
 * Fetches content for a specific URL via the server fetch gateway or server handler.
 */
export async function fetchSourceContent(
  url: string,
  sourceId = '',
  timeoutMs = 7000,
  bypassCache = false
): Promise<FetchedSourceContent> {
  const canonicalUrl = normalizeUrl(url);

  // Return cached result if available and not bypassing cache
  if (!bypassCache && sourceContentCache.has(canonicalUrl)) {
    const cached = sourceContentCache.get(canonicalUrl)!;
    return {
      ...cached,
      sourceId: sourceId || cached.sourceId,
    };
  }

  // Handle empty or invalid URL
  if (!url || !url.trim() || !url.startsWith('http')) {
    const failureResult: FetchedSourceContent = {
      url: url || '',
      sourceId,
      status: 'failed',
      inaccessibleReason: 'Invalid or missing HTTP/HTTPS URL.',
      retrievedAt: new Date().toISOString(),
      latencyMs: 0,
    };
    sourceContentCache.set(canonicalUrl, failureResult);
    return failureResult;
  }

  // Node.js or Test Runner Environment: direct execution via backend handler
  if (typeof window === 'undefined') {
    try {
      const { executeServerFetchSourceContent } = await import('../server/contentFetchHandler.ts');
      const result = await executeServerFetchSourceContent(url, sourceId, timeoutMs);
      sourceContentCache.set(canonicalUrl, result);
      return result;
    } catch (err: any) {
      const errorResult: FetchedSourceContent = {
        url,
        sourceId,
        status: 'failed',
        inaccessibleReason: `Direct server handler error: ${err.message || 'Unknown error'}`,
        retrievedAt: new Date().toISOString(),
        latencyMs: 0,
      };
      sourceContentCache.set(canonicalUrl, errorResult);
      return errorResult;
    }
  }

  // Browser Environment: POST to backend /api/fetch endpoint
  try {
    const response = await fetch('/api/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        sourceId,
        timeoutMs,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const failureResult: FetchedSourceContent = {
        url,
        sourceId,
        status: 'failed',
        statusCode: response.status,
        inaccessibleReason:
          errorJson.error || `Server gateway returned status code ${response.status}`,
        retrievedAt: new Date().toISOString(),
        latencyMs: 0,
      };
      sourceContentCache.set(canonicalUrl, failureResult);
      return failureResult;
    }

    const fetchedData: FetchedSourceContent = await response.json();
    sourceContentCache.set(canonicalUrl, fetchedData);
    return fetchedData;
  } catch (err: any) {
    const networkFailResult: FetchedSourceContent = {
      url,
      sourceId,
      status: 'failed',
      inaccessibleReason: `Network error contacting content fetch gateway: ${err.message || 'Connection refused'}`,
      retrievedAt: new Date().toISOString(),
      latencyMs: 0,
    };
    sourceContentCache.set(canonicalUrl, networkFailResult);
    return networkFailResult;
  }
}

/**
 * Fetches content for a NormalizedSource record.
 */
export async function fetchSource(
  source: NormalizedSource,
  options: SourceFetcherOptions = {}
): Promise<FetchedSourceContent> {
  const timeoutMs = options.timeoutMs ?? 7000;
  const bypassCache = options.bypassCache ?? false;

  if (!source.url) {
    return {
      url: '',
      sourceId: source.id,
      status: 'inaccessible',
      inaccessibleReason: 'Source record does not contain an external URL.',
      retrievedAt: new Date().toISOString(),
      latencyMs: 0,
    };
  }

  return fetchSourceContent(source.url, source.id, timeoutMs, bypassCache);
}

/**
 * Batch fetches source contents for multiple NormalizedSource records with concurrency control.
 * Returns a Map of sourceId -> FetchedSourceContent.
 */
export async function fetchBatchSources(
  sources: NormalizedSource[],
  options: SourceFetcherOptions = {}
): Promise<Map<string, FetchedSourceContent>> {
  const concurrency = options.concurrency ?? 3;
  const timeoutMs = options.timeoutMs ?? 7000;
  const resultMap = new Map<string, FetchedSourceContent>();

  if (!sources || sources.length === 0) {
    return resultMap;
  }

  // Work queue with controlled concurrency
  const queue = [...sources];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const source = queue.shift();
      if (!source) break;

      try {
        const fetched = await fetchSource(source, { timeoutMs, bypassCache: options.bypassCache });
        resultMap.set(source.id, fetched);
        // Also map by canonical URL if present
        if (source.url) {
          resultMap.set(normalizeUrl(source.url), fetched);
        }
      } catch (err: any) {
        const failed: FetchedSourceContent = {
          url: source.url || '',
          sourceId: source.id,
          status: 'failed',
          inaccessibleReason: `Unexpected error during batch fetch: ${err.message || 'Unknown failure'}`,
          retrievedAt: new Date().toISOString(),
          latencyMs: 0,
        };
        resultMap.set(source.id, failed);
      }
    }
  });

  await Promise.all(workers);
  return resultMap;
}

/**
 * Clears the in-memory source content cache.
 */
export function clearSourceContentCache(): void {
  sourceContentCache.clear();
}

/**
 * Source Fetcher Service Singleton
 */
export class SourceFetcherService {
  public fetchSource(
    source: NormalizedSource,
    options?: SourceFetcherOptions
  ): Promise<FetchedSourceContent> {
    return fetchSource(source, options);
  }

  public fetchSourceContent(
    url: string,
    sourceId?: string,
    timeoutMs?: number,
    bypassCache?: boolean
  ): Promise<FetchedSourceContent> {
    return fetchSourceContent(url, sourceId, timeoutMs, bypassCache);
  }

  public fetchBatchSources(
    sources: NormalizedSource[],
    options?: SourceFetcherOptions
  ): Promise<Map<string, FetchedSourceContent>> {
    return fetchBatchSources(sources, options);
  }

  public clearCache(): void {
    clearSourceContentCache();
  }
}

export const sourceFetcher = new SourceFetcherService();
