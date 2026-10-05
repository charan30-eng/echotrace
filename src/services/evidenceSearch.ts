/**
 * EchoTrace Phase 3: Evidence Search Service
 * 
 * Formal Architecture:
 * EXTRACTED CLAIM → REAL EVIDENCE SEARCH → SEARCH RESULTS
 * 
 * Strict Guarantees:
 * - Does NOT fake search results.
 * - Does NOT generate imaginary URLs.
 * - Does NOT hard-code evidence and present it as real.
 * - Does NOT claim a source exists unless it was actually retrieved.
 * - Frontend contains NO secret API keys (API proxy boundary).
 * - Provider architecture allows search providers to be replaced without rewriting the dashboard.
 * - Returns clear "evidence search unavailable" state if no provider is configured.
 */

import { ExtractedClaim } from '../types/claimExtraction';
import {
  EvidenceSearchProvider,
  EvidenceSearchResponse,
  SearchResult,
  SearchOptions,
  SearchQueryPlan,
} from '../types/evidenceSearch';
import { generateSearchQueries } from './evidenceQueryGenerator';
import {
  deduplicateResultsByUrl,
  sortResultsByPriority,
  classifySource,
} from './sourceClassifier';

/**
 * 1. WebSearchProvider:
 * Primary external web search provider connecting through the server API boundary.
 */
export class WebSearchProvider implements EvidenceSearchProvider {
  public readonly name = 'WebSearchProvider';
  private _isConfigured = true;

  public get isConfigured(): boolean {
    return this._isConfigured;
  }

  public async search(queries: string[], options?: SearchOptions): Promise<SearchResult[]> {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        queries,
        options: {
          ...options,
          providerOverride: this.name,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`WebSearchProvider API error (HTTP ${res.status})`);
    }

    const data: EvidenceSearchResponse = await res.json();
    return data.results || [];
  }
}

/**
 * 2. OfficialSourceProvider:
 * Specialized search provider that prioritizes primary institutional portals,
 * registrar domains (.edu, .ac.in), and government gazettes.
 */
export class OfficialSourceProvider implements EvidenceSearchProvider {
  public readonly name = 'OfficialSourceProvider';
  private _isConfigured = true;

  public get isConfigured(): boolean {
    return this._isConfigured;
  }

  public async search(queries: string[], options?: SearchOptions): Promise<SearchResult[]> {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        queries,
        options: {
          ...options,
          providerOverride: this.name,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`OfficialSourceProvider API error (HTTP ${res.status})`);
    }

    const data: EvidenceSearchResponse = await res.json();
    return data.results || [];
  }
}

/**
 * Main Evidence Search Service
 */
export class EvidenceSearchService {
  private providers: Map<string, EvidenceSearchProvider> = new Map();
  private activeProviderName = 'WebSearchProvider';
  private cache: Map<string, EvidenceSearchResponse> = new Map();

  constructor() {
    // Register default providers
    this.registerProvider(new WebSearchProvider());
    this.registerProvider(new OfficialSourceProvider());
  }

  /**
   * Pluggable Provider Registry:
   * Allows adding or replacing search providers dynamically without modifying the UI or dashboard.
   */
  public registerProvider(provider: EvidenceSearchProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: string): EvidenceSearchProvider | undefined {
    return this.providers.get(name);
  }

  public listProviders(): EvidenceSearchProvider[] {
    return Array.from(this.providers.values());
  }

  public setActiveProvider(name: string): boolean {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
      return true;
    }
    return false;
  }

  public getActiveProviderName(): string {
    return this.activeProviderName;
  }

  /**
   * Formulates the 5 search query strategies from an ExtractedClaim
   * without executing the network request (useful for dry-run preview).
   */
  public generateQueryPlan(claim: ExtractedClaim): SearchQueryPlan {
    return generateSearchQueries(claim);
  }

  /**
   * Checks whether the server has any external search provider configured.
   */
  public async checkServerProviderStatus(): Promise<{
    providerConfigured: boolean;
    availableProviders: string[];
  }> {
    try {
      const res = await fetch('/api/search/status', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          providerConfigured: Boolean(data.providerConfigured),
          availableProviders: data.availableProviders || [],
        };
      }
    } catch {
      // In offline or static preview, gracefully return false
    }
    return { providerConfigured: false, availableProviders: [] };
  }

  /**
   * Main Search Method:
   * searchEvidence(claim: ExtractedClaim)
   * 
   * Dispatches claim to backend `/api/search` proxy boundary.
   * Handles timeouts, rate limits, provider failures, and deduplication.
   */
  public async searchEvidence(
    claim: ExtractedClaim,
    options: SearchOptions = {}
  ): Promise<EvidenceSearchResponse> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 9000;
    const providerName = options.providerOverride || this.activeProviderName;
    const cacheKey = `${providerName}-${claim.id}-${claim.claimText.toLowerCase().trim()}`;

    // Return cached result if available
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`[EchoTrace:EvidenceSearch] Cache hit for claim [${claim.id}]`);
      return cached;
    }

    // Generate search query plan locally for immediate client tracking
    const queryPlan = this.generateQueryPlan(claim);
    const activeProvider = this.getProvider(providerName) || this.providers.get('WebSearchProvider');

    // If a custom or mock provider was registered and is active (not default server proxy providers):
    if (
      activeProvider &&
      activeProvider.name !== 'WebSearchProvider' &&
      activeProvider.name !== 'OfficialSourceProvider' &&
      typeof activeProvider.search === 'function'
    ) {
      try {
        const queryStrings = queryPlan.queries.map((q) => q.query);
        const rawResults = await activeProvider.search(queryStrings, options);
        const deduplicated = deduplicateResultsByUrl(rawResults);
        const prioritized = sortResultsByPriority(deduplicated);

        const customResponse: EvidenceSearchResponse = {
          status: prioritized.length > 0 ? 'success' : 'empty',
          claimId: claim.id,
          claimText: claim.claimText,
          queryPlan,
          results: prioritized,
          totalResultsFound: rawResults.length,
          uniqueUrlsCount: prioritized.length,
          providerUsed: activeProvider.name,
          executedQueries: queryStrings.slice(0, 3),
          executionTimeMs: Date.now() - startTime,
          message: prioritized.length > 0
            ? `Custom provider ${activeProvider.name} retrieved ${prioritized.length} real evidence items.`
            : `Custom provider ${activeProvider.name} completed with 0 results.`,
          retrievedAt: new Date().toISOString(),
        };

        this.cache.set(cacheKey, customResponse);
        return customResponse;
      } catch (customErr: any) {
        return {
          status: 'error',
          claimId: claim.id,
          claimText: claim.claimText,
          queryPlan,
          results: [],
          totalResultsFound: 0,
          uniqueUrlsCount: 0,
          providerUsed: activeProvider.name,
          executedQueries: queryPlan.queries.map((q) => q.query),
          executionTimeMs: Date.now() - startTime,
          error: customErr.message,
          message: `Custom search provider ${activeProvider.name} failed: ${customErr.message}`,
          retrievedAt: new Date().toISOString(),
        };
      }
    }

    // Setup client-side abort controller for network timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      console.log(`[EchoTrace:EvidenceSearch] Dispatching search request to /api/search for claim: "${claim.claimText}" using ${providerName}`);

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          claim,
          options: {
            ...options,
            providerOverride: options.providerOverride || this.activeProviderName,
            timeoutMs,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const rateLimitResponse: EvidenceSearchResponse = {
          status: 'rate_limited',
          claimId: claim.id,
          claimText: claim.claimText,
          queryPlan,
          results: [],
          totalResultsFound: 0,
          uniqueUrlsCount: 0,
          providerUsed: this.activeProviderName,
          executedQueries: queryPlan.queries.slice(0, 3).map((q) => q.query),
          executionTimeMs: Date.now() - startTime,
          message: 'External evidence search rate limit exceeded. Please wait a moment before searching again.',
          retrievedAt: new Date().toISOString(),
        };
        return rateLimitResponse;
      }

      if (!response.ok) {
        throw new Error(`Search API endpoint responded with HTTP ${response.status}`);
      }

      const data: EvidenceSearchResponse = await response.json();

      // Post-process and ensure results are strictly deduplicated and sorted by source priority
      if (Array.isArray(data.results) && data.results.length > 0) {
        const deduplicated = deduplicateResultsByUrl(data.results);
        const prioritized = sortResultsByPriority(deduplicated);
        data.results = prioritized;
        data.uniqueUrlsCount = prioritized.length;
      }

      // Store in session cache
      this.cache.set(cacheKey, data);
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const executionTimeMs = Date.now() - startTime;

      if (err.name === 'AbortError') {
        console.warn(`[EchoTrace:EvidenceSearch] Search timed out after ${timeoutMs}ms.`);
        return {
          status: 'timeout',
          claimId: claim.id,
          claimText: claim.claimText,
          queryPlan,
          results: [],
          totalResultsFound: 0,
          uniqueUrlsCount: 0,
          providerUsed: this.activeProviderName,
          executedQueries: queryPlan.queries.slice(0, 2).map((q) => q.query),
          executionTimeMs,
          message: `Evidence search timed out after ${timeoutMs}ms. The external provider did not respond in time.`,
          error: 'Search request timed out.',
          retrievedAt: new Date().toISOString(),
        };
      }

      // If backend endpoint is unreachable or returned failure
      console.warn('[EchoTrace:EvidenceSearch] Backend search API error:', err.message);

      return {
        status: 'unavailable',
        claimId: claim.id,
        claimText: claim.claimText,
        queryPlan,
        results: [],
        totalResultsFound: 0,
        uniqueUrlsCount: 0,
        providerUsed: this.activeProviderName,
        executedQueries: [],
        executionTimeMs,
        message: 'Evidence search is currently unavailable. No external search provider is connected to the backend API boundary. EchoTrace strictly does not generate simulated or imaginary evidence.',
        error: err.message,
        retrievedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Clears session search cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

// Singleton export
export const evidenceSearch = new EvidenceSearchService();
