/**
 * EchoTrace Phase 10: Final Verdict Card Component
 * 
 * Formal Architecture:
 * ALL PREVIOUS EVIDENCE → FINAL VERDICT
 * 
 * Renders:
 * - Epistemic Status (SUPPORTED, CONTRADICTED, MIXED, INSUFFICIENT_EVIDENCE, UNVERIFIED)
 * - Non-absolutist Confidence (Assessment confidence based on evidence, NOT 100% truth)
 * - Grounded Explanation referencing primary documentary evidence excerpts
 * - Supporting & Contradicting Evidence IDs
 * - Key Factors with Directional Impact ('positive' | 'negative' | 'neutral')
 * - Transparent Methodological & Investigative Limitations
 */

import React, { useState } from 'react';
import { Verdict } from '../types/verdict.ts';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Scale,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface VerdictCardProps {
  verdict: Verdict;
  onInspectEvidence?: () => void;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({ verdict, onInspectEvidence }) => {
  const [showAllLimitations, setShowAllLimitations] = useState(false);

  const getStatusConfig = () => {
    switch (verdict.status) {
      case 'supported':
        return {
          label: 'SUPPORTED BY AVAILABLE EVIDENCE',
          badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          icon: <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          accentBar: 'bg-emerald-500',
          ringColor: '#10B981',
          bgHighlight: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40',
        };
      case 'contradicted':
        return {
          label: 'CONTRADICTED BY AUTHORITATIVE EVIDENCE',
          badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
          icon: <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />,
          accentBar: 'bg-rose-500',
          ringColor: '#F43F5E',
          bgHighlight: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40',
        };
      case 'mixed':
        return {
          label: 'EVIDENCE IS MIXED ACROSS SOURCES',
          badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />,
          accentBar: 'bg-amber-500',
          ringColor: '#F59E0B',
          bgHighlight: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40',
        };
      case 'insufficient_evidence':
        return {
          label: 'INSUFFICIENT EVIDENCE TO DETERMINE',
          badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
          icon: <HelpCircle className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0" />,
          accentBar: 'bg-slate-500',
          ringColor: '#64748B',
          bgHighlight: 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800',
        };
      case 'unverified':
      default:
        return {
          label: 'UNVERIFIED / PENDING DOCUMENTARY AUDIT',
          badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
          icon: <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />,
          accentBar: 'bg-indigo-500',
          ringColor: '#6366F1',
          bgHighlight: 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40',
        };
    }
  };

  const config = getStatusConfig();
  const confidencePercent = Math.round(verdict.confidence * 100);

  const getImpactBadge = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Positive Support
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            Contradicting / Risk
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Neutral / Context
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-white dark:bg-[#0E121A] p-6 sm:p-7 shadow-[0_8px_30px_-6px_rgba(79,70,229,0.08)] relative overflow-hidden transition-all">
      {/* Top Phase 10 Accent Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
                PHASE 10 FORENSIC SYNTHESIS
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Final Assessment
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#111827] dark:text-white mt-0.5 tracking-tight">
              EVIDENCE-GROUNDED VERDICT
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>{new Date(verdict.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>·</span>
          <span className="text-gray-400">Zero Hard-Coded Scores</span>
        </div>
      </div>

      {/* Main Verdict Status Banner */}
      <div className={`mt-5 rounded-xl border p-4 sm:p-5 ${config.bgHighlight} transition-all`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-white dark:bg-[#161B26] shadow-2xs border border-gray-200/60 dark:border-gray-800">
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
                  EPSTEMIC VERDICT STATUS
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black tracking-tight text-[#111827] dark:text-white mt-0.5">
                {config.label}
              </h4>
            </div>
          </div>

          {/* Assessment Confidence Meter (NOT Mathematical Truth) */}
          <div className="bg-white/80 dark:bg-[#121620]/80 border border-gray-200/80 dark:border-gray-800 p-3 rounded-xl min-w-[210px] shadow-2xs">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-gray-500 dark:text-gray-400 font-bold">Assessment Confidence:</span>
              <span className="font-extrabold text-[#111827] dark:text-white">{confidencePercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${config.accentBar}`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="block text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-1 leading-tight">
              Evidence-based assessment confidence (never claims 100% absolute truth)
            </span>
          </div>
        </div>

        {/* Grounded Explanation Box referencing documentary evidence */}
        <div className="mt-4 pt-3.5 border-t border-gray-200/60 dark:border-gray-800 text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-sans">
          <p className="font-medium">
            {verdict.explanation}
          </p>
        </div>
      </div>

      {/* Supporting vs Contradicting Evidence Cross-Reference */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Supporting Evidence IDs */}
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 p-3.5">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Supporting Evidence ({verdict.supportingEvidenceIds.length})
            </span>
            {verdict.supportingEvidenceIds.length > 0 && onInspectEvidence && (
              <button
                onClick={onInspectEvidence}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Inspect</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {verdict.supportingEvidenceIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {verdict.supportingEvidenceIds.map((id) => (
                <span
                  key={id}
                  className="px-2 py-0.5 rounded bg-white dark:bg-[#111827] text-[11px] font-mono font-semibold text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                >
                  {id}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic font-mono">
              Zero documentary evidence affirmed this proposition.
            </p>
          )}
        </div>

        {/* Contradicting Evidence IDs */}
        <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 p-3.5">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              Contradicting Evidence ({verdict.contradictingEvidenceIds.length})
            </span>
            {verdict.contradictingEvidenceIds.length > 0 && onInspectEvidence && (
              <button
                onClick={onInspectEvidence}
                className="text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Inspect</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {verdict.contradictingEvidenceIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {verdict.contradictingEvidenceIds.map((id) => (
                <span
                  key={id}
                  className="px-2 py-0.5 rounded bg-white dark:bg-[#111827] text-[11px] font-mono font-semibold text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800 shadow-2xs"
                >
                  {id}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic font-mono">
              Zero authoritative refutations detected in available records.
            </p>
          )}
        </div>
      </div>

      {/* 4-5 Key Verdict Factors */}
      <div className="mt-5">
        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Synthesized Key Factors ({verdict.keyFactors.length})
          </span>
          <span className="text-[11px] font-mono text-gray-400">
            Multi-Angle Forensic Rubric
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {verdict.keyFactors.map((factor, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-3.5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-[#111827] dark:text-white">
                  {factor.name}
                </span>
                {getImpactBadge(factor.impact)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
                {factor.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Forensic Limitations & Epistemic Boundaries */}
      <div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Epistemic Limitations & Investigative Boundaries ({verdict.limitations.length})
            </span>
          </div>
          <button
            onClick={() => setShowAllLimitations((prev) => !prev)}
            className="text-xs font-mono text-[#4F46E5] dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showAllLimitations ? 'Show Less' : 'View All'}</span>
            {showAllLimitations ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <ul className="mt-2.5 space-y-1.5 text-xs text-gray-500 dark:text-gray-400 font-sans">
          {(showAllLimitations ? verdict.limitations : verdict.limitations.slice(0, 2)).map(
            (limitation, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-500 dark:text-indigo-400 font-bold shrink-0">•</span>
                <span>{limitation}</span>
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  );
};
