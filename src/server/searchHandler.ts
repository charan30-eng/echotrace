/**
 * EchoTrace Phase 3: Server-Side Evidence Search Engine & API Boundary
 * 
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * 1. The frontend NEVER contains search secrets or API keys.
 * 2. External search provider API keys are accessed ONLY in Node.js on the server.
 * 3. NO fake search results or imaginary URLs are ever generated.
 * 4. If no search provider key is set, returns status: 'unavailable'.
 * 
 * Supported Providers (Configurable via Environment Variables):
 * - TAVILY_API_KEY: Tavily Search API (Dedicated factual research engine)
 * - SERPER_API_KEY: Serper Google Search API
 * - GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX: Google Custom Search JSON API
 * - GEMINI_API_KEY: Google GenAI with live Google Search Grounding tool
 */

import { GoogleGenAI } from '@google/genai';
import { ExtractedClaim } from '../types/claimExtraction';
import {
  EvidenceSearchResponse,
  SearchResult,
  SearchOptions,
  SearchQueryPlan,
} from '../types/evidenceSearch';
import { generateSearchQueries } from '../services/evidenceQueryGenerator';
import {
  classifySource,
  deduplicateResultsByUrl,
  sortResultsByPriority,
  normalizeUrl,
} from '../services/sourceClassifier';

export interface ServerSearchConfig {
  tavilyApiKey?: string;
  serperApiKey?: string;
  googleSearchApiKey?: string;
  googleSearchCx?: string;
  geminiApiKey?: string;
}

export function getServerSearchConfig(): ServerSearchConfig {
  return {
    tavilyApiKey: process.env.TAVILY_API_KEY,
    serperApiKey: process.env.SERPER_API_KEY,
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY,
    googleSearchCx: process.env.GOOGLE_SEARCH_CX,
    geminiApiKey: process.env.GEMINI_API_KEY,
  };
}

export function hasConfiguredSearchProvider(): boolean {
  const cfg = getServerSearchConfig();
  return Boolean(
    cfg.tavilyApiKey ||
    cfg.serperApiKey ||
    (cfg.googleSearchApiKey && cfg.googleSearchCx) ||
    cfg.geminiApiKey
  );
}

/**
 * Executes search query against Tavily Search API
 */
async function searchWithTavily(
  query: string,
  apiKey: string,
  timeoutMs = 7000
): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_domains: [],
        max_results: 6,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      const err = new Error('Tavily search rate limit exceeded');
      (err as any).isRateLimit = true;
      throw err;
    }

    if (!res.ok) {
      throw new Error(`Tavily API responded with HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const results: SearchResult[] = [];

    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        if (!item.url || typeof item.url !== 'string') continue;
        const { sourceType, priorityRank } = classifySource(
          item.url,
          item.title,
          item.domain || item.publisher
        );

        results.push({
          id: `tavily-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: item.title || 'Untitled Document',
          url: item.url,
          snippet: item.content || item.snippet || '',
          publisher: item.domain || new URL(item.url).hostname,
          publishedAt: item.published_date || undefined,
          sourceType,
          query,
          retrievedAt: new Date().toISOString(),
          priorityRank,
          relevanceScore: item.score || 0.85,
        });
      }
    }

    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Executes search query against Serper Google Search API
 */
async function searchWithSerper(
  query: string,
  apiKey: string,
  timeoutMs = 7000
): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 6,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      const err = new Error('Serper API rate limit exceeded');
      (err as any).isRateLimit = true;
      throw err;
    }

    if (!res.ok) {
      throw new Error(`Serper API HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const results: SearchResult[] = [];

    if (Array.isArray(data.organic)) {
      for (const item of data.organic) {
        if (!item.link) continue;
        const { sourceType, priorityRank } = classifySource(
          item.link,
          item.title,
          item.displayedLink
        );

        results.push({
          id: `serper-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: item.title || 'Untitled Document',
          url: item.link,
          snippet: item.snippet || '',
          publisher: new URL(item.link).hostname,
          publishedAt: item.date || undefined,
          sourceType,
          query,
          retrievedAt: new Date().toISOString(),
          priorityRank,
          relevanceScore: 0.8,
        });
      }
    }

    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Executes search query against Google Custom Search JSON API
 */
async function searchWithGoogleCustomSearch(
  query: string,
  apiKey: string,
  cx: string,
  timeoutMs = 7000
): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', '6');

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      const err = new Error('Google Custom Search rate limit / quota exceeded');
      (err as any).isRateLimit = true;
      throw err;
    }

    if (!res.ok) {
      throw new Error(`Google Custom Search HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const results: SearchResult[] = [];

    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (!item.link) continue;
        const { sourceType, priorityRank } = classifySource(
          item.link,
          item.title,
          item.displayLink
        );

        results.push({
          id: `gcse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: item.title || 'Untitled Document',
          url: item.link,
          snippet: item.snippet || '',
          publisher: item.displayLink || new URL(item.link).hostname,
          sourceType,
          query,
          retrievedAt: new Date().toISOString(),
          priorityRank,
          relevanceScore: 0.85,
        });
      }
    }

    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Executes grounded search query via Google GenAI SDK with Google Search Tool.
 * Extracts authentic, verified web URLs and citations from Google Grounding chunks.
 */
async function searchWithGeminiGrounding(
  query: string,
  apiKey: string,
  timeoutMs = 8000
): Promise<SearchResult[]> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Call Gemini with Google Search tool enabled
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search Google for real verified institutional announcements or official circulars regarding this query: "${query}". Provide a summary of factual findings with primary source citations.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const results: SearchResult[] = [];
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;

    // Extract real URLs from grounding chunks
    if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const web = (chunk as any).web;
        if (web && web.uri) {
          const { sourceType, priorityRank } = classifySource(
            web.uri,
            web.title,
            new URL(web.uri).hostname
          );

          results.push({
            id: `gemini-grounding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: web.title || 'Google Grounded Web Reference',
            url: web.uri,
            snippet:
              typeof (response as any).text === 'function'
                ? (response as any).text().slice(0, 300)
                : typeof (response as any).text === 'string'
                ? (response as any).text.slice(0, 300)
                : candidate?.content?.parts?.map((p: any) => p.text || '').join('').slice(0, 300) ||
                  'Retrieved via Google Search Grounding',
            publisher: new URL(web.uri).hostname,
            sourceType,
            query,
            retrievedAt: new Date().toISOString(),
            priorityRank,
            relevanceScore: 0.9,
          });
        }
      }
    }

    return results;
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      const e = new Error('Gemini API quota exceeded');
      (e as any).isRateLimit = true;
      throw e;
    }
    throw err;
  }
}

/**
 * Main server-side search orchestrator.
 * 
 * Strict Guarantees:
 * - If no provider is configured, returns status: 'unavailable'.
 * - NEVER fakes results or hallucinates URLs.
 * - Deduplicates URLs.
 * - Sorts by Source Priority (Official > Gov > Primary > News > etc.).
 */
export async function executeServerEvidenceSearch(
  claim: ExtractedClaim,
  options: SearchOptions = {}
): Promise<EvidenceSearchResponse> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || 8000;
  const config = getServerSearchConfig();

  // Formulate multi-angle search query plan from ExtractedClaim
  const queryPlan: SearchQueryPlan = generateSearchQueries(claim);

  // If no external search provider is configured in environment:
  if (!hasConfiguredSearchProvider()) {
    console.log('[EchoTrace:EvidenceSearch] No external search API key configured on server. Returning unavailable status.');
    return {
      status: 'unavailable',
      claimId: claim.id,
      claimText: claim.claimText,
      queryPlan,
      results: [],
      totalResultsFound: 0,
      uniqueUrlsCount: 0,
      providerUsed: 'None (Unconfigured)',
      executedQueries: [],
      executionTimeMs: Date.now() - startTime,
      message: 'Evidence search is currently unavailable. No external search provider API keys (such as TAVILY_API_KEY, SERPER_API_KEY, GOOGLE_SEARCH_API_KEY, or GEMINI_API_KEY) are configured in the server environment. In accordance with Phase 3 integrity standards, EchoTrace strictly forbids generating simulated or imaginary search results.',
      retrievedAt: new Date().toISOString(),
    };
  }

  // Determine active provider name
  let providerName = 'Unknown';
  if (config.tavilyApiKey) providerName = 'WebSearchProvider (Tavily)';
  else if (config.serperApiKey) providerName = 'WebSearchProvider (Serper)';
  else if (config.googleSearchApiKey && config.googleSearchCx) providerName = 'WebSearchProvider (Google Custom Search)';
  else if (config.geminiApiKey) providerName = 'WebSearchProvider (Gemini Grounding)';

  // Select top queries to execute (default top 3 strategies to prevent rate limits)
  const queriesToRun = queryPlan.queries.slice(0, 3).map((q) => q.query);
  const aggregatedResults: SearchResult[] = [];
  const executedQueries: string[] = [];
  let isRateLimited = false;

  console.log(`[EchoTrace:EvidenceSearch] Executing ${queriesToRun.length} search queries with provider ${providerName}...`);

  for (const query of queriesToRun) {
    try {
      executedQueries.push(query);
      let queryResults: SearchResult[] = [];

      if (config.tavilyApiKey) {
        queryResults = await searchWithTavily(query, config.tavilyApiKey, timeoutMs);
      } else if (config.serperApiKey) {
        queryResults = await searchWithSerper(query, config.serperApiKey, timeoutMs);
      } else if (config.googleSearchApiKey && config.googleSearchCx) {
        queryResults = await searchWithGoogleCustomSearch(
          query,
          config.googleSearchApiKey,
          config.googleSearchCx,
          timeoutMs
        );
      } else if (config.geminiApiKey) {
        queryResults = await searchWithGeminiGrounding(query, config.geminiApiKey, timeoutMs);
      }

      aggregatedResults.push(...queryResults);
    } catch (err: any) {
      console.error(`[EchoTrace:EvidenceSearch] Error querying "${query}":`, err.message);
      if (err?.isRateLimit || err?.message?.includes('rate limit') || err?.message?.includes('429')) {
        isRateLimited = true;
      }
    }
  }

  // Deduplicate results by normalized canonical URL
  const uniqueResults = deduplicateResultsByUrl(aggregatedResults);

  // Sort by Phase 3 source priority (Official institutional & Gov first)
  const prioritizedResults = sortResultsByPriority(uniqueResults);

  const durationMs = Date.now() - startTime;
  console.log(`[EchoTrace:EvidenceSearch] Completed in ${durationMs}ms: found ${aggregatedResults.length} raw items, ${prioritizedResults.length} unique items.`);

  if (isRateLimited && prioritizedResults.length === 0) {
    return {
      status: 'rate_limited',
      claimId: claim.id,
      claimText: claim.claimText,
      queryPlan,
      results: [],
      totalResultsFound: 0,
      uniqueUrlsCount: 0,
      providerUsed: providerName,
      executedQueries,
      executionTimeMs: durationMs,
      message: 'External search provider rate limit exceeded. Please try again in a few moments.',
      retrievedAt: new Date().toISOString(),
    };
  }

  return {
    status: prioritizedResults.length > 0 ? 'success' : 'empty',
    claimId: claim.id,
    claimText: claim.claimText,
    queryPlan,
    results: prioritizedResults,
    totalResultsFound: aggregatedResults.length,
    uniqueUrlsCount: prioritizedResults.length,
    providerUsed: providerName,
    executedQueries,
    executionTimeMs: durationMs,
    message: prioritizedResults.length > 0
      ? `Successfully retrieved ${prioritizedResults.length} real evidence records across ${executedQueries.length} search queries.`
      : 'Search completed successfully, but no external documents or circulars were found matching the queries.',
    retrievedAt: new Date().toISOString(),
  };
}
