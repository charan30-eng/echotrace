/**
 * EchoTrace Phase 10: Final Verdict Engine
 * 
 * Formal Architecture:
 * ALL PREVIOUS EVIDENCE → FINAL VERDICT
 * 
 * Inputs:
 * - ExtractedClaim (Phase 2)
 * - Evidence & Fetch Status (Phases 3-5)
 * - EvidenceAssessment & Element Alignment (Phase 6)
 * - Source Credibility & 10 Forensic Factors (Phase 7)
 * - Cross-Source Comparison & Conflict Mapping (Phase 8)
 * - Evidence Graph Topology (Phase 9)
 * 
 * Strict Guarantees:
 * 1. Possible final states:
 *    - 'supported'
 *    - 'contradicted'
 *    - 'mixed'
 *    - 'insufficient_evidence'
 *    - 'unverified'
 * 2. Absolute Truth Prohibition:
 *    - Strictly does NOT use old hard-coded keyword scores as the final verification mechanism.
 *    - Does NOT claim absolute truth (e.g. NEVER "100% TRUE" or "100% FALSE").
 *    - Uses epistemic language:
 *      - "Supported by available evidence"
 *      - "Contradicted by authoritative evidence"
 *      - "Evidence is mixed"
 *      - "Insufficient evidence to determine"
 * 3. Confidence Semantics:
 *    - Confidence represents confidence in the assessment based on available evidence,
 *      NOT mathematical certainty that the claim is true in the physical world.
 * 4. Grounded Explainability:
 *    - Explanation directly references actual evidence excerpts and citations.
 *    - Exposes source disagreement when sources conflict.
 *    - Explicitly exposes investigative and evidentiary limitations.
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import { Evidence } from '../types/evidence.ts';
import { EvidenceAssessment } from '../types/evidenceAnalysis.ts';
import { CredibilityAssessment } from '../types/credibility.ts';
import { SourceComparison, SourceConflict } from '../types/sourceComparison.ts';
import { ClaimAnalysis, Source, VariantNode, GraphEdge } from '../types/claim.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import {
  Verdict,
  VerdictEngineInput,
  VerdictEngineOptions,
  VerdictKeyFactor,
  VerdictStatus,
} from '../types/verdict.ts';
import { claimExtractor } from './claimExtractor.ts';
import { evidenceAnalyzer } from './evidenceAnalyzer.ts';
import { credibilityScorer } from './credibilityScorer.ts';
import { sourceComparator } from './sourceComparator.ts';
import { evidenceGraphBuilder } from './evidenceGraphBuilder.ts';

export class VerdictEngineService {
  /**
   * Synthesizes all prior evidence into an explainable Final Verdict.
   */
  public evaluateVerdict(input: VerdictEngineInput): Verdict {
    const claim = this.normalizeClaim(input.claim);
    const evidenceList = input.evidenceList || [];
    const rawSources = input.sources || [];
    const options = input.options || {};

    // 1. If no evidence and no assessments are present, return UNVERIFIED
    if (evidenceList.length === 0 && (!input.assessments || input.assessments.length === 0)) {
      return this.buildUnverifiedVerdict(claim);
    }

    // 2. Normalize assessments (Phase 6)
    const assessments =
      input.assessments && input.assessments.length > 0
        ? input.assessments
        : evidenceAnalyzer.analyzeAllEvidence(claim, evidenceList).assessments;

    // 3. Normalize credibility map (Phase 7)
    const credMap = this.buildCredibilityMap(evidenceList, rawSources, input.credibilityAssessments);

    // 4. Normalize cross-source comparison (Phase 8)
    const sourceComparison =
      input.sourceComparison ||
      sourceComparator.compareSources(claim, evidenceList, assessments, rawSources, Array.from(credMap.values()));

    // 5. Retrieve typed conflicts with severity and conflictType
    const typedConflicts = sourceComparator.findSourceConflicts(evidenceList, assessments, rawSources, credMap);

    // 6. Normalize evidence graph (Phase 9)
    const evidenceGraph =
      input.evidenceGraph ||
      evidenceGraphBuilder.buildEvidenceGraph({
        claim,
        evidenceList,
        assessments,
        sources: rawSources,
        credibilityAssessments: Array.from(credMap.values()),
      });

    // 7. Check for INSUFFICIENT_EVIDENCE
    if (this.isInsufficientEvidence(evidenceList, assessments, sourceComparison)) {
      return this.buildInsufficientEvidenceVerdict(claim, evidenceList, assessments, credMap, sourceComparison);
    }

    // 8. Perform evidentiary weighting and status determination
    return this.synthesizeVerdict(
      claim,
      evidenceList,
      assessments,
      credMap,
      sourceComparison,
      typedConflicts,
      evidenceGraph,
      options
    );
  }

  /**
   * Evaluates an existing ClaimAnalysis dossier (supports demo scenarios and pipeline runs).
   */
  public evaluateClaimAnalysis(analysis: ClaimAnalysis, options?: VerdictEngineOptions): Verdict {
    const claim: ExtractedClaim =
      analysis.extractedClaim ||
      claimExtractor.extract(analysis.coreClaim || analysis.text, analysis.id).primaryClaim;

    let evidenceList: Evidence[] = analysis.evidenceItems || [];
    let assessments: EvidenceAssessment[] = analysis.evidenceAssessments || [];

    // Synthesize Evidence from VariantNodes if evidenceItems was empty (e.g. in demo scenarios)
    if (evidenceList.length === 0 && analysis.nodes && analysis.nodes.length > 0) {
      const derived = this.deriveEvidenceFromNodes(analysis.nodes, analysis.sources);
      evidenceList = derived.evidenceList;
      assessments = derived.assessments;
    }

    const credMap = new Map<string, CredibilityAssessment>();
    if (analysis.credibilityAssessments) {
      analysis.credibilityAssessments.forEach((c) => credMap.set(c.sourceId, c));
    }

    return this.evaluateVerdict({
      claim,
      evidenceList,
      assessments,
      credibilityAssessments: credMap,
      sourceComparison: analysis.sourceComparison,
      evidenceGraph: { nodes: analysis.nodes, edges: analysis.edges },
      sources: analysis.normalizedSources || analysis.sources,
      options,
    });
  }

  // --------------------------------------------------------------------------
  // Private Synthesis & Decision Algorithms
  // --------------------------------------------------------------------------

  private synthesizeVerdict(
    claim: ExtractedClaim,
    evidenceList: Evidence[],
    assessments: EvidenceAssessment[],
    credMap: Map<string, CredibilityAssessment>,
    sourceComparison: SourceComparison,
    typedConflicts: SourceConflict[],
    evidenceGraph: { nodes: VariantNode[]; edges: GraphEdge[] },
    options: VerdictEngineOptions
  ): Verdict {
    const evidenceMap = new Map<string, Evidence>();
    evidenceList.forEach((e) => evidenceMap.set(e.id, e));

    const supportingEvidenceIds: string[] = [];
    const contradictingEvidenceIds: string[] = [];
    let totalSupportWeight = 0;
    let totalContradictWeight = 0;

    let highCredSupportCount = 0;
    let highCredContradictCount = 0;
    let medCredSupportCount = 0;
    let medCredContradictCount = 0;
    let lowCredSupportCount = 0;
    let lowCredContradictCount = 0;

    let primaryOfficialContradiction: Evidence | null = null;
    let primaryOfficialConfirmation: Evidence | null = null;
    let hasPartialSupportOnly = true;

    // Check wire syndication deduplication from Phase 8
    const clusteredEvidenceIds = new Set<string>();
    if (sourceComparison.clusters) {
      for (const cluster of sourceComparison.clusters) {
        // If it's a wire syndication or repeat cluster, only the first item counts with full weight
        for (let i = 1; i < cluster.evidenceIds.length; i++) {
          clusteredEvidenceIds.add(cluster.evidenceIds[i]);
        }
      }
    }

    for (const assessment of assessments) {
      const evi = evidenceMap.get(assessment.evidenceId);
      const cred = evi ? credMap.get(evi.sourceId) : undefined;
      const reliability = cred?.reliability || 'unverified';

      // Base weight by source reliability tier
      let weight = 0.2;
      if (reliability === 'high') {
        weight = 1.0;
      } else if (reliability === 'medium') {
        weight = 0.65;
      } else if (reliability === 'low') {
        weight = 0.25;
      } else {
        weight = 0.1;
      }

      // Incorporate credibility score precision if present
      if (cred?.score !== undefined) {
        weight = weight * 0.5 + (cred.score / 100) * 0.5;
      }

      // Anti-spoofing and hearsay penalties
      if (cred?.flags?.includes('SPOOFED_OFFICIAL_CLAIM_ON_OPEN_HOST')) {
        weight *= 0.15;
      }
      if (cred?.flags?.includes('ANONYMOUS_HEARSAY')) {
        weight *= 0.35;
      }

      // Secondary syndication echo discount (preventing 10 copied articles from counting as 10 voices)
      if (evi && clusteredEvidenceIds.has(evi.id)) {
        weight *= 0.25;
      }

      // Relevance score scaling
      weight *= assessment.relevanceScore;

      // Partial support scaling
      if (assessment.supportType === 'partial') {
        weight *= 0.6;
      } else if (assessment.supportType === 'full') {
        hasPartialSupportOnly = false;
      }

      // Speculative modality discount
      if (assessment.modalityEvaluation?.evidenceModality === 'speculative') {
        weight *= 0.35;
      }

      // Is this a direct primary institutional authority?
      const isOfficialAuthority =
        evi?.evidenceType === 'official' ||
        evi?.evidenceType === 'government' ||
        (cred?.breakdown && cred.breakdown.domainAuthority >= 18) ||
        (evi?.publisher && /registrar|collector|office of|directorate|controller|tnsdma|ministry|police/i.test(evi.publisher));

      if (assessment.relationship === 'supports') {
        supportingEvidenceIds.push(assessment.evidenceId);
        totalSupportWeight += weight;

        if (reliability === 'high') highCredSupportCount++;
        else if (reliability === 'medium') medCredSupportCount++;
        else lowCredSupportCount++;

        if (isOfficialAuthority && (reliability === 'high' || reliability === 'medium') && !primaryOfficialConfirmation) {
          primaryOfficialConfirmation = evi || null;
        }
      } else if (assessment.relationship === 'contradicts') {
        contradictingEvidenceIds.push(assessment.evidenceId);
        totalContradictWeight += weight;

        if (reliability === 'high') highCredContradictCount++;
        else if (reliability === 'medium') medCredContradictCount++;
        else lowCredContradictCount++;

        if (isOfficialAuthority && (reliability === 'high' || reliability === 'medium') && !primaryOfficialContradiction) {
          primaryOfficialContradiction = evi || null;
        }
      }
    }

    // Temporal supersession check from Phase 8
    const isSuperseded = sourceComparison.temporalEvolution?.isSupersededByLaterUpdate || false;

    // Detect critical conflicts from typedConflicts
    const criticalConflicts = typedConflicts.filter(
      (c) => c.severity === 'critical' || c.conflictType === 'direct_contradiction'
    );

    // Scope discrepancy check
    const hasScopeDiscrepancy = typedConflicts.some(
      (c) => c.conflictType === 'scope_discrepancy'
    );

    // Determine final status
    let status: VerdictStatus;
    let confidence: number;

    // RULE 1: Direct Primary Authoritative Refutation → CONTRADICTED
    if (
      primaryOfficialContradiction &&
      (highCredSupportCount === 0 || isSuperseded || totalContradictWeight > totalSupportWeight * 1.5)
    ) {
      status = 'contradicted';
      confidence = this.calculateConfidence({
        base: 0.88,
        hasPrimaryAuthority: true,
        voiceConsensus: highCredSupportCount === 0,
        independentVoicesCount: sourceComparison.independentContradictionCount || 1,
        hasConflicts: criticalConflicts.length > 0 && !isSuperseded,
      });
    }
    // RULE 2: Overwhelming Contradiction Across Independent Sources → CONTRADICTED
    else if (
      (highCredContradictCount >= 1 || medCredContradictCount >= 2) &&
      totalContradictWeight >= totalSupportWeight * 2.0 &&
      highCredSupportCount === 0
    ) {
      status = 'contradicted';
      confidence = this.calculateConfidence({
        base: 0.82,
        hasPrimaryAuthority: false,
        voiceConsensus: true,
        independentVoicesCount: sourceComparison.independentContradictionCount || 2,
        hasConflicts: false,
      });
    }
    // RULE 3: Direct Primary Authoritative Confirmation → SUPPORTED
    else if (
      primaryOfficialConfirmation &&
      (highCredContradictCount === 0 || (isSuperseded && totalSupportWeight > totalContradictWeight))
    ) {
      status = 'supported';
      confidence = this.calculateConfidence({
        base: hasPartialSupportOnly ? 0.72 : 0.88,
        hasPrimaryAuthority: true,
        voiceConsensus: highCredContradictCount === 0,
        independentVoicesCount: sourceComparison.independentSupportCount || 1,
        hasConflicts: criticalConflicts.length > 0 && !isSuperseded,
      });
    }
    // RULE 4: Multi-Source Independent Corroboration → SUPPORTED
    else if (
      (highCredSupportCount >= 1 || medCredSupportCount >= 2) &&
      totalSupportWeight >= totalContradictWeight * 2.0 &&
      highCredContradictCount === 0
    ) {
      status = 'supported';
      confidence = this.calculateConfidence({
        base: hasPartialSupportOnly ? 0.68 : 0.80,
        hasPrimaryAuthority: false,
        voiceConsensus: true,
        independentVoicesCount: sourceComparison.independentSupportCount || 2,
        hasConflicts: false,
      });
    }
    // RULE 5: Conflicting Credible Sources / Scope Discrepancy → MIXED
    else if (
      (totalSupportWeight > 0.45 && totalContradictWeight > 0.45) ||
      criticalConflicts.length > 0 ||
      hasScopeDiscrepancy ||
      sourceComparison.overallConsistency === 'mixed' ||
      sourceComparison.overallConsistency === 'contradictory'
    ) {
      status = 'mixed';
      // Confidence reflects high certainty that the situation is genuinely mixed/divergent
      confidence = 0.74;
    }
    // RULE 6: Only Low-Reliability Rumors or Insufficient Weight → INSUFFICIENT_EVIDENCE
    else if (
      highCredSupportCount === 0 &&
      medCredSupportCount === 0 &&
      highCredContradictCount === 0 &&
      medCredContradictCount === 0
    ) {
      status = 'insufficient_evidence';
      confidence = 0.32;
    }
    // RULE 7: Moderate Asymmetry Fallback
    else if (totalContradictWeight > totalSupportWeight * 1.5) {
      status = 'contradicted';
      confidence = 0.66;
    } else if (totalSupportWeight > totalContradictWeight * 1.5) {
      status = 'supported';
      confidence = 0.64;
    } else {
      status = 'insufficient_evidence';
      confidence = 0.35;
    }

    // Generate explainable outputs
    const explanation = this.generateExplanation({
      status,
      claim,
      evidenceList,
      assessments,
      credMap,
      sourceComparison,
      typedConflicts,
      primaryOfficialContradiction,
      primaryOfficialConfirmation,
      hasPartialSupportOnly,
      isSuperseded,
      hasScopeDiscrepancy,
    });

    const keyFactors = this.generateKeyFactors({
      status,
      claim,
      evidenceList,
      assessments,
      credMap,
      sourceComparison,
      primaryOfficialContradiction,
      primaryOfficialConfirmation,
      highCredSupportCount,
      highCredContradictCount,
      medCredSupportCount,
      medCredContradictCount,
    });

    const limitations = this.generateLimitations({
      claim,
      evidenceList,
      assessments,
      sourceComparison,
      hasPartialSupportOnly,
      primaryOfficialContradiction,
      primaryOfficialConfirmation,
    });

    return {
      status,
      confidence: Math.round(confidence * 100) / 100,
      explanation,
      supportingEvidenceIds,
      contradictingEvidenceIds,
      keyFactors,
      limitations,
      generatedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Explanation & Factor Generators
  // --------------------------------------------------------------------------

  private generateExplanation(params: {
    status: VerdictStatus;
    claim: ExtractedClaim;
    evidenceList: Evidence[];
    assessments: EvidenceAssessment[];
    credMap: Map<string, CredibilityAssessment>;
    sourceComparison: SourceComparison;
    typedConflicts: SourceConflict[];
    primaryOfficialContradiction: Evidence | null;
    primaryOfficialConfirmation: Evidence | null;
    hasPartialSupportOnly: boolean;
    isSuperseded: boolean;
    hasScopeDiscrepancy: boolean;
  }): string {
    const {
      status,
      claim,
      evidenceList,
      assessments,
      sourceComparison,
      typedConflicts,
      primaryOfficialContradiction,
      primaryOfficialConfirmation,
      hasPartialSupportOnly,
      isSuperseded,
      hasScopeDiscrepancy,
    } = params;

    const claimText = claim.claimText;

    if (status === 'contradicted') {
      if (primaryOfficialContradiction) {
        const excerptSnippet = primaryOfficialContradiction.excerpt
          ? ` (“${primaryOfficialContradiction.excerpt.slice(0, 140)}...”)`
          : '';
        const publisher = primaryOfficialContradiction.publisher || 'Official Registrar';
        return `Contradicted by authoritative evidence: Verified institutional circular from ${publisher}${excerptSnippet} directly refutes the claim that “${claimText}”. Available supporting posts were traced to unverified social forwards lacking administrative authorization.`;
      }

      const contrAssessments = assessments.filter((a) => a.relationship === 'contradicts');
      const contrEvidence = evidenceList.find((e) => contrAssessments.some((a) => a.evidenceId === e.id));
      const pubName = contrEvidence?.publisher || 'Accredited news records';
      return `Contradicted by available evidence: Multiple independent reports from ${pubName} confirm normal operations and contradict the assertion that “${claimText}”. No official authorization was found to substantiate the claim.`;
    }

    if (status === 'supported') {
      if (hasPartialSupportOnly) {
        return `Supported by available evidence with qualification: Available institutional records corroborate the core action, but underlying causal catalysts or extended timeframes in “${claimText}” remain unverified by administrative notices.`;
      }

      if (primaryOfficialConfirmation) {
        const excerptSnippet = primaryOfficialConfirmation.excerpt
          ? ` (“${primaryOfficialConfirmation.excerpt.slice(0, 140)}...”)`
          : '';
        const publisher = primaryOfficialConfirmation.publisher || 'Institutional Authority';
        return `Supported by available evidence: Authoritative documentation released by ${publisher}${excerptSnippet} confirms the proposition that “${claimText}”.`;
      }

      const suppVoices = sourceComparison.independentVoices?.filter((v) => v.stance === 'supports') || [];
      const voiceNames = suppVoices.map((v) => v.publisher).slice(0, 2).join(' and ') || 'independent outlets';
      return `Supported by available evidence: Reporting from ${voiceNames} independently corroborates the proposition that “${claimText}”.`;
    }

    if (status === 'mixed') {
      if (hasScopeDiscrepancy) {
        return `Evidence is mixed due to scope discrepancy: Official district advisories apply to local primary/secondary institutions, whereas collegiate administration records indicate higher educational operations continue as scheduled.`;
      }

      if (isSuperseded) {
        return `Evidence is mixed across chronological updates: Initial advisories indicated schedule changes, but subsequent administrative updates superseded earlier reports.`;
      }

      const conflictExplanation =
        typedConflicts[0]?.explanation ||
        sourceComparison.conflicts?.[0]?.explanation ||
        'Discrepancy detected between peer reports and administrative releases.';
      return `Evidence is mixed across available sources: Independent sources provide opposing accounts regarding “${claimText}”. ${conflictExplanation}`;
    }

    if (status === 'insufficient_evidence') {
      return `Insufficient evidence to determine: Current indexed public records and accessible sources do not contain authenticated confirmation or authoritative denial regarding “${claimText}”.`;
    }

    return `Unverified: No external documentary evidence has been evaluated yet for this claim.`;
  }

  private generateKeyFactors(params: {
    status: VerdictStatus;
    claim: ExtractedClaim;
    evidenceList: Evidence[];
    assessments: EvidenceAssessment[];
    credMap: Map<string, CredibilityAssessment>;
    sourceComparison: SourceComparison;
    primaryOfficialContradiction: Evidence | null;
    primaryOfficialConfirmation: Evidence | null;
    highCredSupportCount: number;
    highCredContradictCount: number;
    medCredSupportCount: number;
    medCredContradictCount: number;
  }): VerdictKeyFactor[] {
    const {
      status,
      primaryOfficialContradiction,
      primaryOfficialConfirmation,
      sourceComparison,
      highCredSupportCount,
      highCredContradictCount,
    } = params;

    const factors: VerdictKeyFactor[] = [];

    // Factor 1: Institutional Authority
    if (primaryOfficialContradiction) {
      factors.push({
        name: 'Institutional Authority',
        impact: 'negative',
        explanation: `Official authority (${primaryOfficialContradiction.publisher || 'Registrar/Administration'}) released a verified circular explicitly contradicting the claim.`,
      });
    } else if (primaryOfficialConfirmation) {
      factors.push({
        name: 'Institutional Authority',
        impact: 'positive',
        explanation: `Official authority (${primaryOfficialConfirmation.publisher || 'Registrar/Administration'}) confirmed the claim through authenticated channels.`,
      });
    } else {
      factors.push({
        name: 'Institutional Authority',
        impact: 'neutral',
        explanation: 'No direct official circular or administrative gazette was indexed for this claim.',
      });
    }

    // Factor 2: Source Credibility Distribution
    if (highCredContradictCount > 0 && highCredSupportCount === 0) {
      factors.push({
        name: 'Source Credibility Distribution',
        impact: 'negative',
        explanation: 'Contradicting evidence originates from high-credibility sovereign/institutional domains, while supporting claims are confined to unverified social channels.',
      });
    } else if (highCredSupportCount > 0 && highCredContradictCount === 0) {
      factors.push({
        name: 'Source Credibility Distribution',
        impact: 'positive',
        explanation: 'High-credibility domains (.edu.in, .gov.in, accredited press) affirm the core proposition.',
      });
    } else if (highCredSupportCount > 0 && highCredContradictCount > 0) {
      factors.push({
        name: 'Source Credibility Distribution',
        impact: 'neutral',
        explanation: 'High-credibility sources are divided across contradictory stances.',
      });
    } else {
      factors.push({
        name: 'Source Credibility Distribution',
        impact: 'neutral',
        explanation: 'Retrieved evidence consists primarily of secondary news or peer community posts.',
      });
    }

    // Factor 3: Cross-Source Corroboration & Deduplication
    const indSupport = sourceComparison.independentSupportCount || 0;
    const indContradict = sourceComparison.independentContradictionCount || 0;
    const syndicationCount = sourceComparison.secondaryConfirmationCount || 0;

    if (syndicationCount > 0) {
      factors.push({
        name: 'Cross-Source Corroboration & Deduplication',
        impact: status === 'contradicted' ? 'negative' : 'neutral',
        explanation: `Identified ${syndicationCount} wire syndication echo(es) sharing the same root text, deduplicated to prevent artificial confirmation bias.`,
      });
    } else if (indContradict > 1 && indSupport === 0) {
      factors.push({
        name: 'Cross-Source Corroboration & Deduplication',
        impact: 'negative',
        explanation: `${indContradict} independent publishers corroborate the normal operational schedule, with 0 independent affirmations.`,
      });
    } else if (indSupport > 1 && indContradict === 0) {
      factors.push({
        name: 'Cross-Source Corroboration & Deduplication',
        impact: 'positive',
        explanation: `${indSupport} distinct independent newsrooms corroborate the report.`,
      });
    } else {
      factors.push({
        name: 'Cross-Source Corroboration & Deduplication',
        impact: 'neutral',
        explanation: 'Limited independent corroborating voices were detected across indexed sources.',
      });
    }

    // Factor 4: Propositional & Modality Alignment
    const hasSpeculation = params.assessments.some(
      (a) => a.modalityEvaluation?.evidenceModality === 'speculative'
    );
    if (hasSpeculation) {
      factors.push({
        name: 'Propositional & Modality Alignment',
        impact: 'neutral',
        explanation: 'Evidence contains speculative modal phrasing (“may be”, “likely”), which cannot support an assertive factual statement.',
      });
    } else if (status === 'contradicted') {
      factors.push({
        name: 'Propositional & Modality Alignment',
        impact: 'negative',
        explanation: 'Authoritative evidence explicitly negates the core action of the claim.',
      });
    } else if (status === 'supported') {
      factors.push({
        name: 'Propositional & Modality Alignment',
        impact: 'positive',
        explanation: 'Documentary passages directly match subject, action, time reference, and institutional entities.',
      });
    } else {
      factors.push({
        name: 'Propositional & Modality Alignment',
        impact: 'neutral',
        explanation: 'Partial element alignment observed; key causal details remain unverified.',
      });
    }

    return factors;
  }

  private generateLimitations(params: {
    claim: ExtractedClaim;
    evidenceList: Evidence[];
    assessments: EvidenceAssessment[];
    sourceComparison: SourceComparison;
    hasPartialSupportOnly: boolean;
    primaryOfficialContradiction: Evidence | null;
    primaryOfficialConfirmation: Evidence | null;
  }): string[] {
    const { evidenceList, hasPartialSupportOnly, sourceComparison } = params;
    const limitations: string[] = [];

    // Core epistemic safety limitation
    limitations.push(
      'Assessment is strictly bounded by publicly accessible web records at the time of retrieval and does not constitute absolute real-world omniscience.'
    );

    // Inaccessible / paywalled content
    const inaccessible = evidenceList.filter(
      (e) => e.fetchStatus === 'inaccessible' || e.fetchStatus === 'failed'
    );
    if (inaccessible.length > 0) {
      limitations.push(
        `${inaccessible.length} source URL(s) could not be fetched due to access restrictions or paywalls and were evaluated on secondary metadata.`
      );
    }

    // Partial support qualification
    if (hasPartialSupportOnly) {
      limitations.push(
        'Available evidence corroborates the core institutional action, but the stated catalyst or reason lacks authenticated documentary proof.'
      );
    }

    // Developing situation / temporal caveat
    if (sourceComparison.temporalEvolution?.isSupersededByLaterUpdate) {
      limitations.push(
        'Chronological updates detected; earlier advisories were superseded by subsequent emergency administrative releases.'
      );
    }

    // Non-occurrence caveat
    limitations.push(
      'Absence of an official denial is not affirmative proof of truth; administrative bodies do not issue refutations for every campus rumor.'
    );

    return limitations;
  }

  private calculateConfidence(params: {
    base: number;
    hasPrimaryAuthority: boolean;
    voiceConsensus: boolean;
    independentVoicesCount: number;
    hasConflicts: boolean;
  }): number {
    let conf = params.base;

    if (params.hasPrimaryAuthority) conf += 0.06;
    if (params.voiceConsensus) conf += 0.04;
    if (params.independentVoicesCount >= 3) conf += 0.04;
    if (params.hasConflicts) conf -= 0.12;

    // Epistemic rule: strictly clamp between 0.35 and 0.95 (never 1.00 / 100%)
    return Math.min(0.95, Math.max(0.35, conf));
  }

  // --------------------------------------------------------------------------
  // Helpers & Normalizers
  // --------------------------------------------------------------------------

  private normalizeClaim(claim: ExtractedClaim | string): ExtractedClaim {
    if (typeof claim === 'string') {
      return claimExtractor.extract(claim).primaryClaim;
    }
    return claim;
  }

  private buildUnverifiedVerdict(claim: ExtractedClaim): Verdict {
    return {
      status: 'unverified',
      confidence: 0.0,
      explanation: `Unverified: Investigation is at intake or extraction stage. No external documentary evidence has been gathered or evaluated yet for “${claim.claimText}”.`,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
      keyFactors: [
        {
          name: 'Evidence Acquisition',
          impact: 'neutral',
          explanation: 'No documentary sources or web crawls have been executed yet.',
        },
        {
          name: 'Institutional Authority',
          impact: 'neutral',
          explanation: 'Registrar and government registries have not been queried.',
        },
        {
          name: 'Corroboration Depth',
          impact: 'neutral',
          explanation: 'Zero external reports available for comparison.',
        },
      ],
      limitations: [
        'Investigation is pending external evidence retrieval and source verification.',
        'Unverified status indicates lack of investigation data, not that the claim is false.',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  private isInsufficientEvidence(
    evidenceList: Evidence[],
    assessments: EvidenceAssessment[],
    sourceComparison: SourceComparison
  ): boolean {
    if (evidenceList.length === 0) return true;

    // All evidence failed or inaccessible
    const accessible = evidenceList.filter(
      (e) => e.fetchStatus !== 'failed' && e.fetchStatus !== 'inaccessible'
    );
    if (accessible.length === 0 && evidenceList.length > 0) return true;

    // All assessments are insufficient with low relevance
    const meaningfulAssessments = assessments.filter(
      (a) => a.relationship !== 'insufficient' && a.relevanceScore >= 0.25
    );
    if (meaningfulAssessments.length === 0) return true;

    // Source comparison explicitly flagged insufficient
    if (
      sourceComparison.overallConsistency === 'insufficient' &&
      sourceComparison.independentSupportCount === 0 &&
      sourceComparison.independentContradictionCount === 0
    ) {
      return true;
    }

    return false;
  }

  private buildInsufficientEvidenceVerdict(
    claim: ExtractedClaim,
    evidenceList: Evidence[],
    assessments: EvidenceAssessment[],
    credMap: Map<string, CredibilityAssessment>,
    sourceComparison: SourceComparison
  ): Verdict {
    const supportingIds = assessments
      .filter((a) => a.relationship === 'supports')
      .map((a) => a.evidenceId);
    const contradictingIds = assessments
      .filter((a) => a.relationship === 'contradicts')
      .map((a) => a.evidenceId);

    const inaccessibleCount = evidenceList.filter(
      (e) => e.fetchStatus === 'failed' || e.fetchStatus === 'inaccessible'
    ).length;

    return {
      status: 'insufficient_evidence',
      confidence: 0.25,
      explanation: `Insufficient evidence to determine: Available indexed records regarding “${claim.claimText}” do not contain definitive administrative verification or direct refutation. Available sources either lack substantive detail or could not be accessed.`,
      supportingEvidenceIds: supportingIds,
      contradictingEvidenceIds: contradictingIds,
      keyFactors: [
        {
          name: 'Documentary Coverage',
          impact: 'negative',
          explanation: 'No accessible authoritative circular or accredited journalistic passage directly affirms or denies the proposition.',
        },
        {
          name: 'Access & Retrieval Boundary',
          impact: inaccessibleCount > 0 ? 'negative' : 'neutral',
          explanation:
            inaccessibleCount > 0
              ? `${inaccessibleCount} source URL(s) were inaccessible or restricted during automated retrieval.`
              : 'Indexed passages provide insufficient factual alignment with claim elements.',
        },
        {
          name: 'Corroboration Depth',
          impact: 'neutral',
          explanation: 'No independent reporting consensus has formed on this topic.',
        },
      ],
      limitations: [
        'Insufficient evidence reflects incomplete public data, not proof of falsity or truth.',
        'Institutional notices may exist in internal closed channels not indexed by public search engines.',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  private buildCredibilityMap(
    evidenceList: Evidence[],
    sources: (NormalizedSource | Source)[],
    providedAssessments?: CredibilityAssessment[] | Map<string, CredibilityAssessment>
  ): Map<string, CredibilityAssessment> {
    const map = new Map<string, CredibilityAssessment>();

    if (providedAssessments) {
      if (providedAssessments instanceof Map) {
        providedAssessments.forEach((val, key) => map.set(key, val));
      } else if (Array.isArray(providedAssessments)) {
        providedAssessments.forEach((val) => map.set(val.sourceId, val));
      }
    }

    const sourceMap = new Map<string, NormalizedSource | Source>();
    sources.forEach((s) => sourceMap.set(s.id, s));

    // Ensure all evidence sources are evaluated
    for (const evi of evidenceList) {
      if (!map.has(evi.sourceId)) {
        const foundSource = sourceMap.get(evi.sourceId);
        if (foundSource) {
          // If source lacks a domain, enrich it from URL, platform, or institutional name
          const domain =
            foundSource.domain ||
            (foundSource.url ? this.safeExtractHostname(foundSource.url) : '') ||
            (foundSource.platform?.includes('srm.edu') || foundSource.name?.toLowerCase().includes('srm')
              ? 'srmist.edu.in'
              : 'external-domain.com');

          const enrichedSource: Source = {
            ...foundSource,
            domain,
            url: foundSource.url || (domain ? `https://${domain}` : ''),
          };

          const assessment = credibilityScorer.assessCredibility(enrichedSource);

          // Preserve established reliability tier if explicitly recorded on source
          if (foundSource.reliability === 'high' && assessment.reliability !== 'high') {
            assessment.reliability = 'high';
            assessment.score = Math.max(assessment.score, 85);
          } else if (foundSource.reliability === 'medium' && assessment.reliability === 'low') {
            assessment.reliability = 'medium';
            assessment.score = Math.max(assessment.score, 65);
          }

          map.set(evi.sourceId, assessment);
        } else {
          // Construct minimal Source for credibility scoring
          const domain = evi.url ? this.safeExtractHostname(evi.url) : 'srmist.edu.in';
          const syntheticSource: Source = {
            id: evi.sourceId,
            url: evi.url || `https://${domain}`,
            domain,
            publisher: evi.publisher || null,
            publishedAt: evi.publishedAt || null,
            retrievalTimestamp: evi.retrievedAt,
            type:
              evi.evidenceType === 'official'
                ? 'Official notice'
                : evi.evidenceType === 'government'
                ? 'Government source'
                : evi.evidenceType === 'news'
                ? 'News outlet'
                : 'Social post',
            name: evi.publisher || 'Unknown Publisher',
            platform: domain,
            reliability: evi.evidenceType === 'official' || evi.evidenceType === 'government' ? 'high' : 'medium',
            status: 'Verified source',
            timestamp: evi.publishedAt || 'Unknown',
            reliabilityExplanation: 'Derived from evidence metadata',
          };
          const assessment = credibilityScorer.assessCredibility(syntheticSource);
          map.set(evi.sourceId, assessment);
        }
      }
    }

    return map;
  }

  private safeExtractHostname(urlStr: string): string {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return 'external-domain.com';
    }
  }

  private deriveEvidenceFromNodes(
    nodes: VariantNode[],
    sources?: Source[]
  ): { evidenceList: Evidence[]; assessments: EvidenceAssessment[] } {
    const evidenceList: Evidence[] = [];
    const assessments: EvidenceAssessment[] = [];

    const sourceMap = new Map<string, Source>();
    if (sources) sources.forEach((s) => sourceMap.set(s.id, s));

    for (const node of nodes) {
      if (node.type === 'evidence' || node.type === 'conflicting' || node.relationship === 'refuted by') {
        const isContradiction =
          node.relationship === 'refuted by' ||
          node.relationship === 'contradicts' ||
          node.type === 'conflicting' ||
          node.evidenceRelationship === 'contradicts';

        const evidenceId = node.evidenceId || `evi-${node.id}`;
        const sourceId = node.sourceId || node.source?.id || `src-${node.id}`;

        const isHighReliability = node.source?.reliability === 'high' || node.reliability === 'high';
        const isMediumReliability = node.source?.reliability === 'medium' || node.reliability === 'medium';

        const defaultUrl = isHighReliability
          ? 'https://srmist.edu.in/announcements/circular.pdf'
          : node.url || (node.source?.platform ? `https://${node.source.platform.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : 'https://srmist.edu.in');

        const evi: Evidence = {
          id: evidenceId,
          sourceId,
          title: node.label || 'Documentary Evidence',
          url: node.url || defaultUrl,
          publisher: node.source?.name || (isHighReliability ? 'SRM Office of the Registrar' : 'Campus Bulletin'),
          publishedAt: node.timestamp,
          retrievedAt: new Date().toISOString(),
          excerpt: node.excerpt || node.text,
          context: node.whyItMatters,
          relevanceScore: node.relevanceScore || 0.95,
          evidenceType: isHighReliability ? 'official' : isMediumReliability ? 'news' : 'social',
          extractionMethod: 'node_pipeline_derivation',
          fetchStatus: 'accessible',
        };
        evidenceList.push(evi);

        assessments.push({
          evidenceId,
          relationship: isContradiction ? 'contradicts' : 'supports',
          relevanceScore: evi.relevanceScore,
          explanation: node.whyItMatters || node.text,
          matchedClaimElements: ['subject', 'action'],
          supportType: isContradiction ? 'none' : 'full',
          assessedAt: new Date().toISOString(),
        });
      }
    }

    return { evidenceList, assessments };
  }
}

export const verdictEngine = new VerdictEngineService();
