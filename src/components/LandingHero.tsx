import React from 'react';
import { ActiveTab } from '../types/claim';
import { DEMO_SCENARIOS, DemoScenarioItem } from '../data/demoScenarios';
import {
  ArrowRight,
  Shield,
  Search,
  Sparkles,
  GitBranch,
  Layers,
  ShieldCheck,
  Workflow,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface LandingHeroProps {
  setActiveTab: (tab: ActiveTab) => void;
  onLaunchDemo: () => void;
  onSelectDemoScenario: (scenario: DemoScenarioItem) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  setActiveTab,
  onLaunchDemo,
  onSelectDemoScenario,
}) => {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16 bg-[#F7F8FC] dark:bg-[#0B0E14] text-[#111827] dark:text-[#F8FAFC] transition-colors">
      {/* ================================================== */}
      {/* 1. HERO SECTION                                    */}
      {/* ================================================== */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 lg:pt-24 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-gradient-to-b from-white via-indigo-50/20 to-white dark:from-[#0B0E14] dark:via-[#111624] dark:to-[#0B0E14]">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-light-grid opacity-60 dark:opacity-30 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
              Claim Intelligence & Lineage System
            </span>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#111827] dark:text-white leading-[1.08]">
              Don&apos;t just detect misinformation.{' '}
              <span className="text-[#4F46E5] dark:text-indigo-400 block sm:inline">Trace it.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#4B5563] dark:text-slate-300 leading-relaxed max-w-2xl font-normal">
              EchoTrace reconstructs the forensic journey of unverified statements: where they originated, how narrative drift mutated them, where sources conflict, and what evidence supports or refutes them.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => setActiveTab('analyze')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-3.5 text-sm font-bold text-white shadow-sm shadow-indigo-500/25 hover:bg-[#4338CA] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <span>Analyze a Claim</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#111622] px-6 py-3.5 text-sm font-bold text-[#111827] dark:text-white shadow-xs hover:bg-gray-50 dark:hover:bg-[#161D2E] hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <span>View Investigation History</span>
              </button>
            </div>

            {/* Quick value props */}
            <div className="pt-6 border-t border-gray-200/80 dark:border-gray-800 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-bold text-[#111827] dark:text-white">Investigation Log</p>
                <p className="text-[#6B7280] dark:text-slate-400 mt-0.5">Origin channel audit</p>
              </div>
              <div>
                <p className="font-bold text-[#111827] dark:text-white">Mutation Engine</p>
                <p className="text-[#6B7280] dark:text-slate-400 mt-0.5">Detect narrative drift</p>
              </div>
              <div>
                <p className="font-bold text-[#111827] dark:text-white">Evidence Anchor</p>
                <p className="text-[#6B7280] dark:text-slate-400 mt-0.5">Primary physical proof</p>
              </div>
            </div>
          </div>

          {/* Tactical Hero Visual Preview Card */}
          <div className="mt-12 sm:mt-16 rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#111622] p-6 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/50 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs font-bold text-[#111827] dark:text-white uppercase tracking-wider">
                  LINEAGE DAG SIMULATION
                </span>
                <span className="font-mono text-[11px] text-[#6B7280] dark:text-slate-400">
                  5 Nodes · 4 Multi-hop Edges
                </span>
              </div>

              <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                SIMULATED DATA
              </span>
            </div>

            <div className="py-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Examined Statement
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] dark:text-white mt-1">
                “SRM College is closed tomorrow due to heavy rain.”
              </h2>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-xs">
                  <span className="font-mono font-bold text-cyan-800 dark:text-cyan-300 uppercase block mb-1">
                    01. ORIGIN
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-slate-200 leading-snug">
                    Student Forum mention of weather forecast
                  </p>
                  <span className="text-gray-500 dark:text-slate-400 font-mono text-[11px] mt-2 block">
                    09:02 AM · Unverified
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs">
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-300 uppercase block mb-1">
                    02. MUTATION
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-slate-200 leading-snug">
                    Reshared as imperative holiday statement
                  </p>
                  <span className="text-gray-500 dark:text-slate-400 font-mono text-[11px] mt-2 block">
                    11:40 AM · Scope Escalation
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs">
                  <span className="font-mono font-bold text-red-800 dark:text-red-300 uppercase block mb-1">
                    03. CONTRADICTION
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-slate-200 leading-snug">
                    Internal portal notice contradicts holiday
                  </p>
                  <span className="text-gray-500 dark:text-slate-400 font-mono text-[11px] mt-2 block">
                    10:15 AM · Portal Log
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 uppercase block mb-1">
                    04. EVIDENCE
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-slate-200 leading-snug">
                    Official Registrar circular confirms normal schedule
                  </p>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-bold mt-2 block">
                    12:05 PM · Signed Authority
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B7280] dark:text-slate-400">
              <span className="font-mono">
                Standardized 4-Factor Credibility Calculus: <strong className="text-gray-900 dark:text-white">27 / 100 (Low)</strong>
              </span>

              <button
                onClick={onLaunchDemo}
                className="text-[#4F46E5] dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View full investigation trace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* 2. SECTION: CONTINUOUS FORENSICS                   */}
      {/* ================================================== */}
      <section className="py-20 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-[#F7F8FC] dark:bg-[#0B0E14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
              Continuous Lineage Architecture
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-[#111827] dark:text-white sm:text-4xl tracking-tight">
              From verdict to trace.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#4B5563] dark:text-slate-300">
              Digital investigations powered by multi-hop graph lineage.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border-2 border-indigo-500 dark:border-indigo-500/80 bg-white dark:bg-[#111622] p-7 sm:p-10 shadow-xl shadow-indigo-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#4F46E5] text-white text-[11px] font-mono font-bold px-3 py-1 rounded-bl-xl">
                ECHOTRACE PARADIGM
              </div>

              <span className="text-xs font-mono uppercase text-[#4F46E5] dark:text-indigo-400 font-bold block mb-1">
                Continuous Forensics
              </span>
              <h3 className="text-2xl font-extrabold text-[#111827] dark:text-white">
                FULL LINEAGE RECONSTRUCTION
              </h3>
              <p className="text-xs sm:text-sm text-[#4B5563] dark:text-slate-300 mt-1 mb-8 max-w-2xl leading-relaxed">
                EchoTrace maps the entire journey from origin through mutated variants directly to institutional proof.
              </p>

              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3.5 text-xs">
                  <Workflow className="h-5 w-5 text-[#4F46E5] dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm text-[#111827] dark:text-white">Topological Lineage DAG:</span>
                    <span className="text-[#4B5563] dark:text-slate-300 ml-1.5 leading-relaxed block sm:inline">Connects each forwarded variant back to its origin timestamp and channel.</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex items-start gap-3.5 text-xs">
                  <GitBranch className="h-5 w-5 text-[#F59E0B] dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm text-[#111827] dark:text-white">Temporal Drift Tracking:</span>
                    <span className="text-[#4B5563] dark:text-slate-300 ml-1.5 leading-relaxed block sm:inline">Automatically highlights where dates, numbers, and scope inflated during reshares.</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-3.5 text-xs">
                  <ShieldCheck className="h-5 w-5 text-[#16A34A] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm text-[#111827] dark:text-white">Verifiable Primary Evidence:</span>
                    <span className="text-[#4B5563] dark:text-slate-300 ml-1.5 leading-relaxed block sm:inline">Direct reference to authenticated official circulars and registrar announcements.</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-[#6B7280] dark:text-slate-400 font-mono">
                <span>Transparent 4-Factor Weighted Score Derived from Evidence</span>
                <span className="text-[#16A34A] dark:text-emerald-400 font-bold">100% Explainable Architecture</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
