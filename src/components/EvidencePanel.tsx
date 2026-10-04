import React, { useState } from 'react';
import { VariantNode, Source } from '../types/claim';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
  ExternalLink,
  ChevronRight,
  X,
  FileCheck,
  Minimize2,
} from 'lucide-react';

interface EvidencePanelProps {
  nodes: VariantNode[];
  sources: Source[];
  onClose?: () => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  nodes,
  sources,
  onClose,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    nodes[nodes.length - 1]?.id || nodes[0]?.id || ''
  );
  const [detailsModalNode, setDetailsModalNode] = useState<VariantNode | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified source':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-[11px] font-mono font-bold text-[#16A34A]">
            <CheckCircle2 className="h-3 w-3" />
            VERIFIED
          </span>
        );
      case 'Contradictory':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-red-300 bg-red-50 text-[11px] font-mono font-bold text-[#DC2626]">
            <AlertCircle className="h-3 w-3" />
            CONFLICTING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-[11px] font-mono font-bold text-[#F59E0B]">
            <AlertTriangle className="h-3 w-3" />
            UNVERIFIED
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border-2 border-indigo-500/80 bg-white p-6 sm:p-7 shadow-[0_10px_35px_-10px_rgba(79,70,229,0.12)] relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
              Primary Evidence Audit
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              ACTIVE AUDIT
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-[#111827] mt-0.5">
            Evidence Panel
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Two-column timeline mapping documentary proof against circulated variants.
          </p>
        </div>

        {/* Informational notice & Collapse action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono text-gray-600">
            <Info className="h-3.5 w-3.5 text-[#4F46E5] shrink-0" />
            <span>Documentary Records</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Hide Panel</span>
            </button>
          )}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Evidence Timeline */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-mono font-bold uppercase text-gray-400">
              Timeline of Statements ({nodes.length} Items)
            </h4>
            <span className="text-[11px] font-mono text-gray-400">
              Click “Details” on any row to open full audit
            </span>
          </div>

          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`investigation-card p-4.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-500 uppercase text-[11px]">
                      {node.source.type}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="font-mono text-gray-500">
                      {node.timestamp}
                    </span>
                  </div>

                  {getStatusBadge(node.source.status)}
                </div>

                <p className="text-sm font-bold text-[#111827]">
                  “{node.text}”
                </p>

                <div className="mt-2.5 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span className="truncate max-w-[240px]">
                    {node.source.name}
                  </span>

                  {/* Fully functional Details Key */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setDetailsModalNode(node);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-2xs hover:scale-105"
                  >
                    <span>Details</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Source Details */}
        <div className="lg:col-span-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <span className="text-xs font-mono font-bold uppercase text-[#4F46E5]">
              Selected Source Dossier
            </span>
            <span className="text-xs font-mono text-gray-500">
              {selectedNode.timestamp}
            </span>
          </div>

          <div>
            <h4 className="text-base font-bold text-[#111827]">
              {selectedNode.source.name}
            </h4>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              {selectedNode.source.platform} · {selectedNode.source.type}
            </p>
          </div>

          {/* Statement quote */}
          <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
            <span className="text-[11px] font-mono uppercase font-bold text-gray-400 block mb-1">
              Documented Statement
            </span>
            <p className="text-sm font-semibold text-[#111827] leading-relaxed">
              “{selectedNode.text}”
            </p>
          </div>

          {/* Verification Attributes */}
          <div className="rounded-xl bg-white border border-gray-200 p-3.5 text-xs space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Relationship:</span>
              <span className="font-mono font-bold uppercase text-[#4F46E5]">
                {selectedNode.relationship}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Reliability Grade:</span>
              <span
                className={`font-bold capitalize font-mono ${
                  selectedNode.source.reliability === 'high'
                    ? 'text-[#16A34A]'
                    : selectedNode.source.reliability === 'medium'
                    ? 'text-[#F59E0B]'
                    : 'text-[#DC2626]'
                }`}
              >
                {selectedNode.source.reliability}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Verification Status:</span>
              <span>{getStatusBadge(selectedNode.source.status)}</span>
            </div>
          </div>

          {/* Evidence quote */}
          <div>
            <span className="text-xs font-mono uppercase font-bold text-gray-400 block mb-1">
              Verification Proof Reference
            </span>
            <p className="text-xs text-[#4B5563] leading-relaxed bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
              {selectedNode.evidenceRef}
            </p>
          </div>

          {/* Why It Matters */}
          <div>
            <span className="text-xs font-mono uppercase font-bold text-gray-400 block mb-1">
              Investigative Context
            </span>
            <p className="text-xs text-[#4B5563] leading-relaxed bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
              {selectedNode.whyItMatters}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setDetailsModalNode(selectedNode)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#4F46E5] text-xs font-bold text-white hover:bg-[#4338CA] transition-colors cursor-pointer shadow-xs"
            >
              <FileCheck className="h-4 w-4" />
              <span>Open Detailed Audit Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: Primary Evidence Details Modal */}
      {detailsModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#E5E7EB] p-6 sm:p-7 shadow-2xl relative space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4F46E5]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-[#4F46E5] block">
                    Evidence Audit Dossier
                  </span>
                  <h3 className="text-lg font-bold text-[#111827]">
                    {detailsModalNode.source.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setDetailsModalNode(null)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-500">
                Logged Statement ({detailsModalNode.timestamp})
              </span>
              <p className="text-sm font-bold text-[#111827] leading-relaxed">
                “{detailsModalNode.text}”
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Platform & Channel
                </span>
                <span className="font-bold text-[#111827] mt-0.5 block">
                  {detailsModalNode.source.platform}
                </span>
                <span className="text-gray-500 text-[11px]">
                  Type: {detailsModalNode.source.type}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Verification Status
                </span>
                <div className="mt-1">
                  {getStatusBadge(detailsModalNode.source.status)}
                </div>
                <span className="text-gray-500 text-[11px] block mt-1">
                  Reliability: <strong className="capitalize">{detailsModalNode.source.reliability}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-gray-500">
                Primary Archival Reference:
              </span>
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-[#1e1b4b] leading-relaxed">
                {detailsModalNode.evidenceRef}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-gray-500">
                Investigative Forensic Impact:
              </span>
              <p className="text-xs text-[#4B5563] leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200">
                {detailsModalNode.whyItMatters}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400">
                Archival Record ID: #{detailsModalNode.id.toUpperCase()}
              </span>

              <button
                onClick={() => setDetailsModalNode(null)}
                className="px-5 py-2 rounded-xl bg-[#4F46E5] text-xs font-bold text-white hover:bg-[#4338CA] transition-colors cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
