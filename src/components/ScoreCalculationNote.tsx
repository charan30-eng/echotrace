import React, { useState, useEffect } from 'react';
import { X, Calculator, ShieldCheck } from 'lucide-react';

interface ScoreCalculationNoteProps {
  score?: number;
  status?: string;
  sourceVal?: number;
  authorityVal?: number;
  corroborationVal?: number;
  consistencyVal?: number;
  onClose: () => void;
}

export const ScoreCalculationNote: React.FC<ScoreCalculationNoteProps> = ({
  score = 27,
  status = 'LOW',
  sourceVal = 35,
  authorityVal = 10,
  corroborationVal = 40,
  consistencyVal = 20,
  onClose,
}) => {
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimStep(1), 60),
      setTimeout(() => setAnimStep(2), 160),
      setTimeout(() => setAnimStep(3), 260),
      setTimeout(() => setAnimStep(4), 360),
      setTimeout(() => setAnimStep(5), 460),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const sourceWeighted = (sourceVal * 0.3).toFixed(1);
  const authWeighted = (authorityVal * 0.3).toFixed(1);
  const corrWeighted = (corroborationVal * 0.25).toFixed(1);
  const consWeighted = (consistencyVal * 0.15).toFixed(1);
  const sumRaw = (
    parseFloat(sourceWeighted) +
    parseFloat(authWeighted) +
    parseFloat(corrWeighted) +
    parseFloat(consWeighted)
  ).toFixed(1);
  const finalRounded = Math.round(parseFloat(sumRaw));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full max-h-[92vh] overflow-y-auto rounded-2xl border border-indigo-500/40 bg-[#0B0D10] text-[#F5F7FA] p-6 shadow-2xl relative font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle coordinate grid watermark */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-xs font-extrabold tracking-wider uppercase text-sky-400 block">
                HOW IS THIS SCORE CALCULATED?
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                Score Derivation & Credibility Calculus
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Intro in very simple language */}
        <div className="relative z-10 mt-3 text-xs sm:text-sm text-[#E2E8F0] leading-relaxed">
          “EchoTrace calculates credibility using four factors. Each factor has a different weight based on how important it is for evaluating a claim.”
        </div>

        {/* The Formula with enhanced font colours */}
        <div className="relative z-10 mt-3.5 p-3.5 rounded-xl bg-[#11151A] border border-white/10 font-mono text-xs">
          <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>CREDIBILITY SCORE =</span>
            <span className="text-[10px] text-gray-400 font-normal">Invariant 100% weights</span>
          </div>
          <div className="space-y-1 text-[12px] sm:text-[13px] leading-relaxed">
            <div className="text-sky-300 font-bold">
              (Source × 30%)
            </div>
            <div className="text-violet-300 font-bold">
              + (Authority × 30%)
            </div>
            <div className="text-emerald-300 font-bold">
              + (Corroboration × 25%)
            </div>
            <div className="text-amber-300 font-bold">
              + (Consistency × 15%)
            </div>
          </div>
        </div>

        {/* Simple explanation for each factor with color-coded badges */}
        <div className="relative z-10 mt-3.5 space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-[#11151A]/80 border border-sky-500/20">
            <div className="font-mono font-bold text-xs text-sky-400 flex items-center justify-between">
              <span>SOURCE — 30%</span>
              <span className="text-[10px] text-gray-400 font-normal">Weight: 0.30</span>
            </div>
            <div className="text-gray-300 text-[11px] mt-0.5 leading-snug">
              How trustworthy is the source that originally made the claim?
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#11151A]/80 border border-violet-500/20">
            <div className="font-mono font-bold text-xs text-violet-400 flex items-center justify-between">
              <span>AUTHORITY — 30%</span>
              <span className="text-[10px] text-gray-400 font-normal">Weight: 0.30</span>
            </div>
            <div className="text-gray-300 text-[11px] mt-0.5 leading-snug">
              Does the source have legitimate authority to make or confirm this claim?
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#11151A]/80 border border-emerald-500/20">
            <div className="font-mono font-bold text-xs text-emerald-400 flex items-center justify-between">
              <span>CORROBORATION — 25%</span>
              <span className="text-[10px] text-gray-400 font-normal">Weight: 0.25</span>
            </div>
            <div className="text-gray-300 text-[11px] mt-0.5 leading-snug">
              Do other independent sources support the same information?
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#11151A]/80 border border-amber-500/20">
            <div className="font-mono font-bold text-xs text-amber-400 flex items-center justify-between">
              <span>CONSISTENCY — 15%</span>
              <span className="text-[10px] text-gray-400 font-normal">Weight: 0.15</span>
            </div>
            <div className="text-gray-300 text-[11px] mt-0.5 leading-snug">
              Does the claim remain consistent across different versions and sources?
            </div>
          </div>
        </div>

        {/* Current Case Calculation with Staggered Animation & vibrant font colours */}
        <div className="relative z-10 mt-4 pt-3 border-t border-white/10 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-400">
            CURRENT CASE CALCULATION:
          </div>

          {/* Factor Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px]">
            <div className="bg-[#11151A] p-2 rounded-lg border border-sky-500/20">
              <span className="text-gray-400 block text-[9px]">SOURCE</span>
              <span className="font-bold text-sky-300 text-xs">{sourceVal}</span>
            </div>
            <div className="bg-[#11151A] p-2 rounded-lg border border-violet-500/20">
              <span className="text-gray-400 block text-[9px]">AUTHORITY</span>
              <span className="font-bold text-violet-300 text-xs">{authorityVal}</span>
            </div>
            <div className="bg-[#11151A] p-2 rounded-lg border border-emerald-500/20">
              <span className="text-gray-400 block text-[9px]">CORROBORATION</span>
              <span className="font-bold text-emerald-300 text-xs">{corroborationVal}</span>
            </div>
            <div className="bg-[#11151A] p-2 rounded-lg border border-amber-500/20">
              <span className="text-gray-400 block text-[9px]">CONSISTENCY</span>
              <span className="font-bold text-amber-300 text-xs">{consistencyVal}</span>
            </div>
          </div>

          {/* Step-by-step Multiplication Lines with animated color-coded terms */}
          <div className="p-3.5 rounded-xl bg-[#11151A] border border-white/10 font-mono text-xs space-y-1.5">
            <div
              className={`transition-all duration-300 ${
                animStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`}
            >
              <span className="text-gray-400">({sourceVal} × 0.30)</span>{' '}
              <span className="text-gray-500">=</span>{' '}
              <span className="text-sky-300 font-bold text-[13px]">{sourceWeighted}</span>
            </div>

            <div
              className={`transition-all duration-300 ${
                animStep >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`}
            >
              <span className="text-gray-400">({authorityVal} × 0.30)</span>{' '}
              <span className="text-gray-500">=</span>{' '}
              <span className="text-violet-300 font-bold text-[13px]">{authWeighted}</span>
            </div>

            <div
              className={`transition-all duration-300 ${
                animStep >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`}
            >
              <span className="text-gray-400">({corroborationVal} × 0.25)</span>{' '}
              <span className="text-gray-500">=</span>{' '}
              <span className="text-emerald-300 font-bold text-[13px]">{corrWeighted}</span>
            </div>

            <div
              className={`transition-all duration-300 ${
                animStep >= 4 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`}
            >
              <span className="text-gray-400">({consistencyVal} × 0.15)</span>{' '}
              <span className="text-gray-500">=</span>{' '}
              <span className="text-amber-300 font-bold text-[13px]">{consWeighted}</span>
            </div>

            {/* Summation line */}
            <div
              className={`mt-2 pt-2.5 border-t border-white/10 transition-all duration-300 ${
                animStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <div className="text-[11px] text-gray-400 font-mono">
                <span className="text-sky-300">{sourceWeighted}</span> +{' '}
                <span className="text-violet-300">{authWeighted}</span> +{' '}
                <span className="text-emerald-300">{corrWeighted}</span> +{' '}
                <span className="text-amber-300">{consWeighted}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                = {sumRaw}{' '}
                <span className="text-[#C8FF3D] font-black text-base ml-2">
                  ≈ {finalRounded}/100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FINAL RESULT CARD */}
        <div className="relative z-10 mt-3.5 p-3.5 rounded-xl bg-[#11151A] border-2 border-[#C8FF3D]/60 flex items-center justify-between shadow-lg shadow-[#C8FF3D]/5">
          <div>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block font-bold">
              FINAL RESULT
            </span>
            <span className="text-xs font-mono font-extrabold text-white">
              CREDIBILITY SCORE
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="font-mono text-2xl font-black text-[#C8FF3D] tracking-tight">
              {finalRounded}/100
            </span>
            <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400 uppercase">
              {status}
            </span>
          </div>
        </div>

        {/* Note underneath */}
        <p className="relative z-10 mt-3 text-[10px] text-gray-400 leading-relaxed italic border-t border-white/5 pt-2.5">
          “Scores are calculated using EchoTrace’s predefined credibility methodology. The score is an analytical indicator, not a guarantee that a claim is true or false.”
        </p>

        {/* Close Button at bottom */}
        <div className="relative z-10 mt-4 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono font-bold text-white border border-white/10 transition-colors cursor-pointer"
          >
            Close Score Derivation
          </button>
        </div>
      </div>
    </div>
  );
};
