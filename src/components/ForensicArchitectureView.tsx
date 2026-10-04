import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  ShieldCheck,
  GitBranch,
  Lock,
  Eye,
  ArrowRight,
  Database,
  Network,
  Scale,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  LockKeyhole,
} from 'lucide-react';
import { ActiveTab } from '../types/claim';

interface ForensicArchitectureViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const ForensicArchitectureView: React.FC<ForensicArchitectureViewProps> = ({
  setActiveTab,
}) => {
  const FIXED_FACTORS = [
    {
      id: 'source',
      name: 'Source Reliability',
      weight: 30,
      color: 'border-indigo-400 bg-indigo-50/60 text-[#4F46E5]',
      badgeColor: 'bg-indigo-600 text-white',
      barColor: 'bg-indigo-600',
      whyThisWeight:
        '30% weight enforces that unverified anonymous accounts, forward chains, or burner channels cannot achieve high veracity without cryptographic identity or reputable publication track record.',
      metrics: 'Domain DNS records, author signature, historical track record, institutional domain validation.',
      sampleScore: 35,
    },
    {
      id: 'authority',
      name: 'Institutional Authority',
      weight: 30,
      color: 'border-emerald-400 bg-emerald-50/60 text-[#16A34A]',
      badgeColor: 'bg-emerald-600 text-white',
      barColor: 'bg-emerald-600',
      whyThisWeight:
        '30% weight ensures that official registrar notices, authorized portals, or governing body circulars hold decisive influence. If an official body explicitly contradicts an informal rumor, the score automatically drops below review threshold.',
      metrics: 'Authenticated .edu/.gov domain signed bulletins, registrar circular hashes, official press release verification.',
      sampleScore: 10,
    },
    {
      id: 'corroboration',
      name: 'Independent Corroboration',
      weight: 25,
      color: 'border-amber-400 bg-amber-50/60 text-[#F59E0B]',
      badgeColor: 'bg-amber-600 text-white',
      barColor: 'bg-amber-600',
      whyThisWeight:
        '25% weight evaluates independent corroboration across disparate networks. It prevents echo-chamber false consensus where multiple accounts simply repost the exact same unverified forwarded screenshot.',
      metrics: 'Cross-platform citation topology, primary witness statements, registered press wire pickups.',
      sampleScore: 40,
    },
    {
      id: 'consistency',
      name: 'Temporal Consistency',
      weight: 15,
      color: 'border-violet-400 bg-violet-50/60 text-[#7C3AED]',
      badgeColor: 'bg-violet-600 text-white',
      barColor: 'bg-violet-600',
      whyThisWeight:
        '15% weight penalizes semantic drift and narrative scope creep. When an event’s timeline or severity inflates during forward chains (e.g. from “1 quiz postponed” to “entire campus closed”), temporal penalty is applied.',
      metrics: 'Levenshtein word distance, event timestamp chronology, scope escalation delta.',
      sampleScore: 20,
    },
  ];

  const sampleCalculatedScore = Math.round(
    FIXED_FACTORS.reduce((acc, f) => acc + (f.sampleScore * f.weight) / 100, 0)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12 text-[#111827]">
      {/* Title & Introduction */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
          Engineering Specifications
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl">
          FORENSIC ARCHITECTURE
        </h1>
        <p className="mt-3 text-base text-[#4B5563] leading-relaxed">
          EchoTrace decomposes viral statements into directed acyclic lineage graphs (DAGs).
          Every credibility metric is computed through standardized, explainable mathematics—never black-box classification or arbitrary adjustments.
        </p>
      </div>

      {/* 1. Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-xs space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#4F46E5]">
            <Network className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-[#111827]">
            Topological Lineage DAG
          </h3>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Constructs a multi-hop lineage graph connecting origin posts, paraphrased variants, and contradictory bulletins. Rather than checking strings in isolation, temporal order reveals which entity mutated the claim first.
          </p>
          <div className="pt-2 border-t border-gray-100 font-mono text-[11px] text-[#4F46E5] font-semibold">
            Directed Acyclic Graph Model
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-xs space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-[#7C3AED]">
            <GitBranch className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-[#111827]">
            Semantic Drift Calculus
          </h3>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Measures cosine similarity alongside Levenshtein edit distance to identify scope escalation. Detects when mild observations (e.g. “weather forecast rainy”) morph into urgent false imperatives (“all operations closed”).
          </p>
          <div className="pt-2 border-t border-gray-100 font-mono text-[11px] text-[#7C3AED] font-semibold">
            Threshold: Cosine &gt; 0.82 · Scope Delta
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-xs space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-[#16A34A]">
            <Scale className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-[#111827]">
            Source Hierarchy Matrix
          </h3>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Assigns deterministic authority tiers: Authenticated Institutional Domains (.edu, .gov) &gt; Registered Press Outlets &gt; Community Boards &gt; Anonymous Social Mentions.
          </p>
          <div className="pt-2 border-t border-gray-100 font-mono text-[11px] text-[#16A34A] font-semibold">
            Signed Domain Trust Validation
          </div>
        </div>
      </div>

      {/* 2. FIXED 4-FACTOR CREDIBILITY CALCULUS */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 sm:p-9 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[#4F46E5]">
                Standardized Mathematical Model
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                <LockKeyhole className="h-3 w-3" />
                FIXED ARCHITECTURAL WEIGHTS
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-[#111827] mt-1">
              4-Factor Credibility Calculus
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] mt-1 max-w-2xl leading-relaxed">
              Factor weights are permanently fixed in the core scoring engine to prevent subjective manipulation, bias, or arbitrary tweaking. Each factor holds an invariant mathematical proportion totaling exactly 100%.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl shrink-0 text-right">
            <span className="text-[11px] font-mono text-gray-500 block">Standardized Formula</span>
            <div className="text-xs font-mono font-bold text-indigo-700 mt-0.5">
              Score = 0.30·S + 0.30·A + 0.25·C + 0.15·T
            </div>
          </div>
        </div>

        {/* 4 Factor Detailed Architectural Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FIXED_FACTORS.map((factor) => (
            <div
              key={factor.id}
              className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#111827]">
                    {factor.name}
                  </span>
                  <span className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full ${factor.badgeColor}`}>
                    {factor.weight}% FIXED
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden my-3">
                  <div className={`h-full ${factor.barColor}`} style={{ width: `${factor.weight}%` }} />
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-mono uppercase font-bold text-gray-500 text-[10px] block">
                      Why This Fixed Weight:
                    </span>
                    <p className="text-[#374151] leading-relaxed mt-0.5">
                      {factor.whyThisWeight}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="font-mono uppercase font-bold text-gray-500 text-[10px] block">
                      Audited Metrics:
                    </span>
                    <p className="text-gray-500 font-mono text-[11px] mt-0.5">
                      {factor.metrics}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs font-mono text-gray-500">
                <span>Contribution: {factor.weight} / 100 max pts</span>
                <span className="text-emerald-700 font-bold">Standardized</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sample Demonstration Step-by-Step Calculation */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-[#4F46E5] flex items-center gap-1.5">
              <Calculator className="h-4 w-4" />
              Real Scenario Calculation Audit (SRM Closure Rumor)
            </span>
            <span className="text-xs font-mono font-bold text-red-600 bg-white border border-red-200 px-2 py-0.5 rounded">
              Final Credibility: {sampleCalculatedScore}/100 (Low)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-gray-500 block text-[10px]">Source (30%)</span>
              <span className="text-gray-900 font-bold">35 × 0.30 = 10.5</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-gray-500 block text-[10px]">Authority (30%)</span>
              <span className="text-gray-900 font-bold">10 × 0.30 = 3.0</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-gray-500 block text-[10px]">Corroboration (25%)</span>
              <span className="text-gray-900 font-bold">40 × 0.25 = 10.0</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-gray-500 block text-[10px]">Consistency (15%)</span>
              <span className="text-gray-900 font-bold">20 × 0.15 = 3.0</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 font-mono">
            Sum = 10.5 + 3.0 + 10.0 + 3.0 = <strong>26.5 ≈ 27/100</strong>. Factual refutation by registrar verified portal ensures mathematical integrity.
          </p>
        </div>

        {/* Trace CTA Banner */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#6B7280]">
            Ready to test this standardized engine on text, links, or public social posts?
          </div>
          <button
            onClick={() => setActiveTab('analyze')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#4338CA] transition-all cursor-pointer"
          >
            <span>Launch Analysis Console</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
