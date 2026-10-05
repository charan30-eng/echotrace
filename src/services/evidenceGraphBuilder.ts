/**
 * EchoTrace Phase 9: Evidence Graph Builder Service
 * 
 * Formal Architecture:
 * CLAIM + SOURCES + EVIDENCE + RELATIONSHIPS → EVIDENCE GRAPH
 * 
 * Strict Guarantees:
 * 1. Preserves existing EchoTrace types: VariantNode, GraphEdge, Source, Evidence.
 * 2. Nodes constructed:
 *    - Original Claim node (origin root)
 *    - Supporting evidence nodes (derived directly from real pipeline)
 *    - Contradicting evidence nodes (derived directly from real pipeline)
 *    - Source / Publishing Authority nodes (accredited bodies, ministries, newsrooms)
 *    - Related claim / variant nodes (when preserved from lineage history)
 * 3. Edges constructed:
 *    - supports
 *    - contradicts
 *    - refuted by
 *    - derived from
 *    - published by
 *    - corroborates
 * 4. Critical Node Metadata Retention:
 *    Every evidence node strictly retains:
 *    - sourceId
 *    - URL
 *    - excerpt
 *    - timestamp
 *    - evidence relationship (supports / contradicts / neutral / insufficient)
 *    - reliability (high / medium / low / unverified)
 *    - whyItMatters (forensic rationale)
 * 5. Strict Non-Fabrication:
 *    - Never creates fake nodes.
 *    - Does not create evidence that does not come from the real evidence pipeline.
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import { Evidence } from '../types/evidence.ts';
import { EvidenceAssessment } from '../types/evidenceAnalysis.ts';
import {
  GraphEdge,
  GraphEdgeType,
  NodeType,
  Source,
  SourceReliability,
  VariantNode,
} from '../types/claim.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import { CredibilityAssessment } from '../types/credibility.ts';
import { extractDomain } from './sourceCollector.ts';
import { credibilityScorer } from './credibilityScorer.ts';

export interface EvidenceGraphBuildInput {
  claim: ExtractedClaim | string;
  evidenceList: Evidence[];
  assessments: EvidenceAssessment[];
  sources?: (NormalizedSource | Source)[];
  credibilityAssessments?: CredibilityAssessment[];
  existingNodes?: VariantNode[];
  existingEdges?: GraphEdge[];
  options?: EvidenceGraphOptions;
}

export interface EvidenceGraphOptions {
  includeSourceNodes?: boolean;
  includeCorroborationEdges?: boolean;
  preserveLineageVariants?: boolean;
  maxEvidenceNodes?: number;
}

export interface EvidenceGraphStats {
  totalNodes: number;
  claimNodes: number;
  evidenceNodes: number;
  supportingNodes: number;
  contradictingNodes: number;
  neutralNodes: number;
  sourceNodes: number;
  variantNodes: number;
  totalEdges: number;
}

export interface BuiltEvidenceGraph {
  nodes: VariantNode[];
  edges: GraphEdge[];
  stats: EvidenceGraphStats;
}

/**
 * Builds a connected Evidence Graph DAG from the real evidence pipeline.
 */
export function buildEvidenceGraph(input: EvidenceGraphBuildInput): BuiltEvidenceGraph {
  const {
    claim,
    evidenceList,
    assessments,
    sources = [],
    credibilityAssessments = [],
    existingNodes = [],
    existingEdges = [],
    options = {},
  } = input;

  const includeSourceNodes = options.includeSourceNodes ?? true;
  const includeCorroborationEdges = options.includeCorroborationEdges ?? true;
  const preserveLineageVariants = options.preserveLineageVariants ?? true;

  const nodes: VariantNode[] = [];
  const edges: GraphEdge[] = [];
  const addedNodeIds = new Set<string>();
  const addedEdgeIds = new Set<string>();

  const addNode = (node: VariantNode) => {
    if (!addedNodeIds.has(node.id)) {
      addedNodeIds.add(node.id);
      nodes.push(node);
    }
  };

  const addEdge = (edge: GraphEdge) => {
    const key = `${edge.from}::${edge.to}::${edge.type}`;
    if (!addedEdgeIds.has(key)) {
      addedEdgeIds.add(key);
      edges.push(edge);
    }
  };

  // 1. Build Lookup Maps
  const assessmentMap = new Map<string, EvidenceAssessment>();
  for (const a of assessments) {
    assessmentMap.set(a.evidenceId, a);
  }

  const sourceMap = new Map<string, NormalizedSource | Source>();
  for (const s of sources) {
    sourceMap.set(s.id, s);
  }

  const credibilityMap = new Map<string, CredibilityAssessment>();
  for (const c of credibilityAssessments) {
    credibilityMap.set(c.sourceId, c);
  }

  // 2. ROOT CLAIM NODE
  const claimText =
    typeof claim === 'string'
      ? claim
      : claim.claimText || claim.originalInput || 'Unspecified Claim';

  const claimId = typeof claim === 'string' ? 'node-claim-origin' : `node-claim-${claim.id || 'origin'}`;
  const claimTimestamp =
    typeof claim === 'string'
      ? new Date().toISOString()
      : claim.extractedAt || new Date().toISOString();

  const originClaimNode: VariantNode = {
    id: claimId,
    type: 'original',
    label: 'INVESTIGATED CLAIM',
    text: claimText,
    timestamp: typeof claim === 'string' ? 'Origin' : claim.timeReference || 'Origin',
    source: {
      id: 'src-origin-claim',
      type: 'Unknown',
      name: 'Investigated Claim Input',
      platform: 'input',
      reliability: 'unverified',
      status: 'Needs verification',
      timestamp: claimTimestamp,
    },
    relationship: 'investigated_claim',
    whyItMatters: 'Core factual proposition submitted to EchoTrace for evidence-based verification.',
    evidenceRef: typeof claim === 'string' ? 'claim-text' : claim.id || 'claim-origin',
    tags: ['origin', 'claim'],
  };
  addNode(originClaimNode);

  let supportingCount = 0;
  let contradictingCount = 0;
  let neutralCount = 0;
  let evidenceCount = 0;

  // 3. REAL EVIDENCE NODES
  for (const evi of evidenceList) {
    const asm = assessmentMap.get(evi.id);
    let src = sourceMap.get(evi.sourceId);

    // If source not explicitly in sources array, build from evidence metadata
    if (!src) {
      src = {
        id: evi.sourceId,
        type:
          evi.evidenceType === 'official'
            ? 'Official notice'
            : evi.evidenceType === 'government'
            ? 'Government source'
            : evi.evidenceType === 'news'
            ? 'News outlet'
            : evi.evidenceType === 'social'
            ? 'Social post'
            : 'Unknown',
        name: evi.publisher || extractDomain(evi.url),
        platform: 'web',
        reliability: 'unverified',
        status: 'Needs verification',
        timestamp: evi.publishedAt || evi.retrievedAt,
        url: evi.url,
        domain: extractDomain(evi.url),
      };
    }

    // Determine credibility
    let cred = credibilityMap.get(evi.sourceId);
    if (!cred) {
      cred = credibilityScorer.assessCredibility(src);
      credibilityMap.set(evi.sourceId, cred);
    }

    const rel = asm?.relationship || 'neutral';
    const nodeId = `node-evi-${evi.id}`;

    // Node Type & Label mapping
    let nodeType: NodeType = 'evidence';
    let label = 'PROOF';

    if (rel === 'supports') {
      nodeType = 'evidence';
      label = asm?.supportType === 'partial' ? 'PARTIAL SUPPORT' : 'SUPPORTING PROOF';
      supportingCount++;
    } else if (rel === 'contradicts') {
      nodeType = 'conflicting';
      label = 'CONTRADICTING PROOF';
      contradictingCount++;
    } else {
      nodeType = 'modified';
      label = evi.fetchStatus === 'inaccessible' ? 'INACCESSIBLE' : 'TOPICAL CONTEXT';
      neutralCount++;
    }
    evidenceCount++;

    const isPrimary =
      evi.evidenceType === 'official' ||
      evi.evidenceType === 'government' ||
      evi.extractionMethod === 'primary-circular-pdf';

    const evidenceNode: VariantNode = {
      id: nodeId,
      type: nodeType,
      label,
      text: evi.excerpt || evi.title,
      source: {
        ...src,
        reliability: cred.reliability,
        url: evi.url,
        domain: extractDomain(evi.url),
      },
      relationship: rel,
      whyItMatters:
        asm?.explanation ||
        (rel === 'supports'
          ? 'Affirms propositions of the claim with verified textual backing.'
          : rel === 'contradicts'
          ? 'Contradicts propositions of the claim based on authenticated records.'
          : 'Provides contextual background on ambient weather or conditions.'),
      evidenceRef: evi.url,
      tags: [evi.evidenceType, rel],

      // Strict Metadata Retention (Required by Phase 9)
      sourceId: evi.sourceId,
      url: evi.url,
      excerpt: evi.excerpt,
      context: evi.context,
      timestamp: evi.publishedAt || evi.retrievedAt,
      evidenceRelationship: rel,
      reliability: cred.reliability,
      relevanceScore: evi.relevanceScore,
      evidenceId: evi.id,
      evidenceType: evi.evidenceType,
      extractionMethod: evi.extractionMethod,
      isPrimarySource: isPrimary,
    };
    addNode(evidenceNode);

    // Add Edge from Claim to Evidence
    const edgeType: GraphEdgeType =
      rel === 'supports'
        ? 'supports'
        : rel === 'contradicts'
        ? 'contradicts'
        : 'derived from';

    const edgeLabel =
      rel === 'supports'
        ? asm?.supportType === 'partial'
          ? 'SUPPORTS (PARTIAL)'
          : 'SUPPORTS'
        : rel === 'contradicts'
        ? 'CONTRADICTS'
        : 'CONTEXT';

    addEdge({
      id: `edge-${claimId}-${nodeId}`,
      from: claimId,
      to: nodeId,
      label: edgeLabel,
      type: edgeType,
      description: asm?.explanation || `Evidence relationship: ${rel}`,
    });

    // 4. SOURCE NODES (PUBLISHING AUTHORITIES)
    if (includeSourceNodes && src) {
      const srcNodeId = `node-src-${src.id}`;
      const srcDomain = src.domain || extractDomain(src.url || '');
      const srcCred = credibilityMap.get(src.id) || cred;

      if (!addedNodeIds.has(srcNodeId)) {
        const sourceNode: VariantNode = {
          id: srcNodeId,
          type: 'evidence',
          label:
            src.type === 'Government source'
              ? 'GOV AUTHORITY'
              : src.type === 'Official notice'
              ? 'REGISTRAR'
              : 'PUBLISHER',
          text: src.name + (srcDomain ? ` [${srcDomain}]` : ''),
          timestamp: src.timestamp || 'Active',
          source: {
            ...src,
            reliability: srcCred.reliability,
          },
          relationship: 'publishing_authority',
          whyItMatters:
            src.reliabilityExplanation ||
            'Institutional entity responsible for publishing and maintaining origin dispatches.',
          evidenceRef: src.url || srcDomain,
          tags: ['source', src.type],

          // Retain metadata
          sourceId: src.id,
          url: src.url,
          reliability: srcCred.reliability,
        };
        addNode(sourceNode);
      }

      // Edge from Evidence to Source: PUBLISHED BY
      addEdge({
        id: `edge-pub-${nodeId}-${srcNodeId}`,
        from: nodeId,
        to: srcNodeId,
        label: 'PUBLISHED BY',
        type: 'published by',
        description: `Published and hosted by ${src.name} on ${srcDomain}`,
      });
    }
  }

  // 5. CORROBORATION EDGES (Secondary News -> Primary Circulars)
  if (includeCorroborationEdges) {
    const primaryItems = evidenceList.filter(
      (e) =>
        e.evidenceType === 'official' ||
        e.evidenceType === 'government' ||
        e.extractionMethod === 'primary-circular-pdf'
    );

    const secondaryItems = evidenceList.filter((e) => e.evidenceType === 'news');

    for (const sec of secondaryItems) {
      const secText = `${sec.title} ${sec.excerpt} ${sec.context || ''}`.toLowerCase();
      for (const prim of primaryItems) {
        const primName = (prim.publisher || '').toLowerCase();
        const primDomain = extractDomain(prim.url).split('.')[0].toLowerCase();

        const quotesPrimary =
          secText.includes('circular') ||
          secText.includes('registrar') ||
          (primName && secText.includes(primName)) ||
          (primDomain && secText.includes(primDomain));

        if (quotesPrimary) {
          addEdge({
            id: `edge-corrob-${sec.id}-${prim.id}`,
            from: `node-evi-${sec.id}`,
            to: `node-evi-${prim.id}`,
            label: 'CORROBORATES',
            type: 'corroborates',
            description: `${sec.publisher || 'News outlet'} quotes and corroborates primary circular from ${prim.publisher || 'Registrar'}.`,
          });
        }
      }
    }
  }

  // 6. PRESERVE EXISTING LINEAGE VARIANTS (Claim Drift / Chat Forwards)
  let variantCount = 0;
  if (preserveLineageVariants && existingNodes.length > 0) {
    for (const exNode of existingNodes) {
      // Avoid duplicate root claim
      if (exNode.type === 'original' || exNode.id === claimId) continue;

      // Avoid duplicate evidence if already added by real pipeline
      const isAlreadyAdded = nodes.some(
        (n) => n.id === exNode.id || (n.url && exNode.source?.url && n.url === exNode.source.url)
      );

      if (!isAlreadyAdded) {
        addNode({
          ...exNode,
          id: exNode.id.startsWith('node-') ? exNode.id : `node-variant-${exNode.id}`,
        });
        variantCount++;

        // Add mutation/drift edge from root claim
        addEdge({
          id: `edge-drift-${claimId}-${exNode.id}`,
          from: claimId,
          to: exNode.id.startsWith('node-') ? exNode.id : `node-variant-${exNode.id}`,
          label: exNode.type === 'conflicting' ? 'MUTATED CONFLICT' : 'SEMANTIC DRIFT',
          type: exNode.type === 'conflicting' ? 'contradicts' : 'mutated',
          description: exNode.mutationNote || 'Peer-to-peer forwarded message variant circulating on social media.',
        });
      }
    }

    // Preserve relevant existing edges
    for (const exEdge of existingEdges) {
      if (addedNodeIds.has(exEdge.from) && addedNodeIds.has(exEdge.to)) {
        addEdge(exEdge);
      }
    }
  }

  const sourceNodesCount = nodes.filter((n) => n.relationship === 'publishing_authority').length;

  const stats: EvidenceGraphStats = {
    totalNodes: nodes.length,
    claimNodes: 1,
    evidenceNodes: evidenceCount,
    supportingNodes: supportingCount,
    contradictingNodes: contradictingCount,
    neutralNodes: neutralCount,
    sourceNodes: sourceNodesCount,
    variantNodes: variantCount,
    totalEdges: edges.length,
  };

  return {
    nodes,
    edges,
    stats,
  };
}

/**
 * Service Abstraction for Evidence Graph Builder
 */
export class EvidenceGraphBuilderService {
  public buildEvidenceGraph(input: EvidenceGraphBuildInput): BuiltEvidenceGraph {
    return buildEvidenceGraph(input);
  }
}

export const evidenceGraphBuilder = new EvidenceGraphBuilderService();
