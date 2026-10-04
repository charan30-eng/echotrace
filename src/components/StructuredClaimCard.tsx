import React, { useState } from 'react';
import { ExtractedClaim, ClaimExtractionResult } from '../types/claimExtraction';
import {
  FileText,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  AlertTriangle,
  Tag,
  Clock,
  MapPin,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface StructuredClaimCardProps {
  claim?: ExtractedClaim;
  result?: ClaimExtractionResult;
  rawInput?: string;
}

export const StructuredClaimCard: React.FC<StructuredClaimCardProps> = ({
  claim,
  result,
  rawInput,
}) => {
  const [selectedClaimIdx, setSelectedClaimIdx] = useState<number>(0);

  // Fallback if neither claim nor result is supplied
  if (!claim && !result) {
    return null;
  }

  const activeResult = result;
  const claimsList = activeResult?.detectedClaims && activeResult.detectedClaims.length > 0
    ? activeResult.detectedClaims
    : claim
    ? [claim]
    : [];

  const activeClaim = claimsList[selectedClaimIdx] || claim || claimsList[0];
  const originalInput = rawInput || activeClaim.originalInput;

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-[#111624] dark:via-[#0F131D] dark:to-[#0F131D] p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(79,70,229,0.08)] space-y-6 transition-colors">
      {/* Three-Tier Forensic Distinction Bar (Requirement 2) */}
      <div className="pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#4F46E5] text-white text-xs font-bold font-mono">
              P2
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
              Phase 2: Claim Extraction & Structure
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 shadow-2xs">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>EXTRACTED CLAIM ≠ VERIFIED FACT</span>
          </div>
        </div>

        {/* Linear Stage Pipeline Visualizer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-400 block font-bold">STAGE 1</span>
              <span className="font-bold text-gray-700 dark:text-gray-200 truncate block">Raw User Input</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/70 flex items-center gap-2 shadow-2xs">
            <div className="h-2 w-2 rounded-full bg-[#4F46E5] animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-[#4F46E5] dark:text-indigo-300 block font-bold">STAGE 2 (ACTIVE)</span>
              <span className="font-bold text-[#111827] dark:text-white truncate block">Extracted Proposition</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/30 flex items-center gap-2 opacity-70">
            <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-400 block font-bold">STAGE 3 (PENDING)</span>
              <span className="font-bold text-gray-500 dark:text-gray-400 truncate block">Evidence Search</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multiple Claims Selector (Requirement 3) */}
      {activeResult?.hasMultipleClaims && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Multiple Discrete Claims Detected ({claimsList.length} assertions in input):</span>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
            The input contains compound or independent claims. EchoTrace isolates each proposition separately instead of conflating them into a single query.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {claimsList.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClaimIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedClaimIdx === idx
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white dark:bg-gray-900 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100/50'
                }`}
              >
                Claim 0{idx + 1}: {c.subject || 'Assertion'} ({c.action || 'claim'})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ambiguity & Uncertainty Banner (Requirements 4 & 5) */}
      {activeClaim.isAmbiguous && (
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold font-mono">Modality Qualifier Preserved:</span>
            <p className="leading-relaxed text-[11px] text-indigo-900/80 dark:text-indigo-300">
              {activeClaim.ambiguityNotes ||
                `The proposition contains modal uncertainty ('${activeClaim.modality}'). EchoTrace preserved this qualifier rather than converting it into a definitive assertion.`}
            </p>
          </div>
        </div>
      )}

      {/* Side-by-Side: Raw Input vs Extracted Proposition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Raw User Input */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              1. Raw Unfiltered Input
            </span>
            <span className="text-[10px] font-mono text-gray-400">Input Layer</span>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 italic font-mono leading-relaxed break-words">
            “{originalInput}”
          </p>
          <div className="text-[10px] font-mono text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-800">
            Conversational framing, attribution, and forward tags captured.
          </div>
        </div>

        {/* Right: Extracted Structured Proposition */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-gray-900/80 p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
              2. Isolated Propositional Claim
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-[#4F46E5] dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {activeClaim.modality}
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-[#111827] dark:text-white leading-snug">
            “{activeClaim.claimText}”
          </h4>
          <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
            Atomic statement formatted for Phase 3 evidence verification.
          </div>
        </div>
      </div>

      {/* Semantic Tuple Breakdown Grid (Subject, Action, Object, Time, Reason, Location) */}
      <div className="space-y-2.5">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
          Semantic Claim Tuple Deconstruction:
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {/* Subject */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Subject</span>
            <span className="text-xs font-bold text-[#111827] dark:text-white truncate block" title={activeClaim.subject}>
              {activeClaim.subject || '—'}
            </span>
          </div>

          {/* Action / Predicate */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Action</span>
            <span className="text-xs font-bold text-[#4F46E5] dark:text-indigo-400 truncate block uppercase font-mono" title={activeClaim.action}>
              {activeClaim.action || '—'}
            </span>
          </div>

          {/* Time Reference */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Time</span>
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate block capitalize" title={activeClaim.timeReference}>
              {activeClaim.timeReference || 'unspecified'}
            </span>
          </div>

          {/* Reason */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Reason</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate block capitalize" title={activeClaim.reason}>
              {activeClaim.reason || 'unspecified'}
            </span>
          </div>

          {/* Location */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>Location</span>
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate block capitalize" title={activeClaim.location}>
              {activeClaim.location || 'campus-wide'}
            </span>
          </div>

          {/* Modality */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Modality</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate block capitalize" title={activeClaim.modality}>
              {activeClaim.modality}
            </span>
          </div>
        </div>
      </div>

      {/* Entities & Search Query Keywords */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Entities */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Named Entities ({activeClaim.entities.length})
            </span>
            <span className="text-[10px] font-mono text-gray-400">Ontology Mapping</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeClaim.entities.map((entity, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
              >
                <span>{entity}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Phase 3 Search Keywords */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Evidence Search Keywords ({activeClaim.keywords.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Phase 3 Ready</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeClaim.keywords.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              >
                <Search className="h-2.5 w-2.5 text-gray-400" />
                <span>{kw}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
