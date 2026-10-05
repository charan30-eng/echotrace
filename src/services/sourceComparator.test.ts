/**
 * Unit Test Suite for EchoTrace Phase 8: Cross-Source Comparison Service
 * 
 * Verifies:
 * 1. Independent sources vs repeated syndication:
 *    - 5 news sites all copying the same official statement are treated as
 *      1 primary source + multiple secondary confirmations, not 6 independent sources.
 * 2. Same publisher repeated across multiple URLs:
 *    - Multiple URLs under the same domain are consolidated into 1 independent voice.
 * 3. Conflicting statements detection:
 *    - Identifies direct contradictions, scope discrepancies, and credibility asymmetries.
 * 4. Overall consistency classification:
 *    - 'consistent' | 'mixed' | 'contradictory' | 'insufficient'
 * 5. Strict isolation:
 *    - Does NOT compute the final overall claim verdict.
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import { Evidence } from '../types/evidence.ts';
import { EvidenceAssessment } from '../types/evidenceAnalysis.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import {
  compareSources,
  detectSharedOriginClusters,
  findSourceConflicts,
  sourceComparator,
} from './sourceComparator.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Canonical test claim
const testClaim: ExtractedClaim = {
  id: 'claim-srm-closure-001',
  originalInput: 'SRM University declared holiday tomorrow due to heavy rain in Chennai',
  claimText: 'SRM University declared holiday tomorrow due to heavy rain in Chennai',
  subject: 'SRM University',
  action: 'declared holiday',
  object: 'classes and examinations',
  timeReference: 'tomorrow',
  location: 'Kattankulathur Chennai',
  reason: 'heavy rain',
  entities: ['SRM University', 'Chennai'],
  keywords: ['holiday', 'rain', 'tomorrow', 'srm'],
  modality: 'assertive',
  isAmbiguous: false,
  verificationStatus: 'unverified',
  confidence: 0.95,
  extractedAt: '2026-10-05T00:00:00Z',
};

// -------------------------------------------------------------
// Test 1: Deduplication of Reporting (Primary Source + Secondary Echoes)
// -------------------------------------------------------------
function testPrimarySourcePlusSecondaryEchoes() {
  console.log('Testing: Deduplication of Reporting (1 Primary + 3 Secondary Echoes)...');

  const primaryEvidence: Evidence = {
    id: 'evi-primary-srm',
    sourceId: 'src-srm-reg',
    title: 'SRMIST Office of the Registrar: Official Circular',
    url: 'https://srmist.edu.in/announcements/circular-oct5.pdf',
    publisher: 'SRM Institute of Science and Technology',
    publishedAt: '2026-10-04T18:00:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'All academic activities and semester examinations will function normally as per the regular timetable.',
    context: 'Office of the Registrar: In view of rumors circulating on social media, all classes and semester examinations across Kattankulathur campus will function normally as per the regular timetable.',
    relevanceScore: 0.95,
    evidenceType: 'official',
    extractionMethod: 'primary-circular-pdf',
    fetchStatus: 'accessible',
  };

  // 3 news sites all quoting the Registrar's statement
  const newsEcho1: Evidence = {
    id: 'evi-news-hindu',
    sourceId: 'src-hindu',
    title: 'The Hindu: SRM University denies holiday rumors',
    url: 'https://thehindu.com/news/cities/chennai/srm-denies-holiday-circular/article123.ece',
    publisher: 'The Hindu',
    publishedAt: '2026-10-04T19:30:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'Quoting the Registrar, SRM Institute of Science and Technology confirmed all academic activities and semester examinations will function normally.',
    relevanceScore: 0.88,
    evidenceType: 'news',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const newsEcho2: Evidence = {
    id: 'evi-news-ndtv',
    sourceId: 'src-ndtv',
    title: 'NDTV Education: SRMIST issues circular on weather schedule',
    url: 'https://ndtv.com/education/srmist-circular-oct-schedule-456',
    publisher: 'NDTV',
    publishedAt: '2026-10-04T20:00:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'In a circular issued by the Registrar, SRMIST clarified that classes will function normally as per regular timetable.',
    relevanceScore: 0.85,
    evidenceType: 'news',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const newsEcho3: Evidence = {
    id: 'evi-news-express',
    sourceId: 'src-express',
    title: 'Indian Express: No holiday for SRM University tomorrow',
    url: 'https://indianexpress.com/article/cities/chennai/srm-university-holiday-rumor-debunked-789',
    publisher: 'The New Indian Express',
    publishedAt: '2026-10-04T20:15:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'According to the circular issued by SRM University, all academic sessions will continue normally without suspension.',
    relevanceScore: 0.86,
    evidenceType: 'news',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const evidenceList = [primaryEvidence, newsEcho1, newsEcho2, newsEcho3];

  const assessments: EvidenceAssessment[] = evidenceList.map((e) => ({
    evidenceId: e.id,
    relationship: 'contradicts',
    relevanceScore: e.relevanceScore,
    explanation: 'Confirms that classes will function normally, contradicting holiday claim.',
    matchedClaimElements: ['subject', 'action', 'time'],
  }));

  const comparison = sourceComparator.compareSources(testClaim, evidenceList, assessments);

  // Must detect cluster
  assert(comparison.clusters !== undefined && comparison.clusters.length >= 1, 'Should detect primary with echoes cluster');
  const cluster = comparison.clusters![0];
  assert(cluster.clusterType === 'primary_with_echoes', 'Cluster type should be primary_with_echoes');
  assert(cluster.rootEvidenceId === 'evi-primary-srm', 'Root should be primary registrar circular');
  assert(cluster.evidenceIds.length === 4, 'Cluster should contain primary + 3 news echoes');

  // CRITICAL REQUIREMENT: Do NOT count 4 articles as 4 independent voices
  assert(
    comparison.independentContradictionCount === 1,
    `Should count as 1 independent contradiction voice, got ${comparison.independentContradictionCount}`
  );
  assert(
    comparison.independentSupportCount === 0,
    `Independent support count should be 0, got ${comparison.independentSupportCount}`
  );
  assert(
    comparison.overallConsistency === 'consistent',
    `Overall consistency should be consistent, got ${comparison.overallConsistency}`
  );

  console.log('✓ testPrimarySourcePlusSecondaryEchoes passed.');
}

// -------------------------------------------------------------
// Test 2: Same Publisher Repeated Across Multiple URLs
// -------------------------------------------------------------
function testSamePublisherConsolidation() {
  console.log('Testing: Same Publisher Repeated Across Multiple URLs...');

  const toiUrl1: Evidence = {
    id: 'evi-toi-1',
    sourceId: 'src-toi-1',
    title: 'Times of India Live Weather: Chennai Rain Updates',
    url: 'https://timesofindia.indiatimes.com/city/chennai/rain-live-updates-oct-5/articleshow/111.cms',
    publisher: 'The Times of India',
    publishedAt: '2026-10-04T17:00:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'Red alert issued for Chennai coastal districts.',
    relevanceScore: 0.6,
    evidenceType: 'news',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const toiUrl2: Evidence = {
    id: 'evi-toi-2',
    sourceId: 'src-toi-2',
    title: 'Times of India Education: Colleges Schedule in Chengalpattu',
    url: 'https://timesofindia.indiatimes.com/education/chengalpattu-institutions-rain-review/articleshow/222.cms',
    publisher: 'The Times of India',
    publishedAt: '2026-10-04T18:30:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'Universities in Chengalpattu report regular working hours.',
    relevanceScore: 0.75,
    evidenceType: 'news',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const evidenceList = [toiUrl1, toiUrl2];
  const assessments: EvidenceAssessment[] = [
    {
      evidenceId: 'evi-toi-1',
      relationship: 'neutral',
      relevanceScore: 0.6,
      explanation: 'Reports weather warning without campus holiday declaration.',
      matchedClaimElements: ['location', 'conditions'],
    },
    {
      evidenceId: 'evi-toi-2',
      relationship: 'contradicts',
      relevanceScore: 0.75,
      explanation: 'Reports universities in Chengalpattu operate regular working hours.',
      matchedClaimElements: ['subject', 'action'],
    },
  ];

  const comparison = sourceComparator.compareSources(testClaim, evidenceList, assessments);

  assert(comparison.clusters !== undefined && comparison.clusters.length >= 1, 'Should detect same domain cluster');
  assert(comparison.clusters![0].clusterType === 'same_publisher_repeat', 'Cluster type should be same_publisher_repeat');
  assert(comparison.independentVoices !== undefined && comparison.independentVoices.length === 1, 'Should consolidate to 1 independent voice');

  console.log('✓ testSamePublisherConsolidation passed.');
}

// -------------------------------------------------------------
// Test 3: Conflicting Statements & Asymmetric Credibility
// -------------------------------------------------------------
function testConflictingStatementsAndAsymmetry() {
  console.log('Testing: Conflicting Statements & Asymmetric Credibility...');

  const officialSource: Evidence = {
    id: 'evi-official-order',
    sourceId: 'src-srm-reg',
    title: 'SRMIST Office of the Registrar Advisory',
    url: 'https://srmist.edu.in/announcements/circular-operations.pdf',
    publisher: 'SRM Institute of Science and Technology',
    publishedAt: '2026-10-04T18:00:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'All academic activities, scheduled laboratory sessions, and semester examinations will function normally.',
    relevanceScore: 0.94,
    evidenceType: 'official',
    extractionMethod: 'primary-circular-pdf',
    fetchStatus: 'accessible',
  };

  const unverifiedPost: Evidence = {
    id: 'evi-telegram-post',
    sourceId: 'src-telegram-rumor',
    title: 'Student WhatsApp Forwarded Circular',
    url: 'https://t.me/srm_community_updates/8812',
    publisher: 'Telegram Student Channel',
    publishedAt: '2026-10-05T02:15:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'Classes are suspended tomorrow across Kattankulathur campus due to cyclone alert.',
    relevanceScore: 0.85,
    evidenceType: 'social',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const evidenceList = [officialSource, unverifiedPost];

  const assessments: EvidenceAssessment[] = [
    {
      evidenceId: 'evi-official-order',
      relationship: 'contradicts',
      relevanceScore: 0.94,
      explanation: 'Confirms that classes and examinations will function normally.',
      matchedClaimElements: ['subject', 'action', 'time'],
    },
    {
      evidenceId: 'evi-telegram-post',
      relationship: 'supports',
      relevanceScore: 0.85,
      explanation: 'Asserts that classes are suspended tomorrow.',
      matchedClaimElements: ['subject', 'action', 'location'],
    },
  ];

  const normalizedSources: NormalizedSource[] = [
    {
      id: 'src-srm-reg',
      url: officialSource.url,
      domain: 'srmist.edu.in',
      name: 'SRMIST Office of the Registrar',
      type: 'Official notice',
      platform: 'web',
      reliability: 'high',
      status: 'Verified source',
      timestamp: '2026-10-04T18:00:00Z',
      publisher: 'SRM Institute of Science and Technology',
      publishedAt: '2026-10-04T18:00:00Z',
      retrievalTimestamp: new Date().toISOString(),
      reliabilityExplanation: 'Official academic domain',
      contentFetchStatus: 'fetched',
      provenance: {
        originalQuery: 'SRM official circular',
        canonicalUrl: officialSource.url,
        collectedAt: new Date().toISOString(),
      },
    },
    {
      id: 'src-telegram-rumor',
      url: unverifiedPost.url,
      domain: 't.me',
      name: 'Student WhatsApp Forwarded Circular',
      type: 'Forwarded chat',
      platform: 'telegram',
      reliability: 'low',
      status: 'Unverified',
      timestamp: '2026-10-05T02:15:00Z',
      publisher: 'Telegram Student Channel',
      publishedAt: '2026-10-05T02:15:00Z',
      retrievalTimestamp: new Date().toISOString(),
      reliabilityExplanation: 'Unverified forward',
      contentFetchStatus: 'fetched',
      provenance: {
        originalQuery: 'SRM holiday news student circular',
        canonicalUrl: unverifiedPost.url,
        collectedAt: new Date().toISOString(),
      },
    },
  ];

  const comparison = sourceComparator.compareSources(
    testClaim,
    evidenceList,
    assessments,
    normalizedSources
  );

  // Must detect conflict
  assert(comparison.conflicts.length >= 1, 'Should detect pairwise conflict between official source and telegram post');
  const conflict = comparison.conflicts[0];
  assert(conflict.sourceA.length > 0 && conflict.sourceB.length > 0, 'Conflict sources must be named');
  assert(
    conflict.explanation.includes('contradicts') || conflict.explanation.includes('Contradiction'),
    'Explanation must detail contradiction'
  );

  // Consistency should be mixed (1 high contradiction vs 1 low support)
  assert(comparison.overallConsistency === 'mixed', `Overall consistency should be mixed, got ${comparison.overallConsistency}`);
  assert(comparison.independentSupportCount === 1, 'Independent support count should be 1');
  assert(comparison.independentContradictionCount === 1, 'Independent contradiction count should be 1');

  console.log('✓ testConflictingStatementsAndAsymmetry passed.');
}

// -------------------------------------------------------------
// Test 4: Scope Discrepancy Detection (Schools vs Universities)
// -------------------------------------------------------------
function testScopeDiscrepancyDetection() {
  console.log('Testing: Scope Discrepancy Detection (Schools vs Autonomous Colleges)...');

  const govSchoolAdvisory: Evidence = {
    id: 'evi-tnsdma',
    sourceId: 'src-tnsdma',
    title: 'TNSDMA Coastal District Holiday Notice',
    url: 'https://tnsdma.tn.gov.in/school-advisory-oct.html',
    publisher: 'Tamil Nadu State Disaster Management Authority',
    publishedAt: '2026-10-04T20:00:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'District collectors have declared precautionary holiday for primary and secondary schools; higher educational institutions operate under independent autonomous discretion.',
    relevanceScore: 0.85,
    evidenceType: 'government',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const studentPost: Evidence = {
    id: 'evi-student-rumor',
    sourceId: 'src-student-rumor',
    title: 'Campus Rumors: College Holiday Due To Collector Order',
    url: 'https://campusrumors.blog/srm-holiday',
    publisher: 'Campus Rumors Blog',
    publishedAt: '2026-10-04T21:00:00Z',
    retrievedAt: new Date().toISOString(),
    excerpt: 'District collector declared holiday for all institutions, so SRM is closed.',
    relevanceScore: 0.8,
    evidenceType: 'social',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const evidenceList = [govSchoolAdvisory, studentPost];
  const assessments: EvidenceAssessment[] = [
    {
      evidenceId: 'evi-tnsdma',
      relationship: 'contradicts',
      relevanceScore: 0.85,
      explanation: 'Explains that holiday applies only to primary and secondary schools, not colleges.',
      matchedClaimElements: ['subject', 'location'],
    },
    {
      evidenceId: 'evi-student-rumor',
      relationship: 'supports',
      relevanceScore: 0.8,
      explanation: 'Claims campus is closed due to district collector order.',
      matchedClaimElements: ['subject', 'action', 'conditions'],
    },
  ];

  const conflicts = findSourceConflicts(evidenceList, assessments);
  assert(conflicts.length >= 1, 'Should detect conflict between gov advisory and student rumor');
  const conflict = conflicts[0];
  assert(
    conflict.conflictType === 'scope_discrepancy' || conflict.explanation.includes('Scope Discrepancy') || conflict.explanation.includes('school'),
    `Conflict should explain scope discrepancy between schools and colleges: ${conflict.explanation}`
  );

  console.log('✓ testScopeDiscrepancyDetection passed.');
}

// -------------------------------------------------------------
// Test 5: Insufficient Evidence Handling
// -------------------------------------------------------------
function testInsufficientEvidenceHandling() {
  console.log('Testing: Insufficient Evidence Handling...');

  const inaccessibleEvi: Evidence = {
    id: 'evi-paywalled',
    sourceId: 'src-paywalled',
    title: 'Paywalled Regional Press',
    url: 'https://paywallpress.com/article',
    publisher: 'Paywall Press',
    retrievedAt: new Date().toISOString(),
    excerpt: '',
    relevanceScore: 0.0,
    evidenceType: 'news',
    extractionMethod: 'inaccessible-source-preserved',
    fetchStatus: 'inaccessible',
  };

  const assessments: EvidenceAssessment[] = [
    {
      evidenceId: 'evi-paywalled',
      relationship: 'insufficient',
      relevanceScore: 0.0,
      explanation: 'Content is inaccessible due to paywall.',
      matchedClaimElements: [],
    },
  ];

  const comparison = sourceComparator.compareSources(testClaim, [inaccessibleEvi], assessments);

  assert(comparison.overallConsistency === 'insufficient', 'Should be insufficient when evidence is inaccessible');
  assert(comparison.independentSupportCount === 0, 'Support count should be 0');
  assert(comparison.independentContradictionCount === 0, 'Contradiction count should be 0');

  console.log('✓ testInsufficientEvidenceHandling passed.');
}

// -------------------------------------------------------------
// Main Runner
// -------------------------------------------------------------
function runAllTests() {
  console.log('====================================================');
  console.log('RUNNING ECHO TRACE PHASE 8 SOURCE COMPARATOR TESTS');
  console.log('====================================================');

  testPrimarySourcePlusSecondaryEchoes();
  testSamePublisherConsolidation();
  testConflictingStatementsAndAsymmetry();
  testScopeDiscrepancyDetection();
  testInsufficientEvidenceHandling();

  console.log('====================================================');
  console.log('ALL PHASE 8 SOURCE COMPARATOR TESTS PASSED (100% OK)');
  console.log('====================================================');
}

runAllTests();
