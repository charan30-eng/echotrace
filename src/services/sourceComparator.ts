/**
 * EchoTrace Phase 8: Cross-Source Comparison & Multi-Evidence Synthesis Service
 * 
 * Formal Architecture:
 * CLAIM + MULTIPLE EVIDENCE ITEMS → CROSS-SOURCE COMPARISON
 * 
 * Strict Guarantees:
 * 1. Independent sources vs. repeated syndication:
 *    - Does NOT count 10 copied articles as 10 independent confirmations.
 *    - 10 news sites copying 1 official statement is treated as:
 *      1 primary source + multiple secondary confirmations, not 11 independent sources.
 * 2. Same publisher consolidation:
 *    - Multiple URLs published under the same domain or publisher are grouped into 1 independent voice.
 * 3. Publication timeline & temporal supersession:
 *    - Considers timestamps to detect whether later updates supersede earlier notices.
 * 4. Pairwise conflict detection:
 *    - Identifies direct contradictions, scope discrepancies (e.g. school holiday vs. university open),
 *      and credibility asymmetries (high-reliability primary circular vs. unverified rumor).
 * 5. Epistemic consistency categorization:
 *    - 'consistent' | 'mixed' | 'contradictory' | 'insufficient'
 * 6. Strictly does NOT calculate the final claim verdict yet.
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import { Evidence } from '../types/evidence.ts';
import { EvidenceAssessment } from '../types/evidenceAnalysis.ts';
import { Source, SourceReliability } from '../types/claim.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import { CredibilityAssessment } from '../types/credibility.ts';
import { credibilityScorer } from './credibilityScorer.ts';
import { extractDomain } from './sourceCollector.ts';
import {
  ConflictSeverity,
  ConflictType,
  IndependentVoice,
  OverallConsistency,
  SharedOriginCluster,
  SourceComparison,
  SourceConflict,
} from '../types/sourceComparison.ts';

// -------------------------------------------------------------
// Syndication & Attribution Pattern Matchers
// -------------------------------------------------------------

const WIRE_SYNDICATION_REGEX =
  /\b(?:quoting|reported by|as per|according to|via|courtesy)\s+(?:ani|pti|ians|uni|reuters|ap|afp)\b/i;

const PRIMARY_OFFICIAL_CITATION_REGEX =
  /\b(?:quoting|according to|as per|in|from|statement from|clarified by)\s+(?:the\s+)?(?:official\s+)?(?:circular|announcement|press release|order|advisory|statement)?(?:\s+(?:issued by|released by|from))?\s*(?:the\s+)?(?:registrar|office of the registrar|university|srmist|srm|management|district collector|tnsdma|imd|government|collector)\b/i;

const NEWS_AGENCY_PREFIX_REGEX =
  /^(?:ani|pti|ians|uni|reuters|ap)\s*[-:]\s*/i;

/**
 * Computes token-level Jaccard similarity between two texts
 */
function computeJaccardSimilarity(textA: string, textB: string): number {
  const getTokens = (t: string) => {
    return new Set(
      t
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
  };

  const tokensA = getTokens(textA);
  const tokensB = getTokens(textB);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Detects shared origin clusters across evidence items.
 * Identifies:
 * - 1 primary official circular cited by multiple news outlets
 * - Wire agency syndication (PTI/ANI) repeated across multiple domains
 * - Same publisher repeated across different URLs
 * - Identical viral forwarded messages across chat channels
 */
export function detectSharedOriginClusters(
  evidenceList: Evidence[],
  sources?: (NormalizedSource | Source)[]
): SharedOriginCluster[] {
  const clusters: SharedOriginCluster[] = [];
  const processedEvidenceIds = new Set<string>();

  // Build lookup helpers
  const sourceMap = new Map<string, NormalizedSource | Source>();
  if (sources) {
    for (const s of sources) sourceMap.set(s.id, s);
  }

  // 1. Identify primary official sources
  const primaryEvidenceItems = evidenceList.filter((e) => {
    const src = sourceMap.get(e.sourceId);
    return (
      e.evidenceType === 'official' ||
      e.evidenceType === 'government' ||
      src?.type === 'Official notice' ||
      src?.type === 'Government source' ||
      e.url.includes('.edu.in') ||
      e.url.includes('.gov.in') ||
      e.extractionMethod === 'primary-circular-pdf'
    );
  });

  // Check which secondary news items are echoing/quoting each primary source
  for (const primary of primaryEvidenceItems) {
    const echoes: Evidence[] = [];
    const primarySrc = sourceMap.get(primary.sourceId);
    const publisherName = (primary.publisher || primarySrc?.name || 'Institutional Authority').toLowerCase();
    const primaryDomain = extractDomain(primary.url);
    const domainPrefix = primaryDomain.split('.')[0].toLowerCase();

    for (const item of evidenceList) {
      if (item.id === primary.id || processedEvidenceIds.has(item.id)) continue;
      const itemText = `${item.title} ${item.excerpt} ${item.context || ''}`.toLowerCase();

      // Check if secondary item explicitly cites this primary authority or quotes verbatim
      const citesPrimary =
        PRIMARY_OFFICIAL_CITATION_REGEX.test(itemText) ||
        itemText.includes(publisherName) ||
        (domainPrefix.length > 2 && itemText.includes(domainPrefix) && (itemText.includes('circular') || itemText.includes('denies') || itemText.includes('confirm') || itemText.includes('clarif') || itemText.includes('schedule') || itemText.includes('holiday'))) ||
        (publisherName.includes('registrar') && itemText.includes('registrar')) ||
        (publisherName.includes('tnsdma') && itemText.includes('tnsdma'));

      const textSimilarity = computeJaccardSimilarity(primary.excerpt, item.excerpt);

      if (citesPrimary || textSimilarity >= 0.35) {
        echoes.push(item);
      }
    }

    if (echoes.length > 0) {
      const clusterEvidenceIds = [primary.id, ...echoes.map((e) => e.id)];
      for (const id of clusterEvidenceIds) processedEvidenceIds.add(id);

      const publishers = [
        primary.publisher || primarySrc?.name || extractDomain(primary.url),
        ...echoes.map((e) => e.publisher || extractDomain(e.url)),
      ];

      clusters.push({
        clusterId: `cluster-primary-${primary.id}`,
        clusterType: 'primary_with_echoes',
        rootEvidenceId: primary.id,
        rootPublisher: primary.publisher || primarySrc?.name,
        rootDomain: extractDomain(primary.url),
        evidenceIds: clusterEvidenceIds,
        publishers: Array.from(new Set(publishers)),
        isWireSyndication: false,
        explanation: `1 primary source (${primary.publisher || primarySrc?.name || extractDomain(primary.url)}) cited by ${echoes.length} secondary reporting outlet${echoes.length > 1 ? 's' : ''}; treated as 1 primary source + ${echoes.length} secondary confirmation${echoes.length > 1 ? 's' : ''}, NOT ${clusterEvidenceIds.length} independent sources.`,
      });
    }
  }

  // 2. Identify wire syndication (PTI / ANI / UNI) or verbatim copy across remaining news items
  const remainingNews = evidenceList.filter(
    (e) => !processedEvidenceIds.has(e.id) && e.evidenceType === 'news'
  );

  for (let i = 0; i < remainingNews.length; i++) {
    const itemA = remainingNews[i];
    if (processedEvidenceIds.has(itemA.id)) continue;

    const syndicationGroup: Evidence[] = [itemA];
    const textA = `${itemA.title} ${itemA.excerpt} ${itemA.context || ''}`;

    for (let j = i + 1; j < remainingNews.length; j++) {
      const itemB = remainingNews[j];
      if (processedEvidenceIds.has(itemB.id)) continue;

      const textB = `${itemB.title} ${itemB.excerpt} ${itemB.context || ''}`;
      const hasWireCitation =
        (WIRE_SYNDICATION_REGEX.test(textA) && WIRE_SYNDICATION_REGEX.test(textB)) ||
        (NEWS_AGENCY_PREFIX_REGEX.test(itemA.title) && NEWS_AGENCY_PREFIX_REGEX.test(itemB.title));
      const similarity = computeJaccardSimilarity(itemA.excerpt, itemB.excerpt);

      if (hasWireCitation || similarity >= 0.55) {
        syndicationGroup.push(itemB);
      }
    }

    if (syndicationGroup.length > 1) {
      for (const item of syndicationGroup) processedEvidenceIds.add(item.id);

      clusters.push({
        clusterId: `cluster-wire-${itemA.id}`,
        clusterType: 'wire_syndication',
        rootEvidenceId: itemA.id,
        rootPublisher: 'Syndicated News Wire',
        evidenceIds: syndicationGroup.map((e) => e.id),
        publishers: Array.from(new Set(syndicationGroup.map((e) => e.publisher || extractDomain(e.url)))),
        isWireSyndication: true,
        explanation: `News wire syndication: ${syndicationGroup.length} outlets sharing syndicated copy; consolidated as 1 independent wire origin.`,
      });
    }
  }

  // 3. Identify same publisher repeated across multiple URLs
  const domainBuckets = new Map<string, Evidence[]>();
  for (const item of evidenceList) {
    if (processedEvidenceIds.has(item.id)) continue;
    const domain = extractDomain(item.url);
    if (!domainBuckets.has(domain)) domainBuckets.set(domain, []);
    domainBuckets.get(domain)!.push(item);
  }

  for (const [domain, items] of domainBuckets.entries()) {
    if (items.length > 1 && domain && domain !== 'unknown-domain') {
      for (const item of items) processedEvidenceIds.add(item.id);

      clusters.push({
        clusterId: `cluster-domain-${domain}`,
        clusterType: 'same_publisher_repeat',
        rootEvidenceId: items[0].id,
        rootPublisher: items[0].publisher,
        rootDomain: domain,
        evidenceIds: items.map((e) => e.id),
        publishers: [items[0].publisher || domain],
        isWireSyndication: false,
        explanation: `${items.length} distinct URLs published under the same domain (${domain}); consolidated as 1 independent voice.`,
      });
    }
  }

  // 4. Identify viral forwarded chat echo chains
  const socialItems = evidenceList.filter(
    (e) => !processedEvidenceIds.has(e.id) && e.evidenceType === 'social'
  );

  for (let i = 0; i < socialItems.length; i++) {
    const itemA = socialItems[i];
    if (processedEvidenceIds.has(itemA.id)) continue;

    const viralGroup: Evidence[] = [itemA];
    for (let j = i + 1; j < socialItems.length; j++) {
      const itemB = socialItems[j];
      if (processedEvidenceIds.has(itemB.id)) continue;

      const similarity = computeJaccardSimilarity(itemA.excerpt, itemB.excerpt);
      if (similarity >= 0.5) {
        viralGroup.push(itemB);
      }
    }

    if (viralGroup.length > 1) {
      for (const item of viralGroup) processedEvidenceIds.add(item.id);

      clusters.push({
        clusterId: `cluster-social-${itemA.id}`,
        clusterType: 'viral_social_echo',
        rootEvidenceId: itemA.id,
        evidenceIds: viralGroup.map((e) => e.id),
        publishers: Array.from(new Set(viralGroup.map((e) => e.publisher || extractDomain(e.url)))),
        isWireSyndication: false,
        explanation: `Viral copy-forward chain: ${viralGroup.length} social channels circulating identical rumor text; grouped as 1 unverified rumor voice.`,
      });
    }
  }

  return clusters;
}

/**
 * Builds independent voices by deduplicating clustered evidence and isolating unique publishers.
 */
export function buildIndependentVoices(
  evidenceList: Evidence[],
  assessments: EvidenceAssessment[],
  clusters: SharedOriginCluster[],
  sources?: (NormalizedSource | Source)[],
  credibilityMap?: Map<string, CredibilityAssessment>
): IndependentVoice[] {
  const assessmentMap = new Map<string, EvidenceAssessment>();
  for (const a of assessments) assessmentMap.set(a.evidenceId, a);

  const evidenceMap = new Map<string, Evidence>();
  for (const e of evidenceList) evidenceMap.set(e.id, e);

  const sourceMap = new Map<string, NormalizedSource | Source>();
  if (sources) {
    for (const s of sources) sourceMap.set(s.id, s);
  }

  const voices: IndependentVoice[] = [];
  const clusteredEvidenceIds = new Set<string>();

  // 1. Convert each cluster into an IndependentVoice
  for (const cluster of clusters) {
    for (const id of cluster.evidenceIds) clusteredEvidenceIds.add(id);

    const clusterEvidence = cluster.evidenceIds
      .map((id) => evidenceMap.get(id))
      .filter((e): e is Evidence => Boolean(e));

    const clusterAssessments = cluster.evidenceIds
      .map((id) => assessmentMap.get(id))
      .filter((a): a is EvidenceAssessment => Boolean(a));

    if (clusterEvidence.length === 0) continue;

    // Pick dominant stance (root evidence takes precedence if primary)
    const rootAssessment = cluster.rootEvidenceId ? assessmentMap.get(cluster.rootEvidenceId) : undefined;
    let dominantStance = rootAssessment?.relationship;

    if (!dominantStance) {
      const supports = clusterAssessments.filter((a) => a.relationship === 'supports').length;
      const contradicts = clusterAssessments.filter((a) => a.relationship === 'contradicts').length;
      if (contradicts > supports) dominantStance = 'contradicts';
      else if (supports > 0) dominantStance = 'supports';
      else dominantStance = 'neutral';
    }

    // Determine highest reliability across cluster
    let highestRel: SourceReliability = 'unverified';
    for (const evi of clusterEvidence) {
      const cred = credibilityMap?.get(evi.sourceId);
      const rel = cred?.reliability || 'unverified';
      if (rel === 'high') {
        highestRel = 'high';
        break;
      } else if (rel === 'medium') {
        highestRel = 'medium';
      } else if (rel === 'low' && highestRel === 'unverified') {
        highestRel = 'low';
      }
    }

    const primaryEvidence = clusterEvidence.find((e) => e.id === cluster.rootEvidenceId) || clusterEvidence[0];
    const highestRelevance = Math.max(...clusterEvidence.map((e) => e.relevanceScore || 0));

    voices.push({
      voiceId: cluster.clusterId,
      publisher: cluster.rootPublisher || primaryEvidence.publisher || extractDomain(primaryEvidence.url),
      domain: cluster.rootDomain || extractDomain(primaryEvidence.url),
      primaryEvidenceId: primaryEvidence.id,
      allEvidenceIds: cluster.evidenceIds,
      stance: dominantStance,
      highestReliability: highestRel,
      highestRelevance,
      isPrimarySource: cluster.clusterType === 'primary_with_echoes',
      publishedAt: primaryEvidence.publishedAt,
    });
  }

  // 2. Add unclustered independent evidence items as single voices
  for (const evi of evidenceList) {
    if (clusteredEvidenceIds.has(evi.id)) continue;
    if (evi.fetchStatus === 'inaccessible' || evi.fetchStatus === 'failed') continue;

    const asm = assessmentMap.get(evi.id);
    const src = sourceMap.get(evi.sourceId);
    const cred = credibilityMap?.get(evi.sourceId);

    voices.push({
      voiceId: `voice-indep-${evi.id}`,
      publisher: evi.publisher || src?.name || extractDomain(evi.url),
      domain: extractDomain(evi.url),
      primaryEvidenceId: evi.id,
      allEvidenceIds: [evi.id],
      stance: asm?.relationship || 'neutral',
      highestReliability: cred?.reliability || src?.reliability || 'unverified',
      highestRelevance: evi.relevanceScore || 0,
      isPrimarySource:
        evi.evidenceType === 'official' ||
        evi.evidenceType === 'government' ||
        evi.extractionMethod === 'primary-circular-pdf',
      publishedAt: evi.publishedAt,
    });
  }

  return voices;
}

/**
 * Identifies pairwise conflicts between evidence items taking opposing or discordant stances.
 */
export function findSourceConflicts(
  evidenceList: Evidence[],
  assessments: EvidenceAssessment[],
  sources?: (NormalizedSource | Source)[],
  credibilityMap?: Map<string, CredibilityAssessment>
): SourceConflict[] {
  const conflicts: SourceConflict[] = [];
  const assessmentMap = new Map<string, EvidenceAssessment>();
  for (const a of assessments) assessmentMap.set(a.evidenceId, a);

  const sourceMap = new Map<string, NormalizedSource | Source>();
  if (sources) {
    for (const s of sources) sourceMap.set(s.id, s);
  }

  const processedPairs = new Set<string>();

  for (let i = 0; i < evidenceList.length; i++) {
    for (let j = i + 1; j < evidenceList.length; j++) {
      const eviA = evidenceList[i];
      const eviB = evidenceList[j];

      const asmA = assessmentMap.get(eviA.id);
      const asmB = assessmentMap.get(eviB.id);
      if (!asmA || !asmB) continue;

      // Skip inaccessible or failed fetches
      if (eviA.fetchStatus === 'inaccessible' || eviB.fetchStatus === 'inaccessible') continue;

      const pairKey = [eviA.id, eviB.id].sort().join('::');
      if (processedPairs.has(pairKey)) continue;

      const srcA = sourceMap.get(eviA.sourceId);
      const srcB = sourceMap.get(eviB.sourceId);

      const credA = credibilityMap?.get(eviA.sourceId);
      const credB = credibilityMap?.get(eviB.sourceId);

      const relA = credA?.reliability || srcA?.reliability || 'unverified';
      const relB = credB?.reliability || srcB?.reliability || 'unverified';

      const nameA = eviA.publisher || srcA?.name || extractDomain(eviA.url);
      const nameB = eviB.publisher || srcB?.name || extractDomain(eviB.url);

      const textA = `${eviA.title} ${eviA.excerpt} ${eviA.context || ''}`.toLowerCase();
      const textB = `${eviB.title} ${eviB.excerpt} ${eviB.context || ''}`.toLowerCase();

      // CASE 1: DIRECT CONTRADICTION (Supports vs Contradicts)
      if (
        (asmA.relationship === 'supports' && asmB.relationship === 'contradicts') ||
        (asmA.relationship === 'contradicts' && asmB.relationship === 'supports')
      ) {
        processedPairs.add(pairKey);

        const supportingEvi = asmA.relationship === 'supports' ? eviA : eviB;
        const contradictingEvi = asmA.relationship === 'contradicts' ? eviA : eviB;
        const suppName = supportingEvi === eviA ? nameA : nameB;
        const contName = contradictingEvi === eviA ? nameA : nameB;
        const suppRel = supportingEvi === eviA ? relA : relB;
        const contRel = contradictingEvi === eviA ? relA : relB;

        let conflictType: ConflictType = 'direct_contradiction';
        let severity: ConflictSeverity = 'critical';
        let explanation = '';

        // Check for Scope Discrepancy (e.g. School holiday vs College operating normally)
        const isSchoolGovAdvisory =
          (textA.includes('school') && !textA.includes('all colleges')) ||
          (textB.includes('school') && !textB.includes('all colleges'));
        const mentionsCollegeDiscretion =
          textA.includes('autonomous discretion') ||
          textB.includes('autonomous discretion') ||
          textA.includes('discretion') ||
          textB.includes('discretion');

        if (isSchoolGovAdvisory || mentionsCollegeDiscretion) {
          conflictType = 'scope_discrepancy';
          severity = 'moderate';
          explanation = `Scope Discrepancy: ${nameA} and ${nameB} address different institutional tiers. Government advisories mandated school holidays in Chennai district, whereas collegiate institutions operate under independent autonomous jurisdiction.`;
        } else if (suppRel !== contRel && (contRel === 'high' || suppRel === 'high')) {
          conflictType = 'credibility_asymmetry';
          severity = 'critical';
          const authoritative = contRel === 'high' ? contName : suppName;
          const unverified = contRel === 'high' ? suppName : contName;
          explanation = `Direct Contradiction with Credibility Asymmetry: ${authoritative} (High Reliability) contradicts ${unverified} (${contRel === 'high' ? suppRel : contRel} Reliability). Authenticated institutional circular takes evidentiary precedence over unverified messages.`;
        } else {
          explanation = `Direct Contradiction: ${suppName} asserts that classes/exams are suspended or holiday is declared, which directly contradicts ${contName} stating that academic activities function normally.`;
        }

        // Check for temporal supersession if timestamps differ significantly
        if (eviA.publishedAt && eviB.publishedAt) {
          const timeA = new Date(eviA.publishedAt).getTime();
          const timeB = new Date(eviB.publishedAt).getTime();
          const diffHours = (timeB - timeA) / (1000 * 60 * 60);

          if (Math.abs(diffHours) >= 2) {
            const laterEvi = timeB > timeA ? eviB : eviA;
            const earlierEvi = timeB > timeA ? eviA : eviB;
            const laterName = laterEvi === eviA ? nameA : nameB;
            const earlierName = earlierEvi === eviA ? nameA : nameB;
            explanation += ` Timeline note: ${laterName} was published later (${laterEvi.publishedAt}), which may update or clarify earlier reporting by ${earlierName} (${earlierEvi.publishedAt}).`;
          }
        }

        conflicts.push({
          sourceA: nameA,
          sourceB: nameB,
          explanation,
          conflictType,
          severity,
          sourceAReliability: relA,
          sourceBReliability: relB,
          sourceATimestamp: eviA.publishedAt,
          sourceBTimestamp: eviB.publishedAt,
        });
      }

      // CASE 2: MODALITY DIVERGENCE (Assertive contradiction vs Speculative claim)
      else if (
        (asmA.relationship === 'contradicts' && asmA.modalityEvaluation?.evidenceModality === 'assertive') &&
        (asmB.relationship === 'neutral' && asmB.modalityEvaluation?.isSpeculativeOnly)
      ) {
        processedPairs.add(pairKey);
        conflicts.push({
          sourceA: nameA,
          sourceB: nameB,
          explanation: `Modality Divergence: ${nameA} provides definitive administrative instructions, whereas ${nameB} expresses speculative student anticipation ('may be closed') without institutional verification.`,
          conflictType: 'modality_divergence',
          severity: 'minor',
          sourceAReliability: relA,
          sourceBReliability: relB,
          sourceATimestamp: eviA.publishedAt,
          sourceBTimestamp: eviB.publishedAt,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Main Phase 8 Cross-Source Comparison Engine
 */
export function compareSources(
  claim: ExtractedClaim,
  evidenceList: Evidence[],
  assessments: EvidenceAssessment[],
  sources?: (NormalizedSource | Source)[],
  credibilityList?: CredibilityAssessment[]
): SourceComparison {
  // 1. Build Credibility Map
  const credibilityMap = new Map<string, CredibilityAssessment>();
  if (credibilityList) {
    for (const c of credibilityList) credibilityMap.set(c.sourceId, c);
  } else if (sources) {
    for (const s of sources) {
      credibilityMap.set(s.id, credibilityScorer.assessCredibility(s));
    }
  }

  // 2. Classify Evidence Assessments by Stance
  const supportingEvidence = assessments.filter((a) => a.relationship === 'supports');
  const contradictingEvidence = assessments.filter((a) => a.relationship === 'contradicts');
  const neutralEvidence = assessments.filter((a) => a.relationship === 'neutral');

  // 3. Detect Shared Origin Clusters (Deduplicate repeated reporting & syndication)
  const clusters = detectSharedOriginClusters(evidenceList, sources);

  // 4. Build Deduplicated Independent Voices
  const independentVoices = buildIndependentVoices(
    evidenceList,
    assessments,
    clusters,
    sources,
    credibilityMap
  );

  // 5. Compute Independent Confirmation Counts (Filtering out noise < 0.35 relevance)
  const independentSupportingVoices = independentVoices.filter(
    (v) => v.stance === 'supports' && v.highestRelevance >= 0.35
  );

  const independentContradictingVoices = independentVoices.filter(
    (v) => v.stance === 'contradicts' && v.highestRelevance >= 0.35
  );

  const independentSupportCount = independentSupportingVoices.length;
  const independentContradictionCount = independentContradictingVoices.length;

  // Count primary vs secondary vs unverified breakdown
  const primaryConfirmationCount = independentVoices.filter(
    (v) => v.isPrimarySource && v.stance !== 'insufficient'
  ).length;

  const secondaryConfirmationCount = evidenceList.filter((e) => {
    const isClusteredEcho = clusters.some(
      (c) => c.clusterType === 'primary_with_echoes' && c.evidenceIds.includes(e.id) && c.rootEvidenceId !== e.id
    );
    return isClusteredEcho || e.evidenceType === 'news';
  }).length;

  const unverifiedRumorCount = independentVoices.filter(
    (v) => v.highestReliability === 'unverified' || v.highestReliability === 'low'
  ).length;

  // 6. Find Conflicts
  const conflicts = findSourceConflicts(evidenceList, assessments, sources, credibilityMap);

  // 7. Evaluate Temporal Evolution
  const validTimestamps = evidenceList
    .map((e) => e.publishedAt)
    .filter((t): t is string => Boolean(t))
    .sort();

  const earliestTimestamp = validTimestamps[0];
  const latestTimestamp = validTimestamps[validTimestamps.length - 1];

  const hasTemporalSupersession = conflicts.some(
    (c) => c.conflictType === 'temporal_supersession' || (c.explanation.includes('Timeline note') && c.severity === 'critical')
  );

  // 8. Determine Overall Consistency
  let overallConsistency: OverallConsistency = 'insufficient';

  const accessibleEvidenceCount = evidenceList.filter(
    (e) => e.fetchStatus === 'accessible' || e.fetchStatus === 'partially_accessible'
  ).length;

  if (accessibleEvidenceCount === 0 || (independentSupportCount === 0 && independentContradictionCount === 0 && neutralEvidence.length === 0)) {
    overallConsistency = 'insufficient';
  } else if (conflicts.some((c) => c.severity === 'critical' && c.conflictType === 'direct_contradiction')) {
    // Both sides have authoritative independent evidence directly opposing each other
    const hasHighRelOnBothSides =
      independentSupportingVoices.some((v) => v.highestReliability === 'high') &&
      independentContradictingVoices.some((v) => v.highestReliability === 'high');

    if (hasHighRelOnBothSides) {
      overallConsistency = 'contradictory';
    } else {
      // One authoritative source refuting low-credibility rumors or mixed scopes
      overallConsistency = 'mixed';
    }
  } else if (independentSupportCount > 0 && independentContradictionCount > 0) {
    overallConsistency = 'mixed';
  } else if (independentContradictionCount > 0 && independentSupportCount === 0) {
    overallConsistency = 'consistent'; // Consistently contradicting the claim
  } else if (independentSupportCount > 0 && independentContradictionCount === 0) {
    overallConsistency = 'consistent'; // Consistently supporting the claim
  } else {
    overallConsistency = 'mixed';
  }

  // Synthesis Rationale Notes
  const synthesisRationale: string[] = [
    `Evaluated ${evidenceList.length} total evidence items across ${independentVoices.length} deduplicated independent voices.`,
    clusters.length > 0
      ? `Consolidated ${clusters.length} shared-origin cluster${clusters.length > 1 ? 's' : ''} to prevent duplicate syndication from inflating support counts.`
      : 'No syndicated wire clusters detected; all accessible sources represent distinct domains.',
    independentSupportCount > 0
      ? `${independentSupportCount} independent voice${independentSupportCount > 1 ? 's' : ''} support the proposition.`
      : 'Zero independent voices support the proposition.',
    independentContradictionCount > 0
      ? `${independentContradictionCount} independent voice${independentContradictionCount > 1 ? 's' : ''} contradict the proposition.`
      : 'Zero independent voices contradict the proposition.',
    conflicts.length > 0
      ? `Mapped ${conflicts.length} pairwise conflict${conflicts.length > 1 ? 's' : ''} across stances, scopes, and credibility tiers.`
      : 'No substantive cross-source conflicts detected.',
  ];

  return {
    supportingEvidence,
    contradictingEvidence,
    neutralEvidence,
    independentSupportCount,
    independentContradictionCount,
    conflicts: conflicts.map((c) => ({
      sourceA: c.sourceA,
      sourceB: c.sourceB,
      explanation: c.explanation,
    })),
    overallConsistency,
    independentVoices,
    clusters,
    primaryConfirmationCount,
    secondaryConfirmationCount,
    unverifiedRumorCount,
    temporalEvolution: {
      earliestTimestamp,
      latestTimestamp,
      isSupersededByLaterUpdate: hasTemporalSupersession,
      timelineNote:
        earliestTimestamp && latestTimestamp && earliestTimestamp !== latestTimestamp
          ? `Timeline spans from ${new Date(earliestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          : undefined,
    },
    synthesisRationale,
    comparedAt: new Date().toISOString(),
  };
}

/**
 * Source Comparator Service Abstraction
 */
export class SourceComparatorService {
  public compareSources(
    claim: ExtractedClaim,
    evidenceList: Evidence[],
    assessments: EvidenceAssessment[],
    sources?: (NormalizedSource | Source)[],
    credibilityList?: CredibilityAssessment[]
  ): SourceComparison {
    return compareSources(claim, evidenceList, assessments, sources, credibilityList);
  }

  public detectSharedOriginClusters(
    evidenceList: Evidence[],
    sources?: (NormalizedSource | Source)[]
  ): SharedOriginCluster[] {
    return detectSharedOriginClusters(evidenceList, sources);
  }

  public findSourceConflicts(
    evidenceList: Evidence[],
    assessments: EvidenceAssessment[],
    sources?: (NormalizedSource | Source)[],
    credibilityMap?: Map<string, CredibilityAssessment>
  ): SourceConflict[] {
    return findSourceConflicts(evidenceList, assessments, sources, credibilityMap);
  }
}

export const sourceComparator = new SourceComparatorService();
