import React, { useRef, useState, useEffect } from 'react';
import { ClaimAnalysis, ActiveTab } from '../types/claim';
import { DEMO_SCENARIOS, SRM_DISCLAIMER_LABEL } from '../data/demoScenarios';
import { EvolutionGraph } from './EvolutionGraph';
import { EvidencePanel } from './EvidencePanel';
import { SourceTable } from './SourceTable';
import { AIExplanation } from './AIExplanation';
import { ScoreCalculationNote } from './ScoreCalculationNote';
import { StructuredClaimCard } from './StructuredClaimCard';
import { EvidenceSearchResultsCard } from './EvidenceSearchResultsCard';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Share2,
  Download,
  Info,
  ArrowRight,
  Sparkles,
  Search,
  Layers,
  Check,
  ChevronRight,
  FileCheck,
  X,
  GitBranch,
} from 'lucide-react';

interface DashboardProps {
  analysis: ClaimAnalysis;
  setActiveTab: (tab: ActiveTab) => void;
  onTraceAnother: () => void;
  onSwitchDemoScenario?: (scenarioId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analysis,
  setActiveTab,
  onTraceAnother,
  onSwitchDemoScenario,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(false);
  const [showScoreCalculation, setShowScoreCalculation] = useState(false);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const evidenceRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Esc to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEvolutionModalOpen(false);
        setIsEvidenceModalOpen(false);
        setShowScoreCalculation(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract factor scores for the calculation note
  const sourceFactor = analysis.factors?.find((f) =>
    f.name.toLowerCase().includes('source')
  );
  const authFactor = analysis.factors?.find((f) =>
    f.name.toLowerCase().includes('authority') || f.name.toLowerCase().includes('official')
  );
  const corrFactor = analysis.factors?.find((f) =>
    f.name.toLowerCase().includes('corroboration')
  );
  const consFactor = analysis.factors?.find((f) =>
    f.name.toLowerCase().includes('consistency')
  );

  const sourceVal = sourceFactor ? sourceFactor.score : 35;
  const authorityVal = authFactor ? authFactor.score : 10;
  const corroborationVal = corrFactor ? corrFactor.score : 40;
  const consistencyVal = consFactor ? consFactor.score : 20;

  const matchedScenario = DEMO_SCENARIOS.find(
    (s) =>
      s.analysis.id === analysis.id ||
      s.claim.toLowerCase() === analysis.inputClaim.toLowerCase()
  );

  const scenarioCategory = matchedScenario?.category || 'Custom Investigation';

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `EchoTrace Forensic Dossier: "${analysis.text}" - Credibility: ${analysis.score}/100 (${analysis.status})`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToEvidence = () => {
    setIsEvidencePanelOpen(true);
    setTimeout(() => {
      evidenceRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const isUnverified = analysis.status === 'Unverified';
  const isLow = !isUnverified && analysis.score < 30;
  const isMid = !isUnverified && analysis.score >= 30 && analysis.score < 60;
  const isHigh = !isUnverified && analysis.score >= 60;

  const ringColor = isUnverified ? '#6366F1' : isLow ? '#DC2626' : isMid ? '#F59E0B' : '#16A34A';
  const strokeDashoffset = isUnverified
    ? circumference * 0.75
    : circumference - (analysis.score / 100) * circumference;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 text-[#111827]">
      {/* Top Breadcrumb & Disclaimer Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-mono text-gray-500">
          <button
            onClick={() => setActiveTab('analyze')}
            className="hover:text-[#4F46E5] font-semibold transition-colors cursor-pointer"
          >
            Analyze
          </button>
          <span>/</span>
          <span className="font-bold text-[#111827]">{scenarioCategory}</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-amber-300 bg-amber-50 text-[11px] font-mono text-amber-900 shadow-2xs">
          <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="font-bold">{SRM_DISCLAIMER_LABEL}</span>
        </div>
      </div>

      {/* Top Header & Switch Demo Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
            Intelligence Dossier
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-0.5 tracking-tight">
            CLAIM ANALYSIS
          </h1>
        </div>

        {/* Demo Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {onSwitchDemoScenario && (
            <div className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-1.5 rounded-xl shadow-2xs">
              <Layers className="h-3.5 w-3.5 text-[#4F46E5] shrink-0" />
              <span className="text-xs font-mono font-bold text-gray-500 whitespace-nowrap">
                Switch Demo:
              </span>
              <select
                value={matchedScenario ? matchedScenario.id : 'srm-college-closure'}
                onChange={(e) => onSwitchDemoScenario(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#111827] focus:outline-none cursor-pointer pr-1"
              >
                {DEMO_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onTraceAnother}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Trace Another</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                <span className="text-[#16A34A]">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-gray-500" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Large Claim Card */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">
              Examined Statement
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] mt-1 leading-snug">
              “{analysis.text}”
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              Core proposition: {analysis.coreClaim}
            </p>

            {analysis.investigationInput && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-[#4F46E5] font-bold border border-indigo-200">
                  INPUT MODALITY: {analysis.investigationInput.inputType.toUpperCase()}
                </span>
                {analysis.investigationInput.platform && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold border border-sky-200">
                    PLATFORM: {analysis.investigationInput.platform.toUpperCase()}
                  </span>
                )}
                <span className="text-gray-400">
                  ID: {analysis.investigationInput.id}
                </span>
                <span className="text-gray-400">
                  {analysis.investigationInput.metadata?.charCount || analysis.text.length} chars
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-start shrink-0">
            {analysis.isDemo ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-xs font-mono font-bold text-amber-900 whitespace-nowrap">
                ILLUSTRATIVE DEMO DATA
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-xs font-mono font-bold text-[#4F46E5] whitespace-nowrap">
                PHASE 1 NORMALIZED INTAKE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Phase 2: Structured Claim Deconstruction Card */}
      {(analysis.extractedClaim || analysis.extractionResult) && (
        <StructuredClaimCard
          claim={analysis.extractedClaim}
          result={analysis.extractionResult}
          rawInput={analysis.inputClaim || analysis.text}
        />
      )}

      {/* Phase 3: Real Evidence Search & Retrieval */}
      <EvidenceSearchResultsCard
        claim={analysis.extractedClaim}
        initialResponse={analysis.evidenceSearchResponse}
        isDemo={analysis.isDemo}
      />

      {/* Dual Centerpiece Banner: Credibility Score with Evolution Graph */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="font-extrabold text-[#4F46E5] uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            ANALYSIS OUTPUT:
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white font-extrabold text-[#111827] border border-indigo-200/80 shadow-2xs">
            Credibility Score:{' '}
            {isUnverified ? (
              <span className="text-[#6366F1] font-bold">UNRATED (PENDING EVIDENCE SEARCH)</span>
            ) : (
              <>
                <span className={isLow ? 'text-[#DC2626]' : isMid ? 'text-[#F59E0B]' : 'text-[#16A34A]'}>
                  {analysis.score}/100
                </span>{' '}
                ({analysis.status})
              </>
            )}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white font-extrabold text-[#111827] border border-indigo-200/80 shadow-2xs">
            Evolution Graph: <span className="text-[#4F46E5]">{analysis.nodes.length} Nodes</span> ·{' '}
            <span className="text-[#4F46E5]">{analysis.edges.length} Edges</span>
          </span>
        </div>

        <button
          onClick={() => setIsEvolutionModalOpen(true)}
          className="text-xs font-bold text-[#4F46E5] dark:text-indigo-400 hover:text-[#4338CA] flex items-center gap-1.5 bg-white dark:bg-[#111622] border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer transition-colors"
          title="Open interactive evolution graph"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>View Evolution Graph</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Credibility Score & Why This Score Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Circular Score Ring Visualization */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div>
            <div className="flex items-center justify-between">
              <div
                onClick={() => setShowScoreCalculation(true)}
                className="flex items-center gap-1.5 cursor-pointer group"
                title="Click to view score derivation popup"
              >
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] group-hover:underline">
                  CREDIBILITY
                </span>
                {/* Tiny ⓘ icon */}
                <span
                  className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-indigo-100 group-hover:bg-[#C8FF3D] group-hover:text-[#0B0D10] text-[#4F46E5] text-[10px] font-bold font-mono transition-colors shadow-2xs"
                  title="How is this score calculated? (Click to view breakdown)"
                  aria-label="How is this score calculated?"
                >
                  ⓘ
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowScoreCalculation(true)}
                className="text-[11px] font-mono text-[#4F46E5] hover:text-[#4338CA] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Score Derivation ⓘ</span>
              </button>
            </div>

            <h3 className="text-lg font-extrabold text-[#111827] mt-0.5">
              Score Assessment
            </h3>
          </div>

          {/* Clean Ring Circular Visualization with click trigger to open score derivation popup */}
          <div
            onClick={() => setShowScoreCalculation(true)}
            className="my-5 flex items-center justify-center gap-8 py-4 border-y border-gray-100 cursor-pointer group hover:bg-gray-50/70 rounded-xl transition-all"
            title="Click to inspect score derivation popup"
          >
            <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black font-mono tracking-tighter text-[#111827]">
                  {isUnverified ? '—' : analysis.score}
                </span>
                <span className="text-xs font-mono text-gray-400 font-bold">
                  {isUnverified ? 'UNRATED' : '/ 100'}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-w-[190px]">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-black border uppercase ${
                  isUnverified
                    ? 'border-indigo-200 bg-indigo-50 text-[#4F46E5]'
                    : isLow
                    ? 'border-red-200 bg-red-50 text-[#DC2626]'
                    : isMid
                    ? 'border-amber-200 bg-amber-50 text-[#F59E0B]'
                    : 'border-emerald-200 bg-emerald-50 text-[#16A34A]'
                }`}
              >
                {analysis.status}
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">
                {isUnverified
                  ? 'Phase 1 normalized input. External evidence search and scoring pending Phase 3-4.'
                  : 'Calculated from uncorroborated social origin and verified authority denial.'}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-gray-400 mt-2">
            Algorithmic confidence rating: High · Non-probabilistic factual check
          </div>
        </div>

        {/* Right: WHY THIS SCORE? (Four horizontal factor cards) */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
                  Score Derivation
                </span>
                <h3 className="text-lg font-extrabold text-[#111827] mt-0.5">
                  WHY THIS SCORE?
                </h3>
              </div>
              <span className="text-xs font-mono text-gray-400 font-semibold">
                4 Component Factors
              </span>
            </div>

            {/* 4 Factor Horizontal Cards */}
            <div className="mt-4 space-y-3">
              {analysis.factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 transition-colors hover:border-gray-300"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#111827] uppercase font-mono tracking-tight text-[11px]">
                      {factor.name}
                    </span>
                    <span className="font-mono font-extrabold text-[#111827] tabular-nums">
                      {factor.score}{' '}
                      <span className="text-gray-400 font-normal">/ 100</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-700 ${
                        factor.score < 30
                          ? 'bg-[#DC2626]'
                          : factor.score < 60
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#16A34A]'
                      }`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>

                  <p className="text-xs text-[#4B5563] italic">
                    “{factor.explanation}”
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 flex items-center justify-between">
            <span>Every factor derives from physical proof.</span>
            <button
              onClick={() => setIsEvidenceModalOpen(true)}
              className="text-[#4F46E5] dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Evidence Panel</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Signature Feature: Claim Evolution Graph */}
      <div id="evolution-graph-section" className="relative">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
            Lineage DAG Timeline
          </span>
          <button
            onClick={() => setIsEvolutionModalOpen(true)}
            className="text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open in Fullscreen ⤢</span>
          </button>
        </div>
        <EvolutionGraph
          nodes={analysis.nodes}
          edges={analysis.edges}
          onSelectEvidence={() => setIsEvidenceModalOpen(true)}
        />
      </div>

      {/* Source Comparison Table */}
      <SourceTable nodes={analysis.nodes} sources={analysis.sources} />

      {/* AI Explanation Card */}
      <AIExplanation analysis={analysis} />

      {/* Score Derivation & Formula Calculation Popup Modal */}
      {showScoreCalculation && (
        <ScoreCalculationNote
          score={analysis.score}
          status={isLow ? 'LOW' : isMid ? 'MEDIUM' : 'HIGH'}
          sourceVal={sourceVal}
          authorityVal={authorityVal}
          corroborationVal={corroborationVal}
          consistencyVal={consistencyVal}
          onClose={() => setShowScoreCalculation(false)}
        />
      )}

      {/* 1. Fullscreen Evolution Graph Modal */}
      {isEvolutionModalOpen && (
        <div
          className="fixed inset-0 z-50 p-2 sm:p-3 md:p-4 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn"
          onClick={() => setIsEvolutionModalOpen(false)}
        >
          <div
            className="w-full h-full max-w-[99vw] max-h-[98vh] flex flex-col rounded-2xl border border-indigo-500/40 bg-white dark:bg-[#0B0E14] shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111622] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-[#4F46E5] dark:text-indigo-400">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Claim Evolution Graph
                  </h3>
                  <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                    Fullscreen multi-hop claim lineage & variant mutation DAG
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsEvolutionModalOpen(false);
                    setIsEvidenceModalOpen(true);
                  }}
                  className="text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                >
                  Inspect Evidence Panel →
                </button>
                <button
                  onClick={() => setIsEvolutionModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Close fullscreen view (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <EvolutionGraph
                nodes={analysis.nodes}
                edges={analysis.edges}
                onSelectEvidence={() => {
                  setIsEvolutionModalOpen(false);
                  setIsEvidenceModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Fullscreen Evidence Panel Modal */}
      {isEvidenceModalOpen && (
        <div
          className="fixed inset-0 z-50 p-2 sm:p-3 md:p-4 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn"
          onClick={() => setIsEvidenceModalOpen(false)}
        >
          <div
            className="w-full h-full max-w-[99vw] max-h-[98vh] flex flex-col rounded-2xl border border-indigo-500/40 bg-white dark:bg-[#0B0E14] shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111622] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Primary Evidence Audit & Verification
                  </h3>
                  <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                    Fullscreen documentary proof, authenticated circulars & source verification
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsEvidenceModalOpen(false);
                    setIsEvolutionModalOpen(true);
                  }}
                  className="text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  View Evolution Graph →
                </button>
                <button
                  onClick={() => setIsEvidenceModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Close fullscreen view (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <EvidencePanel
                nodes={analysis.nodes}
                sources={analysis.sources}
                onClose={() => setIsEvidenceModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
