/**
 * EchoTrace Phase 5: Content Fetching & Evidence Extraction Test Suite
 * 
 * Verifies:
 * 1. Extraction of accessible page content into standardized Evidence records.
 * 2. Exact passage extraction: 1-2 sentence excerpt AND surrounding paragraph context.
 * 3. Context preservation preventing out-of-context deception (e.g. cherry-picked quotes).
 * 4. Strict Non-Fabrication: When pages are inaccessible or failed, never fake text.
 * 5. Primary circular / PDF document support.
 * 6. Claim-guided passage relevance scoring (0.0 to 1.0).
 * 7. Correct mapping of source types to standardized EvidenceType.
 * 8. Batch processing across diverse fetch statuses.
 * 9. Explicit verification separation: NO final TRUE/FALSE verdict calculated yet.
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import {
  Evidence,
  FetchedSourceContent,
} from '../types/evidence.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import {
  extractAllEvidence,
  extractEvidence,
  mapSourceTypeToEvidenceType,
  scorePassageRelevance,
} from './evidenceExtractor.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Helper to build valid NormalizedSource objects satisfying all interface properties
 */
function createMockSource(partial: Partial<NormalizedSource> & { id: string; url: string }): NormalizedSource {
  return {
    id: partial.id,
    type: partial.type || 'Official notice',
    name: partial.name || 'Mock Source Name',
    platform: partial.platform || 'Institutional Host',
    reliability: partial.reliability || 'high',
    status: partial.status || 'Verified source',
    timestamp: partial.timestamp || 'Retrieved just now',
    url: partial.url,
    domain: partial.domain || 'srmist.edu.in',
    publisher: partial.publisher ?? 'Institutional Host',
    publishedAt: partial.publishedAt ?? null,
    retrievalTimestamp: partial.retrievalTimestamp || '2026-10-05T06:00:00Z',
    reliabilityExplanation: partial.reliabilityExplanation || 'Primary accredited institutional domain.',
    provenance: partial.provenance || {
      originalQuery: 'SRM official notice college closed',
      canonicalUrl: partial.url,
      collectedAt: '2026-10-05T06:00:00Z',
    },
    contentFetchStatus: partial.contentFetchStatus || 'pending',
    snippet: partial.snippet,
  };
}

// Sample Extracted Claim (e.g., from Phase 2)
const sampleClaim: ExtractedClaim = {
  id: 'claim-srm-rain-1',
  originalInput: 'SRM Institute Kattankulathur is closed tomorrow due to heavy rain holiday circular',
  claimText: 'SRM Institute Kattankulathur declares holiday and class closure due to heavy rain',
  subject: 'SRM Institute',
  action: 'holiday closure',
  reason: 'heavy rain',
  timeReference: 'tomorrow',
  location: 'Kattankulathur',
  entities: ['SRM Institute', 'SRMIST', 'Kattankulathur'],
  keywords: ['holiday', 'closed', 'classes', 'circular', 'rain', 'tomorrow'],
  extractedAt: '2026-10-05T06:00:00Z',
  modality: 'assertive',
  isAmbiguous: false,
  verificationStatus: 'unverified',
  confidence: 0.95,
};

// -------------------------------------------------------------
// Test 1: Standard Evidence Model Compliance & Type Mapping
// -------------------------------------------------------------
function testEvidenceModelAndTypeMapping() {
  console.log('Testing: Evidence Model Compliance & Type Mapping...');

  assert(mapSourceTypeToEvidenceType('Official notice') === 'official', 'Official notice -> official');
  assert(mapSourceTypeToEvidenceType('Government source') === 'government', 'Government source -> government');
  assert(mapSourceTypeToEvidenceType('News outlet') === 'news', 'News outlet -> news');
  assert(mapSourceTypeToEvidenceType('Official social account') === 'social', 'Official social account -> social');
  assert(mapSourceTypeToEvidenceType('Social post') === 'social', 'Social post -> social');
  assert(mapSourceTypeToEvidenceType('Student portal post') === 'secondary', 'Student portal post -> secondary');
  assert(mapSourceTypeToEvidenceType('Blog') === 'secondary', 'Blog -> secondary');
  assert(mapSourceTypeToEvidenceType('Unknown') === 'unknown', 'Unknown -> unknown');

  console.log('✓ testEvidenceModelAndTypeMapping passed.');
}

// -------------------------------------------------------------
// Test 2: Accessible Page Content Extraction (Excerpt & Context)
// -------------------------------------------------------------
function testAccessibleExtractionWithContext() {
  console.log('Testing: Accessible Page Extraction (Excerpt & Enclosing Context)...');

  const source = createMockSource({
    id: 'src-hindu-101',
    type: 'News outlet',
    name: 'The Hindu: Chennai Weather & Educational Institutions Update',
    platform: 'The Hindu',
    reliability: 'high',
    status: 'Needs verification',
    url: 'https://thehindu.com/news/cities/chennai/rain-update.html',
    domain: 'thehindu.com',
    publisher: 'The Hindu',
    publishedAt: '2026-10-05T04:30:00Z',
  });

  const fetchedContent: FetchedSourceContent = {
    url: 'https://thehindu.com/news/cities/chennai/rain-update.html',
    sourceId: source.id,
    status: 'accessible',
    statusCode: 200,
    title: 'Chennai Weather: Schools Closed in Coastal Districts, Colleges Function Normally',
    mainText: `The Regional Meteorological Centre on Sunday forecast moderate to heavy rain in Chennai and Chengalpattu districts.

District authorities confirmed that holiday has been declared for primary and secondary schools across Chennai. However, all colleges and universities, including SRM Institute at Kattankulathur, will function normally with regular classes scheduled.

A spokesperson for the university clarified that semester examinations will be conducted as per the published academic timetable.`,
    retrievedAt: '2026-10-05T06:05:00Z',
    latencyMs: 340,
  };

  const evidence = extractEvidence(sampleClaim, source, fetchedContent);

  // Validate Evidence fields
  assert(Boolean(evidence.id), 'Must have an evidence ID');
  assert(evidence.sourceId === 'src-hindu-101', 'Must preserve sourceId');
  assert(evidence.evidenceType === 'news', 'EvidenceType must be news');
  assert(evidence.url === 'https://thehindu.com/news/cities/chennai/rain-update.html', 'Must preserve URL');
  assert(evidence.publisher === 'The Hindu', 'Must preserve publisher');
  assert(evidence.retrievedAt === '2026-10-05T06:05:00Z', 'Must preserve retrievedAt');
  assert(evidence.fetchStatus === 'accessible', 'Must have accessible fetchStatus');

  // Validate Excerpt and Context
  assert(Boolean(evidence.excerpt), 'Must have extracted an excerpt');
  assert(Boolean(evidence.context), 'Must have extracted enclosing context');
  assert(evidence.excerpt.includes('SRM Institute'), 'Excerpt must mention the relevant entity SRM Institute');
  assert(evidence.context!.includes('District authorities confirmed'), 'Context must be the enclosing paragraph');

  // Validate relevance score
  assert(evidence.relevanceScore >= 0.5, `Relevance score must be high, got ${evidence.relevanceScore}`);
  assert(evidence.extractionMethod === 'semantic-passage-search', 'Extraction method must be semantic-passage-search');

  console.log('✓ testAccessibleExtractionWithContext passed.');
}

// -------------------------------------------------------------
// Test 3: Context Preservation Prevents Out-Of-Context Deception
// -------------------------------------------------------------
function testContextPreservationPreventsDeception() {
  console.log('Testing: Context Preservation to Prevent Out-Of-Context Deception...');

  // Deceptive claim scenario: Rumor claims "HOLIDAY DECLARED!"
  // If someone cherry-picks only the words "holiday has been declared", they mislead readers.
  // EchoTrace must provide the full paragraph context where the distinction is clearly made!
  const paragraph =
    'District authorities confirmed that holiday has been declared for primary and secondary schools across Chennai. However, all colleges and universities, including SRM Institute at Kattankulathur, will function normally with regular classes scheduled.';

  const source = createMockSource({
    id: 'src-official-srm',
    type: 'Official notice',
    name: 'SRMIST Registrar Advisory',
    platform: 'srmist.edu.in',
    reliability: 'high',
    status: 'Verified source',
    url: 'https://srmist.edu.in/announcements/weather-oct5.html',
    domain: 'srmist.edu.in',
    publisher: 'SRM Institute of Science and Technology',
  });

  const fetchedContent: FetchedSourceContent = {
    url: source.url,
    sourceId: source.id,
    status: 'accessible',
    title: 'Advisory on Academic Operations',
    mainText: paragraph,
    retrievedAt: '2026-10-05T06:06:00Z',
    latencyMs: 210,
  };

  const evidence = extractEvidence(sampleClaim, source, fetchedContent);

  // Both excerpt and context are available
  assert(evidence.context !== undefined, 'Context must never be undefined for accessible text');
  // Excerpt captures the university schedule
  assert(evidence.context!.includes('primary and secondary schools'), 'Context preserves the school limitation');
  assert(evidence.context!.includes('will function normally'), 'Context preserves normal operations');

  console.log('✓ testContextPreservationPreventsDeception passed.');
}

// -------------------------------------------------------------
// Test 4: Strict Non-Fabrication on Inaccessible or Failed Sources
// -------------------------------------------------------------
function testNonFabricationOnInaccessibleAndFailed() {
  console.log('Testing: Strict Non-Fabrication on Inaccessible and Failed Sources...');

  const source = createMockSource({
    id: 'src-paywalled-99',
    type: 'News outlet',
    name: 'Subscription Journal Article',
    platform: 'paywalled-news.com',
    reliability: 'medium',
    status: 'Needs verification',
    url: 'https://paywalled-news.com/premium/chennai-storm-alert',
    domain: 'paywalled-news.com',
    publisher: 'Paywalled News Media',
  });

  // Case A: HTTP 403 Forbidden / Paywall
  const inaccessibleContent: FetchedSourceContent = {
    url: source.url,
    sourceId: source.id,
    status: 'inaccessible',
    statusCode: 403,
    inaccessibleReason: 'Inaccessible: Authentication or authorization required (HTTP 403). EchoTrace never bypasses security access controls.',
    retrievedAt: '2026-10-05T06:07:00Z',
    latencyMs: 150,
  };

  const evidenceA = extractEvidence(sampleClaim, source, inaccessibleContent);

  // CRITICAL REQUIREMENT: Do NOT fabricate content!
  assert(evidenceA.excerpt === '', 'Excerpt MUST be empty when source is inaccessible');
  assert(evidenceA.context === undefined, 'Context MUST be undefined when source is inaccessible');
  assert(evidenceA.relevanceScore === 0.0, 'Relevance score must be 0 for inaccessible content');
  assert(evidenceA.fetchStatus === 'inaccessible', 'Fetch status must be inaccessible');
  assert(evidenceA.inaccessibleReason!.includes('HTTP 403'), 'Must preserve inaccessible reason');
  assert(evidenceA.extractionMethod === 'inaccessible-source-preserved', 'Method must record preserved inaccessible source');

  // Case B: HTTP 404 / Failed fetch
  const failedContent: FetchedSourceContent = {
    url: 'https://broken-link.com/404.html',
    sourceId: 'src-broken',
    status: 'failed',
    statusCode: 404,
    inaccessibleReason: 'Resource not found on publisher server (HTTP 404).',
    retrievedAt: '2026-10-05T06:07:00Z',
    latencyMs: 90,
  };

  const brokenSource = createMockSource({
    ...source,
    id: 'src-broken',
    url: 'https://broken-link.com/404.html',
    domain: 'broken-link.com',
  });

  const evidenceB = extractEvidence(sampleClaim, brokenSource, failedContent);
  assert(evidenceB.excerpt === '', 'Excerpt must be empty for failed source');
  assert(evidenceB.fetchStatus === 'failed', 'Fetch status must be failed');
  assert(evidenceB.relevanceScore === 0.0, 'Relevance score must be 0 for failed source');

  console.log('✓ testNonFabricationOnInaccessibleAndFailed passed.');
}

// -------------------------------------------------------------
// Test 5: Primary PDF Circular Document Extraction
// -------------------------------------------------------------
function testPrimaryPdfCircularExtraction() {
  console.log('Testing: Primary Circular / PDF Document Extraction...');

  const pdfSource = createMockSource({
    id: 'src-pdf-srm',
    type: 'Official notice',
    name: 'Official Circular Ref No 2026/OCT/04',
    platform: 'srmist.edu.in',
    reliability: 'high',
    status: 'Verified source',
    url: 'https://srmist.edu.in/wp-content/uploads/2026/10/circular-operations.pdf',
    domain: 'srmist.edu.in',
    publisher: 'SRM Institute of Science and Technology',
  });

  const pdfContent: FetchedSourceContent = {
    url: pdfSource.url,
    sourceId: pdfSource.id,
    status: 'accessible',
    statusCode: 200,
    isPdf: true,
    contentType: 'application/pdf',
    mainText: '[Primary PDF Circular Document at https://srmist.edu.in/.../circular-operations.pdf]',
    retrievedAt: '2026-10-05T06:08:00Z',
    latencyMs: 180,
  };

  const evidence = extractEvidence(sampleClaim, pdfSource, pdfContent);
  assert(evidence.evidenceType === 'official', 'PDF circular on srmist.edu.in must be official');
  assert(evidence.fetchStatus === 'accessible', 'PDF must be marked accessible');
  assert(evidence.extractionMethod === 'primary-pdf-circular-descriptor', 'Method must be primary-pdf-circular-descriptor');
  assert(evidence.relevanceScore >= 0.8, 'Primary PDF circular should have high relevance');

  console.log('✓ testPrimaryPdfCircularExtraction passed.');
}

// -------------------------------------------------------------
// Test 6: Passage Relevance Scoring Function
// -------------------------------------------------------------
function testPassageRelevanceScoring() {
  console.log('Testing: Passage Relevance Scoring Function...');

  // High relevance passage mentioning entities, action, and catalyst
  const relevantPassage =
    'SRM Institute at Kattankulathur will function normally despite heavy rain, registrar confirms.';
  const evalHigh = scorePassageRelevance(relevantPassage, sampleClaim);

  assert(evalHigh.score >= 0.6, `Expected score >= 0.6, got ${evalHigh.score}`);
  assert(evalHigh.matchedKeywords.length >= 3, `Expected at least 3 matched keywords, got ${evalHigh.matchedKeywords.length}`);

  // Low relevance passage discussing unrelated topics
  const irrelevantPassage =
    'The cricket team won the annual inter-college championship match in Mumbai yesterday afternoon.';
  const evalLow = scorePassageRelevance(irrelevantPassage, sampleClaim);

  assert(evalLow.score <= 0.25, `Expected score <= 0.25, got ${evalLow.score}`);
  assert(evalHigh.score > evalLow.score, 'Relevant passage must score higher than irrelevant passage');

  console.log('✓ testPassageRelevanceScoring passed.');
}

// -------------------------------------------------------------
// Test 7: Batch Evidence Extraction across Diverse Sources
// -------------------------------------------------------------
function testBatchEvidenceExtraction() {
  console.log('Testing: Batch Evidence Extraction across Diverse Sources...');

  const sources: NormalizedSource[] = [
    createMockSource({
      id: 'src-1',
      type: 'Official notice',
      name: 'SRM Circular',
      platform: 'srmist.edu.in',
      reliability: 'high',
      status: 'Verified source',
      url: 'https://srmist.edu.in/notice-1',
      domain: 'srmist.edu.in',
    }),
    createMockSource({
      id: 'src-2',
      type: 'News outlet',
      name: 'The Hindu',
      platform: 'The Hindu',
      reliability: 'high',
      status: 'Needs verification',
      url: 'https://thehindu.com/rain-1',
      domain: 'thehindu.com',
    }),
    createMockSource({
      id: 'src-3',
      type: 'News outlet',
      name: 'Paywalled News',
      platform: 'paywall.com',
      reliability: 'medium',
      status: 'Needs verification',
      url: 'https://paywall.com/article',
      domain: 'paywall.com',
    }),
    createMockSource({
      id: 'src-4',
      type: 'Unknown',
      name: 'Broken Link',
      platform: 'dead.com',
      reliability: 'unverified',
      status: 'Needs verification',
      url: 'https://dead.com/404',
      domain: 'dead.com',
    }),
  ];

  const fetchedMap = new Map<string, FetchedSourceContent>();

  fetchedMap.set('src-1', {
    url: 'https://srmist.edu.in/notice-1',
    sourceId: 'src-1',
    status: 'accessible',
    mainText: 'SRM Institute Kattankulathur confirms regular classes will be held tomorrow.',
    retrievedAt: '2026-10-05T06:10:00Z',
    latencyMs: 120,
  });

  fetchedMap.set('src-2', {
    url: 'https://thehindu.com/rain-1',
    sourceId: 'src-2',
    status: 'partially_accessible',
    description: 'Schools in Chennai closed due to rain; higher education institutions open.',
    retrievedAt: '2026-10-05T06:10:00Z',
    latencyMs: 220,
  });

  fetchedMap.set('src-3', {
    url: 'https://paywall.com/article',
    sourceId: 'src-3',
    status: 'inaccessible',
    statusCode: 403,
    inaccessibleReason: 'Inaccessible: Paywall required.',
    retrievedAt: '2026-10-05T06:10:00Z',
    latencyMs: 80,
  });

  fetchedMap.set('src-4', {
    url: 'https://dead.com/404',
    sourceId: 'src-4',
    status: 'failed',
    statusCode: 404,
    inaccessibleReason: 'Page not found.',
    retrievedAt: '2026-10-05T06:10:00Z',
    latencyMs: 60,
  });

  const batchResult = extractAllEvidence(sampleClaim, sources, fetchedMap);

  assert(batchResult.totalSourcesProcessed === 4, 'Processed 4 sources');
  assert(batchResult.accessibleCount === 1, '1 accessible');
  assert(batchResult.partiallyAccessibleCount === 1, '1 partially accessible');
  assert(batchResult.inaccessibleCount === 1, '1 inaccessible');
  assert(batchResult.failedCount === 1, '1 failed');
  assert(batchResult.evidenceList.length === 4, 'Must produce 4 Evidence records');

  // Accessible evidence should rank first in the sorted evidence list
  assert(batchResult.evidenceList[0].fetchStatus === 'accessible', 'Accessible item should be first');

  console.log('✓ testBatchEvidenceExtraction passed.');
}

// -------------------------------------------------------------
// Run All Phase 5 Tests
// -------------------------------------------------------------
function runAllPhase5Tests() {
  console.log('====================================================');
  console.log('RUNNING ECHO TRACE PHASE 5 EVIDENCE EXTRACTION TESTS');
  console.log('====================================================');

  testEvidenceModelAndTypeMapping();
  testAccessibleExtractionWithContext();
  testContextPreservationPreventsDeception();
  testNonFabricationOnInaccessibleAndFailed();
  testPrimaryPdfCircularExtraction();
  testPassageRelevanceScoring();
  testBatchEvidenceExtraction();

  console.log('====================================================');
  console.log('ALL PHASE 5 EVIDENCE EXTRACTION TESTS PASSED (100% OK)');
  console.log('====================================================');
}

runAllPhase5Tests();
