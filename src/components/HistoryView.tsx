import React, { useState, useEffect, useMemo } from 'react';
import { ClaimAnalysis } from '../types/claim.ts';
import { investigationService, StorageStatus } from '../services/investigationService.ts';
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Search,
  ExternalLink,
  Trash2,
  Database,
  Layers,
  FileText,
  Filter,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  GitBranch,
} from 'lucide-react';

interface HistoryViewProps {
  historyList: ClaimAnalysis[];
  onSelectClaim: (claim: ClaimAnalysis) => void;
  onNewAnalysis: () => void;
  onDeleteClaim?: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyList,
  onSelectClaim,
  onNewAnalysis,
  onDeleteClaim,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'contradicted' | 'supported' | 'mixed' | 'unverified'>('all');
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    backend: 'api',
    serverReachable: true,
    message: 'Testing storage connection...',
  });

  useEffect(() => {
    investigationService.getStorageStatus().then((status) => {
      setStorageStatus(status);
    });
  }, []);

  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      // Search text match
      const textMatch =
        searchTerm.trim() === '' ||
        item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.coreClaim.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.inputClaim && item.inputClaim.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!textMatch) return false;

      // Status match
      if (statusFilter === 'all') return true;

      const verdictStatus = item.verdict?.status || '';
      if (statusFilter === 'contradicted') {
        return (
          verdictStatus === 'contradicted' ||
          item.status === 'Refuted' ||
          item.status === 'Low credibility'
        );
      }
      if (statusFilter === 'supported') {
        return verdictStatus === 'supported' || item.status === 'High credibility';
      }
      if (statusFilter === 'mixed') {
        return verdictStatus === 'mixed' || item.status === 'Needs review';
      }
      if (statusFilter === 'unverified') {
        return (
          verdictStatus === 'unverified' ||
          verdictStatus === 'insufficient_evidence' ||
          item.status === 'Unverified'
        );
      }
      return true;
    });
  }, [historyList, searchTerm, statusFilter]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this persistent investigation from history?')) {
      if (onDeleteClaim) {
        onDeleteClaim(id);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
              Investigation Log · Persistent History
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[#4F46E5] dark:text-indigo-300">
              <Database className="h-3 w-3" />
              <span>{storageStatus.serverReachable ? 'REST API Persistent Storage' : 'Local Storage Cache'}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white mt-0.5 tracking-tight">
            Claim Investigation History
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] dark:text-gray-400 mt-0.5">
            Previous claims investigated, audited with multi-evidence verdicts, and mapped into forensic lineage trees.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/25 hover:bg-[#4338CA] transition-all cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved claims, subjects, or keywords..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs font-mono">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-[#4F46E5] dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All ({historyList.length})
          </button>

          <button
            onClick={() => setStatusFilter('contradicted')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'contradicted'
                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Contradicted
          </button>

          <button
            onClick={() => setStatusFilter('supported')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'supported'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Supported
          </button>

          <button
            onClick={() => setStatusFilter('mixed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'mixed'
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Mixed
          </button>

          <button
            onClick={() => setStatusFilter('unverified')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'unverified'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Unverified
          </button>
        </div>
      </div>

      {/* Grid of History Items */}
      {filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-12 text-center space-y-3">
          <Database className="h-8 w-8 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No matching investigations found
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try adjusting your search query or status filter, or begin a new investigation to audit a claim.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="mt-2 text-xs font-mono font-bold text-[#4F46E5] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistory.map((item, index) => {
            const verdict = item.verdict;
            const hasVerdict = Boolean(verdict);
            const verdictStatus = verdict?.status;

            const isLow = verdictStatus === 'contradicted' || item.score < 30;
            const isMid = verdictStatus === 'mixed' || (item.score >= 30 && item.score < 60);
            const isSupported = verdictStatus === 'supported' || item.score >= 60;

            const statusBadge = isLow
              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-red-300'
              : isMid
              ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-[#F59E0B] dark:text-amber-300'
              : isSupported
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] dark:text-emerald-300'
              : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300';

            const statusLabel = hasVerdict
              ? verdictStatus!.replace('_', ' ').toUpperCase()
              : `${item.score}/100 · ${item.status}`;

            const sourcesCount = item.sources?.length || 0;
            const evidenceCount = item.evidenceItems?.length || 0;
            const supportingCount = verdict?.supportingEvidenceIds?.length || 0;
            const contradictingCount = verdict?.contradictingEvidenceIds?.length || 0;

            return (
              <div
                key={item.id || index}
                onClick={() => onSelectClaim(item)}
                className="investigation-card p-5 cursor-pointer flex flex-col justify-between space-y-4 hover:border-indigo-400 transition-all rounded-2xl border border-[#E5E7EB] dark:border-gray-800 bg-white dark:bg-[#111622] shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {item.timestamp || 'Recorded'}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border uppercase ${statusBadge}`}
                      >
                        {statusLabel}
                        {verdict && (
                          <span className="opacity-75">
                            ({Math.round(verdict.confidence * 100)}%)
                          </span>
                        )}
                      </span>

                      {onDeleteClaim && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all cursor-pointer"
                          title="Delete investigation from persistent storage"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#111827] dark:text-white leading-snug line-clamp-2">
                    “{item.text}”
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono line-clamp-1">
                    Core: {item.coreClaim}
                  </p>

                  {/* Summary Forensic Indicators */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      <span>{sourcesCount} Sources</span>
                    </span>

                    {evidenceCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        <span>{evidenceCount} Evidence</span>
                        {supportingCount > 0 && (
                          <span className="text-emerald-600 font-bold">+{supportingCount}</span>
                        )}
                        {contradictingCount > 0 && (
                          <span className="text-red-500 font-bold">-{contradictingCount}</span>
                        )}
                      </span>
                    )}

                    {item.isDemo && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                        Demo
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs font-mono text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3 text-indigo-500" />
                    <span>
                      {item.nodes.length} Nodes · {item.edges.length} Edges
                    </span>
                  </span>

                  <span className="text-[#4F46E5] dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Reopen Dossier</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
