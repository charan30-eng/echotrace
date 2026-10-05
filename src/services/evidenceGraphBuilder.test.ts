import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evidenceGraphBuilder,
  EvidenceGraphBuildInput,
} from './evidenceGraphBuilder.ts';
import { Evidence } from '../types/evidence.ts';
import { EvidenceAssessment } from '../types/evidenceAnalysis.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import { ExtractedClaim } from '../types/claimExtraction.ts';
import { VariantNode } from '../types/claim.ts';

describe('Phase 9: Evidence Graph Builder Service', () => {
  const mockClaim: ExtractedClaim = {
    id: 'claim-srm-closure-2026',
    originalInput: 'SRM College is closed tomorrow due to heavy rain.',
    claimText: 'SRM College is closed tomorrow due to heavy rain.',
    subject: 'SRM College',
    action: 'closed',
    timeReference: 'tomorrow',
    modality: 'assertive',
    isAmbiguous: false,
    verificationStatus: 'unverified',
    confidence: 0.95,
    extractedAt: '2026-10-05T08:00:00Z',
    entities: ['SRM College'],
    keywords: ['SRM College', 'closed', 'heavy rain', 'tomorrow'],
  };

  const mockSources: NormalizedSource[] = [
    {
      id: 'src-srm-reg',
      url: 'https://srmist.edu.in/announcements/circular-operations.pdf',
      domain: 'srmist.edu.in',
      name: 'SRMIST Office of the Registrar',
      type: 'Official notice',
      platform: 'web',
      reliability: 'high',
      status: 'Verified source',
      timestamp: '2026-10-04T18:00:00Z',
      publisher: 'SRM Institute of Science and Technology',
      publishedAt: '2026-10-04T18:00:00Z',
      retrievalTimestamp: '2026-10-05T08:05:00Z',
      contentFetchStatus: 'fetched',
      reliabilityExplanation: 'Official academic domain (.edu.in) under registrar executive authority.',
      provenance: {
        originalQuery: 'SRM circular holiday',
        canonicalUrl: 'https://srmist.edu.in/announcements/circular-operations.pdf',
        searchProvider: 'OfficialSourceProvider',
        sourceTypeRank: 1,
        collectedAt: '2026-10-05T08:05:00Z',
      },
    },
    {
      id: 'src-student-tg',
      url: 'https://t.me/srm_student_hub/9912',
      domain: 't.me',
      name: 'SRM Student Discussion Group',
      type: 'Social post',
      platform: 'Telegram',
      reliability: 'unverified',
      status: 'Needs verification',
      timestamp: '2026-10-05T02:00:00Z',
      publisher: 'Anonymous Student Admin',
      publishedAt: '2026-10-05T02:00:00Z',
      retrievalTimestamp: '2026-10-05T08:05:00Z',
      contentFetchStatus: 'fetched',
      reliabilityExplanation: 'Anonymous social messaging channel lacking institutional verification.',
      provenance: {
        originalQuery: 'SRM holiday news',
        canonicalUrl: 'https://t.me/srm_student_hub/9912',
        searchProvider: 'WebSearchProvider',
        sourceTypeRank: 4,
        collectedAt: '2026-10-05T08:05:00Z',
      },
    },
    {
      id: 'src-news-hindu',
      url: 'https://www.thehindu.com/news/cities/chennai/srm-normal-classes-rain.html',
      domain: 'thehindu.com',
      name: 'The Hindu',
      type: 'News outlet',
      platform: 'web',
      reliability: 'high',
      status: 'Verified source',
      timestamp: '2026-10-04T21:00:00Z',
      publisher: 'The Hindu Publishing Group',
      publishedAt: '2026-10-04T21:00:00Z',
      retrievalTimestamp: '2026-10-05T08:05:00Z',
      contentFetchStatus: 'fetched',
      reliabilityExplanation: 'Established editorial news organization with recognized masthead.',
      provenance: {
        originalQuery: 'SRM rain update Hindu',
        canonicalUrl: 'https://www.thehindu.com/news/cities/chennai/srm-normal-classes-rain.html',
        searchProvider: 'WebSearchProvider',
        sourceTypeRank: 2,
        collectedAt: '2026-10-05T08:05:00Z',
      },
    },
  ];

  const mockEvidenceList: Evidence[] = [
    {
      id: 'evi-srm-reg',
      sourceId: 'src-srm-reg',
      title: 'Official Circular on Regular Operations',
      url: 'https://srmist.edu.in/announcements/circular-operations.pdf',
      publisher: 'SRM Institute of Science and Technology',
      publishedAt: '2026-10-04T18:00:00Z',
      retrievedAt: '2026-10-05T08:05:00Z',
      excerpt:
        'All academic activities, examinations, and classes will function normally as scheduled across Kattankulathur campus.',
      context:
        'Circular Ref SRM-2026-R4: All academic activities, examinations, and classes will function normally as scheduled across Kattankulathur campus.',
      relevanceScore: 0.95,
      evidenceType: 'official',
      extractionMethod: 'semantic-passage-search',
      fetchStatus: 'accessible',
      matchedKeywords: ['classes', 'function normally', 'regular timetable'],
    },
    {
      id: 'evi-student-tg',
      sourceId: 'src-student-tg',
      title: 'Urgent Telegram Forward',
      url: 'https://t.me/srm_student_hub/9912',
      publisher: 'Anonymous Student Admin',
      publishedAt: '2026-10-05T02:00:00Z',
      retrievedAt: '2026-10-05T08:05:00Z',
      excerpt: 'Classes are suspended tomorrow due to severe waterlogging around campus.',
      context: 'Forwarded message: Classes are suspended tomorrow due to severe waterlogging around campus.',
      relevanceScore: 0.85,
      evidenceType: 'social',
      extractionMethod: 'semantic-passage-search',
      fetchStatus: 'accessible',
      matchedKeywords: ['classes', 'suspended', 'waterlogging'],
    },
    {
      id: 'evi-news-hindu',
      sourceId: 'src-news-hindu',
      title: 'SRM confirms classes to run normally despite rain',
      url: 'https://www.thehindu.com/news/cities/chennai/srm-normal-classes-rain.html',
      publisher: 'The Hindu Publishing Group',
      publishedAt: '2026-10-04T21:00:00Z',
      retrievedAt: '2026-10-05T08:05:00Z',
      excerpt:
        'Quoting the SRM Registrar circular, officials reiterated that university colleges will function normally without holiday.',
      context:
        'The Hindu: Quoting the SRM Registrar circular, officials reiterated that university colleges will function normally without holiday.',
      relevanceScore: 0.91,
      evidenceType: 'news',
      extractionMethod: 'semantic-passage-search',
      fetchStatus: 'accessible',
      matchedKeywords: ['SRM Registrar', 'circular', 'function normally'],
    },
  ];

  const mockAssessments: EvidenceAssessment[] = [
    {
      evidenceId: 'evi-srm-reg',
      relationship: 'contradicts',
      relevanceScore: 0.95,
      explanation:
        'The official registrar circular affirms normal operations and denies any closure, directly contradicting the claim that college is closed.',
      matchedClaimElements: ['SRM College', 'closed', 'tomorrow'],
    },
    {
      evidenceId: 'evi-student-tg',
      relationship: 'supports',
      relevanceScore: 0.85,
      explanation:
        'The student post asserts that classes are suspended tomorrow, repeating the proposition of closure.',
      matchedClaimElements: ['closed', 'tomorrow'],
      supportType: 'full',
    },
    {
      evidenceId: 'evi-news-hindu',
      relationship: 'contradicts',
      relevanceScore: 0.91,
      explanation:
        'The news report confirms colleges function normally quoting the official circular, contradicting the claim.',
      matchedClaimElements: ['SRM College', 'closed'],
    },
  ];

  it('builds an evidence graph with original claim, evidence, and source authority nodes', () => {
    const input: EvidenceGraphBuildInput = {
      claim: mockClaim,
      evidenceList: mockEvidenceList,
      assessments: mockAssessments,
      sources: mockSources,
    };

    const graph = evidenceGraphBuilder.buildEvidenceGraph(input);

    assert.ok(graph.nodes.length > 0, 'Graph should contain nodes');
    assert.ok(graph.edges.length > 0, 'Graph should contain edges');

    // 1. Root Claim Node
    const rootNode = graph.nodes.find((n) => n.type === 'original');
    assert.ok(rootNode, 'Root claim node must exist with type="original"');
    assert.strictEqual(rootNode.id, 'node-claim-claim-srm-closure-2026');
    assert.strictEqual(rootNode.text, 'SRM College is closed tomorrow due to heavy rain.');

    // 2. Supporting Evidence Node
    const supportingNode = graph.nodes.find((n) => n.id === 'node-evi-evi-student-tg');
    assert.ok(supportingNode, 'Supporting evidence node must exist');
    assert.strictEqual(supportingNode.type, 'evidence');
    assert.strictEqual(supportingNode.evidenceRelationship, 'supports');
    assert.ok(supportingNode.label.includes('SUPPORT'), 'Supporting node should have SUPPORT label');

    // 3. Contradicting Evidence Node
    const contradictingNode = graph.nodes.find((n) => n.id === 'node-evi-evi-srm-reg');
    assert.ok(contradictingNode, 'Contradicting evidence node must exist');
    assert.strictEqual(contradictingNode.type, 'conflicting');
    assert.strictEqual(contradictingNode.evidenceRelationship, 'contradicts');
    assert.ok(contradictingNode.label.includes('CONTRADICTING'), 'Contradicting node should have CONTRADICTING label');

    // 4. Source Authority Nodes
    const srmSourceNode = graph.nodes.find((n) => n.id === 'node-src-src-srm-reg');
    assert.ok(srmSourceNode, 'Source authority node for SRM Registrar must exist');
    assert.strictEqual(srmSourceNode.relationship, 'publishing_authority');
    assert.strictEqual(srmSourceNode.source.reliability, 'high');
  });

  it('strictly retains all required metadata on every evidence node (Phase 9 requirement)', () => {
    const graph = evidenceGraphBuilder.buildEvidenceGraph({
      claim: mockClaim,
      evidenceList: mockEvidenceList,
      assessments: mockAssessments,
      sources: mockSources,
    });

    const evidenceNodes = graph.nodes.filter(
      (n) => n.id.startsWith('node-evi-')
    );

    assert.strictEqual(evidenceNodes.length, mockEvidenceList.length);

    for (const node of evidenceNodes) {
      assert.ok(node.sourceId, `Node ${node.id} must retain sourceId`);
      assert.ok(node.url, `Node ${node.id} must retain URL`);
      assert.ok(node.excerpt !== undefined, `Node ${node.id} must retain excerpt`);
      assert.ok(node.timestamp, `Node ${node.id} must retain timestamp`);
      assert.ok(node.evidenceRelationship, `Node ${node.id} must retain evidence relationship`);
      assert.ok(node.reliability, `Node ${node.id} must retain reliability`);
      assert.ok(node.whyItMatters, `Node ${node.id} must retain forensic rationale whyItMatters`);
    }

    // Explicit check on primary registrar node
    const regNode = graph.nodes.find((n) => n.id === 'node-evi-evi-srm-reg');
    assert.strictEqual(regNode?.sourceId, 'src-srm-reg');
    assert.strictEqual(regNode?.url, 'https://srmist.edu.in/announcements/circular-operations.pdf');
    assert.strictEqual(
      regNode?.excerpt,
      'All academic activities, examinations, and classes will function normally as scheduled across Kattankulathur campus.'
    );
    assert.strictEqual(regNode?.evidenceRelationship, 'contradicts');
    assert.strictEqual(regNode?.reliability, 'high');
  });

  it('creates edges with relationships: supports, contradicts/refuted by, published by, and corroborates', () => {
    const graph = evidenceGraphBuilder.buildEvidenceGraph({
      claim: mockClaim,
      evidenceList: mockEvidenceList,
      assessments: mockAssessments,
      sources: mockSources,
      options: {
        includeSourceNodes: true,
        includeCorroborationEdges: true,
      },
    });

    // Supports edge
    const supportsEdge = graph.edges.find((e) => e.type === 'supports');
    assert.ok(supportsEdge, 'Supports edge must exist from claim to student post');
    assert.strictEqual(supportsEdge.from, 'node-claim-claim-srm-closure-2026');
    assert.strictEqual(supportsEdge.to, 'node-evi-evi-student-tg');

    // Contradicts or refuted by edge
    const contradictsEdge = graph.edges.find(
      (e) => e.type === 'contradicts' || e.type === 'refuted by'
    );
    assert.ok(contradictsEdge, 'Contradicts/refuted by edge must exist from claim to registrar notice');
    assert.strictEqual(contradictsEdge.from, 'node-claim-claim-srm-closure-2026');
    assert.strictEqual(contradictsEdge.to, 'node-evi-evi-srm-reg');

    // Published By edge
    const publishedByEdge = graph.edges.find((e) => e.type === 'published by');
    assert.ok(publishedByEdge, 'Published By edge must exist from evidence to source');
    assert.strictEqual(publishedByEdge.from, 'node-evi-evi-srm-reg');
    assert.strictEqual(publishedByEdge.to, 'node-src-src-srm-reg');

    // Corroborates edge (The Hindu secondary news quoting primary registrar circular)
    const corroboratesEdge = graph.edges.find((e) => e.type === 'corroborates');
    assert.ok(corroboratesEdge, 'Corroborates edge must exist from secondary news to official notice');
    assert.strictEqual(corroboratesEdge.from, 'node-evi-evi-news-hindu');
    assert.strictEqual(corroboratesEdge.to, 'node-evi-evi-srm-reg');
  });

  it('preserves existing lineage variant nodes when requested', () => {
    const existingVariants: VariantNode[] = [
      {
        id: 'variant-chat-forward-1',
        type: 'modified',
        label: 'Chat Forward Drift',
        text: 'SRM is closed for the entire week until next Monday!',
        timestamp: '10:30 AM',
        source: {
          id: 'src-fwd-1',
          type: 'Social post',
          name: 'WhatsApp Forward Cluster',
          platform: 'WhatsApp',
          reliability: 'low',
          status: 'Needs verification',
          timestamp: '10:30 AM',
        },
        relationship: 'scope_inflation',
        whyItMatters: 'Demonstrates escalation of rumor duration from 1 day to 7 days.',
        evidenceRef: 'forward-drift',
        mutationNote: 'Escalated closure duration (+6 days).',
      },
    ];

    const graph = evidenceGraphBuilder.buildEvidenceGraph({
      claim: mockClaim,
      evidenceList: mockEvidenceList,
      assessments: mockAssessments,
      sources: mockSources,
      existingNodes: existingVariants,
      options: {
        preserveLineageVariants: true,
      },
    });

    const preservedVariant = graph.nodes.find((n) => n.id.includes('variant-chat-forward-1'));
    assert.ok(preservedVariant, 'Existing variant node must be preserved in evidence graph');
    assert.strictEqual(preservedVariant.type, 'modified');

    const driftEdge = graph.edges.find((e) => e.to === preservedVariant.id);
    assert.ok(driftEdge, 'Edge connecting claim to preserved variant must exist');
    assert.strictEqual(driftEdge.type, 'mutated');
  });

  it('strictly adheres to non-fabrication: zero fake nodes when evidence is empty', () => {
    const graph = evidenceGraphBuilder.buildEvidenceGraph({
      claim: mockClaim,
      evidenceList: [],
      assessments: [],
      sources: [],
    });

    // Only the single origin root claim node should be present
    assert.strictEqual(graph.nodes.length, 1);
    assert.strictEqual(graph.nodes[0].type, 'original');
    assert.strictEqual(graph.edges.length, 0);
    assert.strictEqual(graph.stats.evidenceNodes, 0);
    assert.strictEqual(graph.stats.sourceNodes, 0);
  });
});
