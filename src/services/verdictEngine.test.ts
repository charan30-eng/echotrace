import { describe, it } from 'node:test';
import assert from 'node:assert';
import { verdictEngine } from './verdictEngine.ts';
import { ExtractedClaim } from '../types/claimExtraction.ts';
import { Evidence } from '../types/evidence.ts';
import { EvidenceAssessment } from '../types/evidenceAnalysis.ts';
import { Source } from '../types/claim.ts';
import { CredibilityAssessment } from '../types/credibility.ts';
import { DEMO_SCENARIOS } from '../data/demoScenarios.ts';

describe('Phase 10: Final Verdict Engine', () => {
  const baseClaim: ExtractedClaim = {
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

  const officialSource: Source = {
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
  };

  const officialContradictingEvidence: Evidence = {
    id: 'evi-reg-circular',
    sourceId: officialSource.id,
    title: 'Circular on Academic Operations',
    url: 'https://srmist.edu.in/announcements/circular-operations.pdf',
    publisher: 'SRM Institute of Science and Technology',
    publishedAt: '2026-10-04T18:00:00Z',
    retrievedAt: '2026-10-05T08:05:00Z',
    excerpt: 'All classes and administrative offices will operate as usual tomorrow. No suspension has been announced.',
    context: 'Official notification issued by the Registrar to counter circulating social rumors.',
    relevanceScore: 0.95,
    evidenceType: 'official',
    extractionMethod: 'primary_pdf_extraction',
    fetchStatus: 'accessible',
  };

  const officialContradictingAssessment: EvidenceAssessment = {
    evidenceId: officialContradictingEvidence.id,
    relationship: 'contradicts',
    relevanceScore: 0.95,
    explanation: 'Official circular explicitly states classes will operate as usual, contradicting the closure claim.',
    matchedClaimElements: ['subject', 'action', 'timeReference'],
    supportType: 'none',
    assessedAt: '2026-10-05T08:06:00Z',
  };

  const studentSource: Source = {
    id: 'src-student-tg',
    url: 'https://t.me/srm_student_hub/9912',
    domain: 't.me',
    name: 'SRM Student Discussion Group',
    type: 'Social post',
    platform: 'Telegram',
    reliability: 'low',
    status: 'Needs verification',
    timestamp: '2026-10-04T16:30:00Z',
    publisher: null,
    publishedAt: '2026-10-04T16:30:00Z',
    retrievalTimestamp: '2026-10-05T08:05:00Z',
    contentFetchStatus: 'fetched',
    reliabilityExplanation: 'Ephemeral chat forward with zero institutional credentials.',
  };

  const studentSupportingEvidence: Evidence = {
    id: 'evi-student-post',
    sourceId: studentSource.id,
    title: 'Student Telegram Forward',
    url: 'https://t.me/srm_student_hub/9912',
    publishedAt: '2026-10-04T16:30:00Z',
    retrievedAt: '2026-10-05T08:05:00Z',
    excerpt: 'Hearing from friends that college is closed tomorrow because of red alert rainfall.',
    context: 'Unverified forwarded message in student community channel.',
    relevanceScore: 0.75,
    evidenceType: 'social',
    extractionMethod: 'html_extraction',
    fetchStatus: 'accessible',
  };

  const studentSupportingAssessment: EvidenceAssessment = {
    evidenceId: studentSupportingEvidence.id,
    relationship: 'supports',
    relevanceScore: 0.75,
    explanation: 'Informal student forward repeating rumor of campus closure.',
    matchedClaimElements: ['subject', 'action', 'reason'],
    supportType: 'partial',
    assessedAt: '2026-10-05T08:06:00Z',
  };

  it('1. returns UNVERIFIED when no evidence has been collected or assessed', () => {
    const verdict = verdictEngine.evaluateVerdict({
      claim: baseClaim,
      evidenceList: [],
      assessments: [],
    });

    assert.strictEqual(verdict.status, 'unverified');
    assert.strictEqual(verdict.confidence, 0.0);
    assert.ok(verdict.explanation.toLowerCase().includes('unverified'));
    assert.strictEqual(verdict.supportingEvidenceIds.length, 0);
    assert.strictEqual(verdict.contradictingEvidenceIds.length, 0);
    assert.ok(verdict.keyFactors.length > 0);
    assert.ok(verdict.limitations.length > 0);
  });

  it('2. returns INSUFFICIENT_EVIDENCE when sources cannot be accessed or lack substantive confirmation', () => {
    const inaccessibleEvidence: Evidence = {
      id: 'evi-inaccessible-1',
      sourceId: 'src-blocked-1',
      title: 'Paywalled News Article',
      url: 'https://premiumnews.example.com/item/1',
      retrievedAt: '2026-10-05T08:05:00Z',
      excerpt: '',
      relevanceScore: 0.2,
      evidenceType: 'news',
      extractionMethod: 'failed',
      fetchStatus: 'inaccessible',
      inaccessibleReason: 'HTTP 403 Forbidden: Paywall protected',
    };

    const verdict = verdictEngine.evaluateVerdict({
      claim: baseClaim,
      evidenceList: [inaccessibleEvidence],
      assessments: [
        {
          evidenceId: inaccessibleEvidence.id,
          relationship: 'insufficient',
          relevanceScore: 0.2,
          explanation: 'Content inaccessible due to paywall.',
          matchedClaimElements: [],
        },
      ],
      sources: [
        {
          id: 'src-blocked-1',
          name: 'Blocked News',
          platform: 'Web',
          reliability: 'medium',
          status: 'Needs verification',
          timestamp: 'Today',
          type: 'News outlet',
          url: 'https://premiumnews.example.com/item/1',
          domain: 'premiumnews.example.com',
          publisher: 'Premium News',
          publishedAt: '2026-10-04T18:00:00Z',
        },
      ],
    });

    assert.strictEqual(verdict.status, 'insufficient_evidence');
    assert.ok(verdict.confidence <= 0.4);
    assert.ok(verdict.explanation.toLowerCase().includes('insufficient evidence'));
    assert.ok(verdict.limitations.some((l) => l.includes('inaccessible') || l.includes('incomplete')));
  });

  it('3. returns CONTRADICTED when authoritative evidence directly refutes the claim', () => {
    const verdict = verdictEngine.evaluateVerdict({
      claim: baseClaim,
      evidenceList: [officialContradictingEvidence, studentSupportingEvidence],
      assessments: [officialContradictingAssessment, studentSupportingAssessment],
      sources: [officialSource, studentSource],
    });

    assert.strictEqual(verdict.status, 'contradicted');
    // Rule: Confidence must represent confidence in assessment based on evidence, NOT 100% mathematical certainty
    assert.ok(verdict.confidence >= 0.8 && verdict.confidence < 1.0, `Confidence was ${verdict.confidence}`);
    assert.ok(verdict.explanation.includes('Contradicted by authoritative evidence'));
    assert.ok(verdict.explanation.includes('Registrar') || verdict.explanation.includes('SRM'));
    assert.ok(verdict.contradictingEvidenceIds.includes(officialContradictingEvidence.id));
    assert.ok(verdict.supportingEvidenceIds.includes(studentSupportingEvidence.id));

    // Key factors should reflect authoritative refutation
    const authFactor = verdict.keyFactors.find((f) => f.name === 'Institutional Authority');
    assert.ok(authFactor);
    assert.strictEqual(authFactor.impact, 'negative');
  });

  it('4. returns SUPPORTED when authoritative evidence affirms the proposition', () => {
    const supportedClaim: ExtractedClaim = {
      ...baseClaim,
      originalInput: 'Tamil Nadu Government declared holiday for schools in Chennai tomorrow due to heavy rain.',
      claimText: 'Tamil Nadu Government declared holiday for schools in Chennai tomorrow due to heavy rain.',
      subject: 'schools in Chennai',
      action: 'holiday declared',
    };

    const govSource: Source = {
      id: 'src-tn-gov',
      url: 'https://chennai.nic.in/press-release/holiday-oct5.pdf',
      domain: 'chennai.nic.in',
      name: 'District Collectorate Chennai',
      type: 'Government source',
      platform: 'web',
      reliability: 'high',
      status: 'Verified source',
      timestamp: '2026-10-04T19:00:00Z',
      publisher: 'District Collector Chennai',
      publishedAt: '2026-10-04T19:00:00Z',
      retrievalTimestamp: '2026-10-05T08:05:00Z',
      contentFetchStatus: 'fetched',
    };

    const govEvidence: Evidence = {
      id: 'evi-gov-notice',
      sourceId: govSource.id,
      title: 'District Collector Press Release on Rain Holiday',
      url: govSource.url!,
      publisher: 'District Collector Chennai',
      publishedAt: '2026-10-04T19:00:00Z',
      retrievedAt: '2026-10-05T08:05:00Z',
      excerpt: 'In view of heavy rainfall forecasts by IMD, a holiday has been declared for all schools in Chennai district tomorrow.',
      context: 'Official press release issued by the District Collector.',
      relevanceScore: 0.98,
      evidenceType: 'government',
      extractionMethod: 'pdf_extraction',
      fetchStatus: 'accessible',
    };

    const govAssessment: EvidenceAssessment = {
      evidenceId: govEvidence.id,
      relationship: 'supports',
      relevanceScore: 0.98,
      explanation: 'Official government press release confirms the holiday for Chennai schools.',
      matchedClaimElements: ['subject', 'action', 'reason', 'timeReference', 'location'],
      supportType: 'full',
      assessedAt: '2026-10-05T08:06:00Z',
    };

    const verdict = verdictEngine.evaluateVerdict({
      claim: supportedClaim,
      evidenceList: [govEvidence],
      assessments: [govAssessment],
      sources: [govSource],
    });

    assert.strictEqual(verdict.status, 'supported');
    // Does NOT say "100% TRUE"
    assert.ok(verdict.confidence >= 0.8 && verdict.confidence < 1.0);
    assert.ok(verdict.explanation.includes('Supported by available evidence'));
    assert.ok(!verdict.explanation.includes('100% TRUE'));
    assert.ok(verdict.supportingEvidenceIds.includes(govEvidence.id));
    assert.strictEqual(verdict.contradictingEvidenceIds.length, 0);

    const authFactor = verdict.keyFactors.find((f) => f.name === 'Institutional Authority');
    assert.ok(authFactor);
    assert.strictEqual(authFactor.impact, 'positive');
  });

  it('5. returns MIXED and exposes disagreement when credible sources clash', () => {
    const newsSourceA: Source = {
      id: 'src-thehindu',
      url: 'https://thehindu.com/news/local-update',
      domain: 'thehindu.com',
      name: 'The Hindu',
      type: 'News outlet',
      platform: 'web',
      reliability: 'high',
      status: 'Verified source',
      timestamp: '2026-10-04T18:30:00Z',
      publisher: 'The Hindu',
      publishedAt: '2026-10-04T18:30:00Z',
      retrievalTimestamp: '2026-10-05T08:05:00Z',
    };

    const newsSourceB: Source = {
      id: 'src-dtnext',
      url: 'https://dtnext.in/news/local-update',
      domain: 'dtnext.in',
      name: 'DT Next',
      type: 'News outlet',
      platform: 'web',
      reliability: 'medium',
      status: 'Verified source',
      timestamp: '2026-10-04T18:45:00Z',
      publisher: 'DT Next',
      publishedAt: '2026-10-04T18:45:00Z',
      retrievalTimestamp: '2026-10-05T08:05:00Z',
    };

    const evidenceA: Evidence = {
      id: 'evi-news-a',
      sourceId: newsSourceA.id,
      title: 'College declares holiday',
      url: newsSourceA.url!,
      publisher: 'The Hindu',
      publishedAt: '2026-10-04T18:30:00Z',
      retrievedAt: '2026-10-05T08:05:00Z',
      excerpt: 'SRM University announces suspension of physical lectures tomorrow due to localized waterlogging.',
      relevanceScore: 0.9,
      evidenceType: 'news',
      extractionMethod: 'article_extractor',
      fetchStatus: 'accessible',
    };

    const evidenceB: Evidence = {
      id: 'evi-news-b',
      sourceId: newsSourceB.id,
      title: 'SRM operates as normal',
      url: newsSourceB.url!,
      publisher: 'DT Next',
      publishedAt: '2026-10-04T18:45:00Z',
      retrievedAt: '2026-10-05T08:05:00Z',
      excerpt: 'University administration clarifies all scheduled classes will proceed without disruption.',
      relevanceScore: 0.9,
      evidenceType: 'news',
      extractionMethod: 'article_extractor',
      fetchStatus: 'accessible',
    };

    const assessmentA: EvidenceAssessment = {
      evidenceId: evidenceA.id,
      relationship: 'supports',
      relevanceScore: 0.9,
      explanation: 'Reports that classes are suspended.',
      matchedClaimElements: ['subject', 'action'],
      supportType: 'full',
    };

    const assessmentB: EvidenceAssessment = {
      evidenceId: evidenceB.id,
      relationship: 'contradicts',
      relevanceScore: 0.9,
      explanation: 'Reports that administration will proceed without disruption.',
      matchedClaimElements: ['subject', 'action'],
      supportType: 'none',
    };

    const verdict = verdictEngine.evaluateVerdict({
      claim: baseClaim,
      evidenceList: [evidenceA, evidenceB],
      assessments: [assessmentA, assessmentB],
      sources: [newsSourceA, newsSourceB],
    });

    assert.strictEqual(verdict.status, 'mixed');
    assert.ok(verdict.explanation.includes('Evidence is mixed across available sources'));
    assert.strictEqual(verdict.supportingEvidenceIds.length, 1);
    assert.strictEqual(verdict.contradictingEvidenceIds.length, 1);
  });

  it('6. evaluates Demo Scenario 1 (SRM College Closure) to CONTRADICTED', () => {
    const scenario = DEMO_SCENARIOS[0];
    const verdict = verdictEngine.evaluateClaimAnalysis(scenario.analysis);

    assert.strictEqual(verdict.status, 'contradicted');
    assert.ok(verdict.confidence >= 0.8 && verdict.confidence < 1.0);
    assert.ok(verdict.explanation.includes('Contradicted by authoritative evidence'));
    assert.ok(verdict.contradictingEvidenceIds.length > 0);
  });

  it('7. strictly does not use obsolete hardcoded scores or claim absolute truth', () => {
    const verdict = verdictEngine.evaluateVerdict({
      claim: baseClaim,
      evidenceList: [officialContradictingEvidence],
      assessments: [officialContradictingAssessment],
      sources: [officialSource],
    });

    // Must not produce a "100% TRUE" or "100% FALSE" claim
    assert.notStrictEqual(verdict.confidence, 1.0);
    assert.ok(!verdict.explanation.includes('100% TRUE'));
    assert.ok(!verdict.explanation.includes('100% FALSE'));

    // Must have structured factors with positive/negative/neutral
    for (const factor of verdict.keyFactors) {
      assert.ok(['positive', 'negative', 'neutral'].includes(factor.impact));
      assert.ok(typeof factor.name === 'string' && factor.name.length > 0);
      assert.ok(typeof factor.explanation === 'string' && factor.explanation.length > 0);
    }

    // Must have explainable limitations
    assert.ok(verdict.limitations.length >= 2);
    assert.ok(verdict.limitations.some((l) => l.includes('omniscience') || l.includes('bounded')));
  });
});
