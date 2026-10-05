import React from 'react';
import { VariantNode, Source } from '../types/claim';
import {
  Table,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface SourceTableProps {
  nodes: VariantNode[];
  sources: Source[];
}

export const SourceTable: React.FC<SourceTableProps> = ({ nodes, sources }) => {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
            Cross-Source Comparison
          </span>
          <h3 className="text-lg font-extrabold text-[#111827] mt-0.5">
            Source Matrix
          </h3>
        </div>
        <span className="text-xs font-mono text-gray-400">
          {sources.length} Cataloged Sources
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 font-mono uppercase text-[11px]">
              <th className="py-2.5 pr-4 font-bold">Source Name</th>
              <th className="py-2.5 px-4 font-bold">Platform / Type</th>
              <th className="py-2.5 px-4 font-bold">Timestamp</th>
              <th className="py-2.5 px-4 font-bold">Reliability</th>
              <th className="py-2.5 pl-4 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono">
            {sources.map((src, index) => (
              <tr key={src.id || index} className="hover:bg-gray-50/50">
                <td className="py-3 pr-4 font-sans text-[#111827]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{src.name}</span>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4F46E5] hover:text-[#4338CA] shrink-0"
                        title={src.url}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {src.reliabilityExplanation && (
                    <p className="text-[11px] font-mono text-gray-500 font-normal mt-0.5 max-w-md truncate" title={src.reliabilityExplanation}>
                      {src.reliabilityExplanation}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {src.platform} ({src.type})
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {src.timestamp}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`font-bold capitalize ${
                      src.reliability === 'high'
                        ? 'text-[#16A34A]'
                        : src.reliability === 'medium'
                        ? 'text-[#F59E0B]'
                        : 'text-[#DC2626]'
                    }`}
                  >
                    {src.reliability}
                  </span>
                </td>
                <td className="py-3 pl-4 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      src.status === 'Verified source'
                        ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                        : src.status === 'Contradictory'
                        ? 'bg-red-50 text-[#DC2626] border border-red-200'
                        : 'bg-amber-50 text-[#F59E0B] border border-amber-200'
                    }`}
                  >
                    {src.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
