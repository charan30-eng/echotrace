import React from 'react';
import { ActiveTab } from '../types/claim';
import {
  Workflow,
  Search,
  Layers,
  GitBranch,
  Scale,
  ShieldCheck,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';

interface HowItWorksViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onLaunchDemo: () => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({
  setActiveTab,
  onLaunchDemo,
}) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
          System Architecture
        </span>
        <h1 className="mt-1 text-3xl font-extrabold text-[#111827] tracking-tight">
          How EchoTrace Works
        </h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          A 5-phase forensic pipeline converting unverified text into explainable lineage graphs.
        </p>
      </div>

      <div className="space-y-6">
        {[
          {
            step: '01',
            title: 'Atomic Claim Extraction',
            desc: 'Identifies the central factual assertion within unstructured text, URLs, or forum threads.',
            tech: 'Entity Normalization & Semantic Core Parsing',
            icon: Search,
          },
          {
            step: '02',
            title: 'Near-Duplicate Matching',
            desc: 'Clusters paraphrased statements across Telegram, Reddit, and public student discussion forums.',
            tech: 'Vector Embeddings (Cosine Threshold > 0.82)',
            icon: Layers,
          },
          {
            step: '03',
            title: 'Lineage Graph Assembly',
            desc: 'Tracks timestamps and author origins to determine which node introduced narrative scope escalation.',
            tech: 'Topological DAG Construction',
            icon: GitBranch,
          },
          {
            step: '04',
            title: 'Contradiction Detection',
            desc: 'Flags direct operational conflicts between unofficial rumors and official institutional notices.',
            tech: 'NLI Contradiction & Assertion Conflict Matrix',
            icon: Scale,
          },
          {
            step: '05',
            title: 'Verifiable Evidence Synthesis',
            desc: 'Computes explainable multi-evidence verdict derived from authenticated primary documentation and domain provenance.',
            tech: 'Standardized Multi-Evidence Synthesis & Stance Matrix',
            icon: ShieldCheck,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.step}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-start gap-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#4F46E5] shrink-0 font-mono font-bold text-sm">
                {item.step}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#111827]">
                    {item.title}
                  </h3>
                  <span className="text-[11px] font-mono text-gray-400">
                    Phase {item.step}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  {item.desc}
                </p>

                <div className="pt-2 font-mono text-[11px] text-[#4F46E5]">
                  Architecture: {item.tech}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#111827]">
            Ready to test EchoTrace on a real campus claim?
          </h4>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Analyze any unverified statement or inspect our benchmark college closure trace.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('analyze')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#4338CA] transition-all cursor-pointer shrink-0"
        >
          <span>Launch Analysis Console</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
