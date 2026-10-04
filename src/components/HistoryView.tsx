import React from 'react';
import { ClaimAnalysis } from '../types/claim';
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Search,
  ExternalLink,
} from 'lucide-react';

interface HistoryViewProps {
  historyList: ClaimAnalysis[];
  onSelectClaim: (claim: ClaimAnalysis) => void;
  onNewAnalysis: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyList,
  onSelectClaim,
  onNewAnalysis,
}) => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
            Investigation Log
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-0.5 tracking-tight">
            Claim Investigation History
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5">
            Previous claims analyzed and mapped into forensic lineage trees.
          </p>
        </div>

        <button
          onClick={onNewAnalysis}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/25 hover:bg-[#4338CA] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Search className="h-3.5 w-3.5" />
          <span>New Investigation</span>
        </button>
      </div>

      {/* Grid of History Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {historyList.map((item, index) => {
          const isLow = item.score < 30;
          const isMid = item.score >= 30 && item.score < 60;
          const statusBadge = isLow
            ? 'border-red-200 bg-red-50 text-[#DC2626]'
            : isMid
            ? 'border-amber-200 bg-amber-50 text-[#F59E0B]'
            : 'border-emerald-200 bg-emerald-50 text-[#16A34A]';

          return (
            <div
              key={item.id || index}
              onClick={() => onSelectClaim(item)}
              className="investigation-card p-5 cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-mono text-gray-500 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {item.timestamp}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border uppercase ${statusBadge}`}
                  >
                    {item.score}/100 · {item.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#111827] leading-snug line-clamp-2">
                  “{item.text}”
                </h3>

                <p className="text-xs text-gray-500 mt-2 font-mono line-clamp-1">
                  Core: {item.coreClaim}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-mono text-gray-500">
                <span>
                  {item.nodes.length} Nodes · {item.edges.length} Edges
                </span>

                <span className="text-[#4F46E5] font-bold flex items-center gap-1 hover:underline">
                  <span>View Dossier</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
