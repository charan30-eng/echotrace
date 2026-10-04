/**
 * EchoTrace Phase 3: Evidence Search Results Card
 * 
 * Renders the Phase 3 Evidence Search layer:
 * EXTRACTED CLAIM → REAL EVIDENCE SEARCH → SEARCH RESULTS
 * 
 * Strict Guarantees:
 * 1. Never displays fake search results or imaginary URLs.
 * 2. Displays genuine source priority ranking (Official > Gov > Primary > News > Secondary > Unknown > Anonymous).
 * 3. Shows transparent multi-query strategy plan (5 search angles).
 * 4. Displays a clear, actionable "Evidence Search Unavailable" fallback state if no provider is configured.
 */

import React, { useState } from 'react';
import { ExtractedClaim } from '../types/claimExtraction';
import {
  EvidenceSearchResponse,
  SearchResult,
  SearchQueryPlan,
} from '../types/evidenceSearch';
import { evidenceSearch } from '../services/evidenceSearch';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  CheckCircle2,
  FileText,
  Building2,
  Globe,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';

interface EvidenceSearchResultsCardProps {
  claim?: ExtractedClaim;
  initialResponse?: EvidenceSearchResponse;
  isDemo?: boolean;
}

export const EvidenceSearchResultsCard: React.FC<EvidenceSearchResultsCardProps> = ({
  claim,
  initialResponse,
  isDemo = false,
}) => {
  const [searchResponse, setSearchResponse] = useState<EvidenceSearchResponse | null>(
    initialResponse || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showQueryPlan, setShowQueryPlan] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // If no response yet but claim is available, generate the query plan for preview
  const queryPlan: SearchQueryPlan | null =
    searchResponse?.queryPlan || (claim ? evidenceSearch.generateQueryPlan(claim) : null);

  const handleRunSearch = async () => {
    if (!claim) return;
    setIsLoading(true);
    try {
      const resp = await evidenceSearch.searchEvidence(claim);
      setSearchResponse(resp);
    } catch (err: any) {
      console.error('Failed to execute search:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceTypeBadge = (sourceType: string, rank?: number) => {
    switch (sourceType) {
      case 'official':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
            <Building2 className="h-3 w-3" />
            RANK 1: OFFICIAL INSTITUTIONAL
          </span>
        );
      case 'government':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/70 text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
            <ShieldCheck className="h-3 w-3" />
            RANK 2: GOVERNMENT
          </span>
        );
      case 'primary':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/70 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300">
            <FileText className="h-3 w-3" />
            RANK 3: PRIMARY CIRCULAR / PDF
          </span>
        );
      case 'news':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/70 text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
            <Globe className="h-3 w-3" />
            RANK 4: REPUTABLE NEWS
          </span>
        );
      case 'social_verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/70 text-[11px] font-mono font-bold text-sky-700 dark:text-sky-300">
            <CheckCircle2 className="h-3 w-3" />
            RANK 5: VERIFIED SOCIAL
          </span>
        );
      case 'secondary':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/70 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300">
            <Layers className="h-3 w-3" />
            RANK 6: SECONDARY SOURCE
          </span>
        );
      case 'anonymous_social':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/70 text-[11px] font-mono font-bold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-3 w-3" />
            RANK 8: ANONYMOUS FORUM / POST
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300">
            <Globe className="h-3 w-3" />
            {rank ? `RANK ${rank}: UNKNOWN WEBSITE` : 'UNKNOWN SOURCE'}
          </span>
        );
    }
  };

  const results = searchResponse?.results || [];
  const filteredResults =
    activeFilter === 'all'
      ? results
      : results.filter((r) => r.sourceType === activeFilter);

  const status = searchResponse?.status || (isDemo ? 'demo_preserved' : 'uninitiated');

  return (
    <div className="rounded-2xl border-2 border-indigo-500/30 bg-white dark:bg-[#111622] p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.08)] transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
              Phase 3 Architecture
            </span>
            <span className="text-[11px] font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded">
              REAL EVIDENCE SEARCH
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-[#111827] dark:text-white mt-1">
            External Evidence Retrieval
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Query formulation, external provider execution, and priority provenance classification.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {claim && (
            <button
              onClick={handleRunSearch}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Searching...' : searchResponse ? 'Re-run Search' : 'Search External Evidence'}</span>
            </button>
          )}

          {queryPlan && (
            <button
              onClick={() => setShowQueryPlan((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#4F46E5] dark:text-indigo-400" />
              <span>{showQueryPlan ? 'Hide Queries' : 'Inspect Queries (5)'}</span>
              {showQueryPlan ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Query Strategy Inspector Accordion */}
      {showQueryPlan && queryPlan && (
        <div className="mt-5 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              5-Angle Query Strategy (Formulated from Extracted Claim)
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              Claim ID: #{queryPlan.claimId}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {queryPlan.queries.map((q, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] uppercase text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                    Strategy {idx + 1}: {q.kind.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="font-mono font-bold text-gray-900 dark:text-white pt-1">
                  “{q.query}”
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                  {q.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Banners */}
      <div className="mt-5">
        {status === 'unavailable' && (
          <div className="p-5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-amber-800 dark:text-amber-300">
                    Evidence Search Unavailable
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold">
                    ZERO HALLUCINATION SAFEGUARD
                  </span>
                </div>
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100 mt-1">
                  No External Search Provider API Key Configured on Server
                </h4>
                <p className="text-xs text-amber-900/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                  In accordance with Phase 3 architectural principles, <strong>EchoTrace strictly does NOT generate simulated or imaginary search results or pretend a source exists.</strong>
                </p>
                <div className="mt-3 p-3 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-amber-200 dark:border-amber-800/60 text-xs font-mono space-y-1.5">
                  <span className="text-gray-500 dark:text-gray-400 font-bold block">
                    Supported Server Environment Variables (.env):
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    <li><code className="text-[#4F46E5] dark:text-indigo-400 font-bold">TAVILY_API_KEY</code>: Tavily Factual Search API</li>
                    <li><code className="text-[#4F46E5] dark:text-indigo-400 font-bold">SERPER_API_KEY</code>: Serper Google Search API</li>
                    <li><code className="text-[#4F46E5] dark:text-indigo-400 font-bold">GOOGLE_SEARCH_API_KEY</code> & <code className="text-[#4F46E5] dark:text-indigo-400 font-bold">GOOGLE_SEARCH_CX</code>: Google Custom Search</li>
                    <li><code className="text-[#4F46E5] dark:text-indigo-400 font-bold">GEMINI_API_KEY</code>: Google Search Grounding Tool</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'rate_limited' && (
          <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-xs flex items-center gap-3 text-rose-800 dark:text-rose-300">
            <Radio className="h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold">Provider Rate Limit Exceeded:</span> Search provider quota was reached. Please wait a moment and click "Re-run Search".
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-xs flex items-center gap-3 text-amber-800 dark:text-amber-300">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Search Timeout:</span> The external search provider took longer than the configured timeout to respond.
            </div>
          </div>
        )}

        {status === 'empty' && (
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 text-xs text-center text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-bold text-gray-700 dark:text-gray-300">No Matching External Documents Found</p>
            <p>The provider executed the search queries, but no public documents or circulars were returned for this specific phrasing.</p>
          </div>
        )}

        {status === 'uninitiated' && !searchResponse && (
          <div className="p-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 text-center space-y-2">
            <Search className="h-6 w-6 text-gray-400 mx-auto" />
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Multi-Angle Query Plan Formulated
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              5 distinct search queries have been formulated from the extracted proposition. Click below to execute live external evidence search via the backend API boundary.
            </p>
            <button
              onClick={handleRunSearch}
              disabled={isLoading}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Execute Live Evidence Search</span>
            </button>
          </div>
        )}

        {status === 'demo_preserved' && !searchResponse && (
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-[#4F46E5] dark:text-indigo-400 font-mono text-[11px] block">
                PRESERVED DEMO SCENARIO MODE
              </span>
              <p className="text-gray-600 dark:text-gray-300">
                This historical scenario is currently displaying its preserved documentary timeline. You can also run live external web search against this demo claim.
              </p>
            </div>
            <button
              onClick={handleRunSearch}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors cursor-pointer shrink-0"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Run Live Web Search</span>
            </button>
          </div>
        )}
      </div>

      {/* Real Retrieved Search Results List */}
      {results.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Metadata bar & filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
            <div className="flex items-center gap-2 font-mono text-gray-500 dark:text-gray-400">
              <span className="font-bold text-[#111827] dark:text-white">
                {results.length} Evidence Records Found
              </span>
              <span>·</span>
              <span>Provider: <strong>{searchResponse?.providerUsed || 'External Search'}</strong></span>
              <span>·</span>
              <span>Time: {searchResponse?.executionTimeMs}ms</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-gray-400">Filter:</span>
              {['all', 'official', 'government', 'news'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                    activeFilter === f
                      ? 'bg-[#4F46E5] text-white font-bold'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {filteredResults.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-2 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSourceTypeBadge(item.sourceType, item.priorityRank)}
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {item.publisher}
                    </span>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <span>Visit Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <h4 className="text-sm font-bold text-[#111827] dark:text-white leading-snug">
                  {item.title}
                </h4>

                {item.snippet && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 font-sans">
                    “{item.snippet}”
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 dark:text-gray-500 pt-1">
                  <span className="truncate max-w-sm">
                    Matched Query: <em>“{item.query}”</em>
                  </span>
                  <span>Retrieved: {new Date(item.retrievedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
