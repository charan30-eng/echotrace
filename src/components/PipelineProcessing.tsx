import React, { useEffect, useState } from 'react';
import { InvestigationInput } from '../types/investigation';
import { claimExtractor } from '../services/claimExtractor';
import {
  Search,
  Layers,
  GitBranch,
  Scale,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  FileText,
  Link2,
  Share2,
} from 'lucide-react';

interface PipelineProcessingProps {
  claimText: string;
  investigationInput?: InvestigationInput | null;
  onComplete: () => void;
}

export const PipelineProcessing: React.FC<PipelineProcessingProps> = ({
  claimText,
  investigationInput,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const extractedClaim = claimExtractor.extract(
    claimText,
    investigationInput?.id,
    investigationInput?.platform
  ).primaryClaim;

  const steps = [
    {
      id: 'step-1',
      title: 'Claim Extraction & Tokenization',
      desc: 'Ingesting normalized input, stripping noise, and isolating candidate propositional claims (Phase 2).',
      icon: Search,
      duration: 600,
    },
    {
      id: 'step-2',
      title: 'Near-Duplicate Vector Matching',
      desc: 'Clustering paraphrased sentences and matching against known rumor signatures.',
      icon: Layers,
      duration: 650,
    },
    {
      id: 'step-3',
      title: 'Lineage & Mutation Chronology',
      desc: 'Reconstructing the DAG sequence across social hops to trace scope expansion.',
      icon: GitBranch,
      duration: 700,
    },
    {
      id: 'step-4',
      title: 'Contradiction & Conflict Resolution',
      desc: 'Cross-referencing claims against active institutional circulars and student portals.',
      icon: Scale,
      duration: 650,
    },
    {
      id: 'step-5',
      title: 'Verifiable Evidence Synthesis',
      desc: 'Compiling documentary proof and evaluating evidence corroboration.',
      icon: ShieldCheck,
      duration: 500,
    },
  ];

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const advanceStep = (stepIdx: number) => {
      if (stepIdx < steps.length) {
        setCurrentStepIndex(stepIdx);
        timeoutId = setTimeout(() => {
          advanceStep(stepIdx + 1);
        }, steps[stepIdx].duration);
      } else {
        timeoutId = setTimeout(() => {
          onComplete();
        }, 300);
      }
    };

    advanceStep(0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [onComplete]);

  const inputType = investigationInput?.inputType || 'text';
  const platform = investigationInput?.platform;
  const hostname = investigationInput?.metadata?.urlDetails?.hostname;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-gray-800 bg-white dark:bg-[#111622] p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-colors">
        {/* Header */}
        <div className="text-center pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
              Forensic Processing Pipeline
            </span>

            {investigationInput && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {inputType === 'text' && <FileText className="h-3 w-3" />}
                {inputType === 'url' && <Link2 className="h-3 w-3" />}
                {inputType === 'social' && <Share2 className="h-3 w-3" />}
                <span>
                  {inputType === 'text'
                    ? 'RAW TEXT'
                    : inputType === 'url'
                    ? `URL: ${hostname || 'WEB'}`
                    : `SOCIAL: ${(platform || '').toUpperCase()}`}
                </span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] dark:text-white mt-1">
            Deconstructing Ingested Input
          </h2>

          <p className="text-xs text-[#4B5563] dark:text-gray-300 mt-1 font-mono italic max-w-lg mx-auto truncate">
            “{claimText}”
          </p>

          {investigationInput?.id && (
            <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-1">
              Tracking ID: {investigationInput.id}
            </p>
          )}
        </div>

        {/* 5 Step Process List */}
        <div className="mt-6 space-y-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                    : isCompleted
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30 opacity-60'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-[#4F46E5] text-white shadow-2xs shadow-indigo-500/30'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-white">
                      {step.title}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                      Step 0{idx + 1}
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5563] dark:text-gray-400 mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>

                  {idx === 0 && (isCurrent || isCompleted) && (
                    <div className="mt-2 p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-[11px] font-mono animate-fadeIn">
                      <span className="text-[#4F46E5] dark:text-indigo-400 font-bold">Extracted Proposition:</span>{' '}
                      <span className="text-gray-900 dark:text-white font-semibold">“{extractedClaim.claimText}”</span>
                      <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        <span>Subject: <strong className="text-gray-700 dark:text-gray-200">{extractedClaim.subject || '—'}</strong></span>
                        <span>Action: <strong className="text-indigo-600 dark:text-indigo-400">{extractedClaim.action || '—'}</strong></span>
                        <span>Modality: <strong className="text-gray-700 dark:text-gray-200">{extractedClaim.modality}</strong></span>
                      </div>
                    </div>
                  )}

                  {idx === 3 && (isCurrent || isCompleted) && (
                    <div className="mt-2 p-2.5 rounded-lg bg-sky-50/80 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 text-[11px] font-mono animate-fadeIn">
                      <span className="text-sky-700 dark:text-sky-400 font-bold">Phase 3 Query Strategy:</span>
                      <div className="flex flex-col gap-1 text-[10px] text-gray-600 dark:text-gray-300 mt-1">
                        <span>1. Direct: <strong className="text-gray-900 dark:text-white">“{extractedClaim.claimText}”</strong></span>
                        <span>2. Institutional: <strong className="text-gray-900 dark:text-white">“{extractedClaim.subject || 'Institution'} official notice {extractedClaim.action || 'closure'}”</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="shrink-0 self-center">
                  {isCompleted && (
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                      Done
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[11px] font-mono font-bold text-[#4F46E5] dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded animate-pulse">
                      Running...
                    </span>
                  )}
                  {!isCompleted && !isCurrent && (
                    <span className="text-[11px] font-mono text-gray-400 dark:text-gray-600">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Skip button for live demo */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Mapping semantic graph nodes & conflicting circulars</span>
          <button
            type="button"
            onClick={onComplete}
            className="flex items-center gap-1 font-bold text-[#4F46E5] dark:text-indigo-400 hover:text-[#4338CA] transition-colors cursor-pointer"
          >
            <span>Skip to Results</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
