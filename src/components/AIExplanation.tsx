import React from 'react';
import { ClaimAnalysis } from '../types/claim';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface AIExplanationProps {
  analysis: ClaimAnalysis;
}

export const AIExplanation: React.FC<AIExplanationProps> = ({ analysis }) => {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.06)] space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[#4F46E5] text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <span className="text-xs font-mono font-bold uppercase text-[#4F46E5] block">
            Synthesized Intelligence
          </span>
          <h3 className="text-base font-extrabold text-[#111827]">
            Investigative Summary & Verdict Reasoning
          </h3>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-indigo-100 shadow-2xs">
        <p className="text-sm text-[#111827] font-medium leading-relaxed">
          {analysis.summaryReasoning}
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono uppercase font-bold text-gray-400 block">
          Key Investigative Findings:
        </span>
        <ul className="space-y-1.5 text-xs text-[#4B5563]">
          {analysis.detailedReasoning.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[#4F46E5] font-bold mt-0.5">•</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-3 border-t border-indigo-100 flex items-center justify-between text-xs font-mono text-[#6B7280]">
        <span>Recommendation: {analysis.recommendation}</span>
        <span className="text-indigo-600 font-bold">Verifiable Institutional Record</span>
      </div>
    </div>
  );
};
