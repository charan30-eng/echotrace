import { ClaimAnalysis, VariantNode, GraphEdge, Source, Factor } from '../types/claim';
import { InvestigationInput } from '../types/investigation';
import { claimExtractor } from '../services/claimExtractor';
import { evidenceSearch } from '../services/evidenceSearch';
import { ExtractedClaim, ClaimExtractionResult } from '../types/claimExtraction';

/**
 * PHASE 2 STAGED INVESTIGATION ANALYSIS
 * 
 * Ingests a normalized InvestigationInput and runs it through Phase 2 Claim Extraction.
 * Produces a clean, unverified ClaimAnalysis dossier containing the ExtractedClaim tuple.
 * 
 * Strict Guarantees:
 * 1. Does NOT treat extracted claims as verified facts.
 * 2. Clearly distinguishes: RAW INPUT from EXTRACTED CLAIM from VERIFIED EVIDENCE.
 * 3. Detects multiple claims and modal ambiguity without erasing uncertainty.
 * 4. Does NOT assign credibility scores (score remains unrated / 0).
 * 5. Does NOT determine TRUE / FALSE verdicts.
 */
export function generateStagedInvestigationAnalysis(
  input: InvestigationInput,
  providedExtraction?: ClaimExtractionResult
): ClaimAnalysis {
  const rawText = input.rawInput.trim();
  const dateNow = new Date();
  const timeString = dateNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Run Phase 2 Claim Extraction
  const extractionResult: ClaimExtractionResult =
    providedExtraction || claimExtractor.extract(rawText, input.id, input.platform);
  const primaryClaim: ExtractedClaim = extractionResult.primaryClaim;

  // Formulate Phase 3 Multi-Angle Query Plan
  const queryPlan = evidenceSearch.generateQueryPlan(primaryClaim);

  let originSourceName = 'Unverified Direct Input';
  let originPlatform = 'Direct Text Submission';
  let originType: Source['type'] = 'Official notice';
  let originChannelDesc = 'Raw User Statement';
  const originReach = '1 direct submission';

  if (input.inputType === 'url') {
    const hostname = input.metadata?.urlDetails?.hostname || 'External Web Host';
    originSourceName = `External URL (${hostname})`;
    originPlatform = 'Public Web';
    originType = 'News outlet';
    originChannelDesc = `Web URL: ${input.metadata?.urlDetails?.domain || hostname}`;
  } else if (input.inputType === 'social') {
    const platformName = (input.platform || 'social').toUpperCase();
    originSourceName = `${platformName} Post / Community Thread`;
    originPlatform = platformName;
    originType = 'Social post';
    originChannelDesc = `Social Forum (${platformName})`;
  } else {
    originSourceName = 'Direct Statement Entry';
    originPlatform = 'User Text Input';
    originType = 'Forwarded chat';
    originChannelDesc = 'Direct Proposition Statement';
  }

  // Source 1: Origin Source (Unverified)
  const originSource: Source = {
    id: `src-${input.id}-origin`,
    type: originType,
    name: originSourceName,
    platform: originPlatform,
    reliability: 'unverified',
    status: 'Needs verification',
    timestamp: 'Just now (Phase 1 Ingestion)',
    reach: originReach,
    notes: input.inputType === 'url'
      ? `URL ingested into EchoTrace. Content extraction performed in Phase 2. External authority corroboration scheduled for Phase 3.`
      : input.inputType === 'social'
      ? `Social media post ingested without assumed credibility. Proposition extracted in Phase 2.`
      : `Raw statement received. Isolated into structured proposition in Phase 2.`,
  };

  // Source 2: Extraction Service (Phase 2 Active)
  const extractionSource: Source = {
    id: `src-${input.id}-extract`,
    type: 'Official notice',
    name: 'EchoTrace Claim Extractor (Phase 2)',
    platform: 'EchoTrace Pipeline',
    reliability: 'unverified',
    status: 'Needs verification',
    timestamp: 'Completed (Phase 2)',
    notes: `Deconstructed input into structured proposition. Modality: ${primaryClaim.modality.toUpperCase()}.${primaryClaim.isAmbiguous ? ` Ambiguity detected: ${primaryClaim.ambiguityNotes}` : ''}`,
  };

  // Source 3: Evidence Search Engine (Phase 3 Active)
  const evidenceEngineSource: Source = {
    id: `src-${input.id}-search`,
    type: 'Official notice',
    name: 'Multi-Source Evidence Crawler (Phase 3)',
    platform: 'Evidence Registry',
    reliability: 'unverified',
    status: 'Needs verification',
    timestamp: 'Phase 3 Multi-Query Formulated',
    notes: `Formulated ${queryPlan.queries.length} search queries across exact claim, entities+action, event, time, and keywords: [${queryPlan.queries.map((q) => `"${q.query}"`).slice(0, 3).join(', ')}].`,
  };

  // Node 1: Ingested Input (Stage 1)
  const node1: VariantNode = {
    id: `node-${input.id}-1`,
    type: 'original',
    label: '1. Ingested Input',
    text: rawText,
    timestamp: timeString,
    source: originSource,
    relationship: 'originated',
    whyItMatters: `Raw ${input.inputType.toUpperCase()} input intake recorded at ${input.submittedAt}.`,
    evidenceRef: 'Phase 1 Normalized Intake Record',
    mutationNote: 'Raw input ingested into EchoTrace architecture.',
    tags: [
      `Input: ${input.inputType.toUpperCase()}`,
      input.platform ? `Platform: ${input.platform.toUpperCase()}` : 'Text',
      'Status: Unverified',
    ],
  };

  // Node 2: Extracted Proposition (Stage 2)
  const node2: VariantNode = {
    id: `node-${input.id}-2`,
    type: 'modified',
    label: '2. Extracted Proposition (Phase 2)',
    text: primaryClaim.claimText,
    timestamp: timeString,
    source: extractionSource,
    relationship: 'mutated',
    whyItMatters: `Isolated propositional assertion (Subject: ${primaryClaim.subject || '—'}, Action: ${primaryClaim.action || '—'}${primaryClaim.timeReference ? `, Time: ${primaryClaim.timeReference}` : ''}${primaryClaim.reason ? `, Reason: ${primaryClaim.reason}` : ''}). Modality: ${primaryClaim.modality.toUpperCase()}.`,
    evidenceRef: 'Phase 2 Structured Claim Extractor',
    mutationNote: primaryClaim.isAmbiguous
      ? `Modal ambiguity preserved: ${primaryClaim.ambiguityNotes}`
      : 'Conversational noise stripped; affirmative proposition isolated.',
    tags: [
      'Phase 2 Extracted',
      `Modality: ${primaryClaim.modality}`,
      `Subject: ${primaryClaim.subject || 'Entity'}`,
    ],
  };

  // Node 3: Evidence Search (Phase 3 Active)
  const node3: VariantNode = {
    id: `node-${input.id}-3`,
    type: 'evidence',
    label: '3. Evidence Search (Phase 3)',
    text: `Formulated 5-angle search strategy: "${queryPlan.queries[0]?.query || primaryClaim.claimText}" + 4 supplementary queries.`,
    timestamp: timeString,
    source: evidenceEngineSource,
    relationship: 'supports',
    whyItMatters: 'Requires verifiable institutional documentation before determining veracity.',
    evidenceRef: 'Phase 3 Evidence Search Engine',
    mutationNote: `Search queries generated across 5 strategies: Exact claim, entities + action, entity + event, entity + time, keywords.`,
    tags: ['Phase 3 Active', 'Multi-Query Search', 'External Retrieval'],
  };

  // Node 4: Staged Verification (Stage 4 Pending)
  const node4: VariantNode = {
    id: `node-${input.id}-4`,
    type: 'evidence',
    label: '4. Final Verdict (Phase 4)',
    text: 'Truth verification and score calculation awaiting documentary evidence synthesis.',
    timestamp: 'Scheduled',
    source: evidenceEngineSource,
    relationship: 'confirmed',
    whyItMatters: 'No speculative verdict is assigned prior to verified documentary proof.',
    evidenceRef: 'Pending Phase 4 Verification',
    mutationNote: 'Final synthesis scheduled for Phase 4.',
    tags: ['Phase 4 Staged', 'Verdict Synthesis'],
  };

  const nodes = [node1, node2, node3, node4];

  const edges: GraphEdge[] = [
    {
      id: `edge-${input.id}-1-2`,
      from: node1.id,
      to: node2.id,
      label: 'supports',
      type: 'supports',
      description: 'Raw input deconstructed into atomic structured proposition (Phase 2).',
    },
    {
      id: `edge-${input.id}-2-3`,
      from: node2.id,
      to: node3.id,
      label: 'supports',
      type: 'supports',
      description: 'Structured claim keywords routed to Phase 3 Multi-Source Search.',
    },
    {
      id: `edge-${input.id}-3-4`,
      from: node3.id,
      to: node4.id,
      label: 'supports',
      type: 'supports',
      description: 'Documentary evidence routed to Phase 4 Final Verification.',
    },
  ];

  // Component factors reflecting unverified / pending investigation status
  const factors: Factor[] = [
    {
      name: 'Source Reliability',
      score: 0,
      explanation: input.inputType === 'url'
        ? `URL ingested as an unverified external source (${input.metadata?.urlDetails?.hostname || 'web'}). Domain authority not yet audited.`
        : input.inputType === 'social'
        ? `Social media post ingested without assumed credibility. Author and channel credentials not yet verified.`
        : 'Direct statement entered by user. Source provenance unverified.',
      weight: '30%',
      impact: 'neutral',
    },
    {
      name: 'Independent Corroboration',
      score: 0,
      explanation: 'Corroboration checks pending Phase 3 multi-source evidence search. No external searches conducted yet.',
      weight: '25%',
      impact: 'neutral',
    },
    {
      name: 'Institutional Authority',
      score: 0,
      explanation: 'Official circulars and registrar registries have not yet been queried (scheduled for Phase 3).',
      weight: '30%',
      impact: 'neutral',
    },
    {
      name: 'Narrative Consistency',
      score: 0,
      explanation: `Phase 2 extracted atomic claim tuple. Modality: ${primaryClaim.modality}. Multi-claim status: ${extractionResult.hasMultipleClaims ? 'Multiple clauses isolated' : 'Single claim'}.`,
      weight: '15%',
      impact: 'neutral',
    },
  ];

  return {
    id: `dossier-${input.id}`,
    text: primaryClaim.claimText,
    inputClaim: rawText,
    score: 0, // Unrated: No speculative hard-coded score
    status: 'Unverified',
    timestamp: `Today, ${timeString}`,
    analysisDate: 'Oct 3, 2026',
    isDemo: false,
    coreClaim: primaryClaim.claimText,
    summaryReasoning: `PHASE 2 CLAIM EXTRACTION COMPLETE: EchoTrace ingested raw ${input.inputType.toUpperCase()} input and extracted the structured proposition “${primaryClaim.claimText}” (Subject: ${primaryClaim.subject || '—'}, Action: ${primaryClaim.action || '—'}${primaryClaim.reason ? `, Reason: ${primaryClaim.reason}` : ''}). Modality is cataloged as ${primaryClaim.modality.toUpperCase()}.${extractionResult.hasMultipleClaims ? ` Note: ${extractionResult.detectedClaims.length} distinct claims were detected in this input.` : ''} In accordance with epistemic safety standards, no external web searches or final truth verdicts have been executed yet, and no credibility score has been assigned. The proposition is currently UNVERIFIED and ready for Phase 3 Evidence Search.`,
    detailedReasoning: [
      `Stage 1 (Raw Input): "${rawText}" captured across ${input.metadata?.charCount || rawText.length} characters.`,
      `Stage 2 (Extracted Claim): "${primaryClaim.claimText}" (Subject: ${primaryClaim.subject || 'N/A'}, Action: ${primaryClaim.action || 'N/A'}${primaryClaim.timeReference ? `, Time: ${primaryClaim.timeReference}` : ''}${primaryClaim.reason ? `, Reason: ${primaryClaim.reason}` : ''}).`,
      `Modality & Epistemic Status: ${primaryClaim.modality.toUpperCase()} (${primaryClaim.isAmbiguous ? primaryClaim.ambiguityNotes : 'Declarative affirmative assertion'}).`,
      `Search Query Keywords Formulated for Phase 3: [${primaryClaim.keywords.join(', ')}]`,
      'Stage 3 (Evidence Retrieval): Web search and authoritative document retrieval have NOT been executed (scheduled for Phase 3).',
      'Stage 4 (Verdict Determination): Final verification verdict has NOT been rendered (scheduled for Phase 4).',
    ],
    factors,
    nodes,
    edges,
    sources: [originSource, extractionSource, evidenceEngineSource],
    recommendation: 'STATUS: UNVERIFIED (STRUCTURED IN PHASE 2). Structured proposition extracted. Ready for Phase 3 Evidence Search.',
    investigationInput: input,
    extractedClaim: primaryClaim,
    extractionResult,
    evidenceSearchResponse: {
      status: 'uninitiated',
      claimId: primaryClaim.id,
      claimText: primaryClaim.claimText,
      queryPlan,
      results: [],
      totalResultsFound: 0,
      uniqueUrlsCount: 0,
      providerUsed: 'EvidenceSearchProvider',
      executedQueries: queryPlan.queries.map((q) => q.query),
      executionTimeMs: 0,
      retrievedAt: new Date().toISOString(),
    },
    forensicSummary: {
      originChannel: originChannelDesc,
      driftSeverity: 'None',
      contradictionDetected: false,
      officialConfirmationState: 'Unverified / Pending',
      estimatedSpread: originReach,
    },
  };
}

/**
 * LEGACY FALLBACK GENERATOR:
 * Preserved for backwards compatibility with any remaining legacy code paths.
 * 
 * NOTE FOR FUTURE PHASES:
 * This generator is temporary legacy simulation logic that will be superseded
 * by Phase 3 (Evidence Search) and Phase 4 (Verification).
 * It should NOT be removed yet until all 4 phases are fully wired.
 */
export function generateCustomClaimAnalysis(claimText: string): ClaimAnalysis {
  const normalizedInput: InvestigationInput = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    inputType: claimText.toLowerCase().startsWith('http') ? 'url' : 'text',
    rawInput: claimText,
    submittedAt: new Date().toISOString(),
    metadata: {
      charCount: claimText.length,
      wordCount: claimText.split(/\s+/).filter(Boolean).length,
      isDemo: false,
    },
  };

  return generateStagedInvestigationAnalysis(normalizedInput);
}
