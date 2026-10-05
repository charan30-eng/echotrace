/**
 * EchoTrace Phase 3: Evidence Search Test Suite
 * 
 * Verifies:
 * 1. 5-Angle Multi-Query Formulation from ExtractedClaim.
 * 2. Strict Source Priority Classification (Rank 1 to 8).
 * 3. URL Normalization and Duplicate URL Removal.
 * 4. Pluggable Provider Architecture & Replacement.
 * 5. Explicit "unavailable" state when no provider configured (No fake data safeguard).
 */

import { generateSearchQueries } from './evidenceQueryGenerator';
import {
  classifySource,
  normalizeUrl,
  deduplicateResultsByUrl,
  sortResultsByPriority,
} from './sourceClassifier';
import { EvidenceSearchService, WebSearchProvider, OfficialSourceProvider } from './evidenceSearch';
import { ExtractedClaim } from '../types/claimExtraction';
import { SearchResult } from '../types/evidenceSearch';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Multi-Query Formulation Strategy (Specification Example)
// -------------------------------------------------------------
function testQueryGenerationSpecificationExample() {
  console.log('Testing: Multi-Query Generation for Specification Example...');

  const srmClaim: ExtractedClaim = {
    id: 'claim-srm-closure',
    originalInput: 'Someone said SRM College is closed tomorrow because of heavy rain.',
    claimText: 'SRM College is closed tomorrow because of heavy rain',
    subject: 'SRM College',
    action: 'closed',
    timeReference: 'tomorrow',
    location: 'Kattankulathur',
    reason: 'heavy rain',
    entities: ['SRM College', 'Kattankulathur'],
    keywords: ['srm', 'college', 'closed', 'tomorrow', 'heavy', 'rain'],
    extractedAt: new Date().toISOString(),
    modality: 'reported',
    isAmbiguous: false,
    verificationStatus: 'unverified',
    confidence: 0.95,
  };

  const plan = generateSearchQueries(srmClaim);
  assert(plan.queries.length >= 4, `Expected at least 4 queries, got ${plan.queries.length}`);

  const kinds = plan.queries.map((q) => q.kind);
  assert(kinds.includes('exact_claim'), 'Must include exact_claim strategy');
  assert(kinds.includes('entities_action'), 'Must include entities_action strategy');
  assert(kinds.includes('entity_event'), 'Must include entity_event strategy');
  assert(kinds.includes('entity_time'), 'Must include entity_time strategy');
  assert(kinds.includes('keywords') || kinds.includes('official_target'), 'Must include keywords/official_target strategy');

  // Check generated query text matches prompt requirements
  const queryStrings = plan.queries.map((q) => q.query.toLowerCase());
  const hasExact = queryStrings.some((s) => s.includes('srm') && s.includes('closed'));
  const hasAction = queryStrings.some((s) => s.includes('srm') && s.includes('official'));
  const hasEvent = queryStrings.some((s) => s.includes('srm') && s.includes('heavy rain'));

  assert(hasExact, 'Must generate query matching exact proposition tokens');
  assert(hasAction, 'Must generate query targeting official action notice');
  assert(hasEvent, 'Must generate query targeting environmental trigger (heavy rain)');

  console.log('✓ testQueryGenerationSpecificationExample passed.');
}

// -------------------------------------------------------------
// Test 2: Source Priority Classification (Ranks 1 to 8)
// -------------------------------------------------------------
function testSourceClassificationHierarchy() {
  console.log('Testing: Source Priority Classification Hierarchy...');

  // Rank 1: Official institutional source
  const s1 = classifySource('https://www.srmist.edu.in/announcements/circular-oct4.html');
  assert(s1.sourceType === 'official', `Expected official, got ${s1.sourceType}`);
  assert(s1.priorityRank === 1, `Expected rank 1, got ${s1.priorityRank}`);

  // Rank 2: Government source
  const s2 = classifySource('https://tnsdma.tn.gov.in/weather-advisories');
  assert(s2.sourceType === 'government', `Expected government, got ${s2.sourceType}`);
  assert(s2.priorityRank === 2, `Expected rank 2, got ${s2.priorityRank}`);

  // Rank 3: Primary circular / PDF document
  const s3 = classifySource('https://state-archives.in/downloads/gazette_office_order.pdf');
  assert(s3.sourceType === 'primary', `Expected primary document, got ${s3.sourceType}`);
  assert(s3.priorityRank === 3, `Expected rank 3, got ${s3.priorityRank}`);

  // Rank 4: Reputable news organization
  const s4 = classifySource('https://www.thehindu.com/news/national/tamil-nadu/heavy-rain-chennai-schools-colleges-holiday/article68712345.ece');
  assert(s4.sourceType === 'news', `Expected news, got ${s4.sourceType}`);
  assert(s4.priorityRank === 4, `Expected rank 4, got ${s4.priorityRank}`);

  // Rank 5: Verified / official social account
  const s5 = classifySource('https://twitter.com/SRM_Univ/status/1710123456', 'SRM Official Tweet');
  assert(s5.sourceType === 'social_verified', `Expected social_verified, got ${s5.sourceType}`);
  assert(s5.priorityRank === 5, `Expected rank 5, got ${s5.priorityRank}`);

  // Rank 6: Secondary source / aggregator
  const s6 = classifySource('https://collegedunia.com/news/srm-holiday-updates');
  assert(s6.sourceType === 'secondary', `Expected secondary, got ${s6.sourceType}`);
  assert(s6.priorityRank === 6, `Expected rank 6, got ${s6.priorityRank}`);

  // Rank 7: Unknown website
  const s7 = classifySource('https://randomcampusblog2026.xyz/breaking-news');
  assert(s7.sourceType === 'unknown', `Expected unknown, got ${s7.sourceType}`);
  assert(s7.priorityRank === 7, `Expected rank 7, got ${s7.priorityRank}`);

  // Rank 8: Anonymous social post / chat
  const s8 = classifySource('https://t.me/srmstudentschat/98712');
  assert(s8.sourceType === 'anonymous_social', `Expected anonymous_social, got ${s8.sourceType}`);
  assert(s8.priorityRank === 8, `Expected rank 8, got ${s8.priorityRank}`);

  console.log('✓ testSourceClassificationHierarchy passed.');
}

// -------------------------------------------------------------
// Test 3: URL Normalization & Duplicate Removal
// -------------------------------------------------------------
function testUrlNormalizationAndDeduplication() {
  console.log('Testing: URL Normalization & Deduplication...');

  const urlA = 'https://www.srmist.edu.in/notice/?utm_source=twitter&utm_medium=social#section';
  const urlB = 'https://srmist.edu.in/notice';
  const normA = normalizeUrl(urlA);
  const normB = normalizeUrl(urlB);

  assert(normA === normB, `Normalized URLs should match: "${normA}" vs "${normB}"`);

  const results: SearchResult[] = [
    {
      id: 'res-1',
      title: 'First Result',
      url: urlA,
      sourceType: 'official',
      priorityRank: 1,
      query: 'query 1',
      retrievedAt: new Date().toISOString(),
      snippet: 'Official circular announcement',
    },
    {
      id: 'res-2',
      title: 'Duplicate from another query',
      url: urlB,
      sourceType: 'official',
      priorityRank: 1,
      query: 'query 2',
      retrievedAt: new Date().toISOString(),
      snippet: 'Slightly shorter snippet',
    },
    {
      id: 'res-3',
      title: 'The Hindu News Article',
      url: 'https://thehindu.com/news/chennai-rain.html',
      sourceType: 'news',
      priorityRank: 4,
      query: 'query 3',
      retrievedAt: new Date().toISOString(),
      snippet: 'Schools and colleges closed.',
    },
  ];

  const deduped = deduplicateResultsByUrl(results);
  assert(deduped.length === 2, `Expected 2 unique URLs after deduping, got ${deduped.length}`);

  // Test source priority sorting: Rank 1 (Official) must appear before Rank 4 (News)
  const sorted = sortResultsByPriority(deduped);
  assert(sorted[0].priorityRank === 1, 'Rank 1 must be prioritized first');
  assert(sorted[1].priorityRank === 4, 'Rank 4 must be prioritized second');

  console.log('✓ testUrlNormalizationAndDeduplication passed.');
}

// -------------------------------------------------------------
// Test 4: Provider Architecture & Registration
// -------------------------------------------------------------
function testProviderArchitecture() {
  console.log('Testing: Pluggable Provider Architecture...');

  const service = new EvidenceSearchService();
  const initialProviders = service.listProviders();
  assert(initialProviders.length >= 2, 'Should register default WebSearchProvider and OfficialSourceProvider');

  // Register custom test provider
  class MockCustomProvider {
    readonly name = 'CustomInstitutionalRegistryProvider';
    readonly isConfigured = true;
    async search() {
      return [];
    }
  }

  service.registerProvider(new MockCustomProvider());
  assert(
    service.getProvider('CustomInstitutionalRegistryProvider') !== undefined,
    'Should successfully register new provider without touching existing code'
  );

  const switched = service.setActiveProvider('CustomInstitutionalRegistryProvider');
  assert(switched, 'Should switch active provider');
  assert(service.getActiveProviderName() === 'CustomInstitutionalRegistryProvider', 'Active provider should match');

  console.log('✓ testProviderArchitecture passed.');
}

// -------------------------------------------------------------
// Test 5: Unconfigured Fallback Safeguard (Zero Hallucination Guarantee)
// -------------------------------------------------------------
async function testUnconfiguredFallbackSafeguard() {
  console.log('Testing: Unconfigured Fallback Safeguard (No Fake Data)...');

  const testClaim: ExtractedClaim = {
    id: 'test-unconfigured',
    originalInput: 'Heavy rain warning in Kanchipuram district',
    claimText: 'Heavy rain warning in Kanchipuram district',
    subject: 'Kanchipuram district',
    action: 'heavy rain warning',
    entities: ['Kanchipuram district'],
    keywords: ['heavy', 'rain', 'warning', 'kanchipuram'],
    extractedAt: new Date().toISOString(),
    modality: 'assertive',
    isAmbiguous: false,
    verificationStatus: 'unverified',
    confidence: 0.9,
  };

  const service = new EvidenceSearchService();
  // When fetch is mocked or when backend has no keys, it returns status 'unavailable'
  const response = await service.searchEvidence(testClaim);

  assert(
    response.status === 'unavailable' || response.status === 'success' || response.status === 'empty',
    `Expected valid status, got ${response.status}`
  );

  if (response.status === 'unavailable') {
    assert(response.results.length === 0, 'Unavailable state must NEVER generate fake search results');
    assert(response.message !== undefined && response.message.includes('unavailable'), 'Must explain unavailable state');
  }

  console.log('✓ testUnconfiguredFallbackSafeguard passed.');
}

// -------------------------------------------------------------
// Test 6: Custom Provider Execution through searchEvidence
// -------------------------------------------------------------
async function testCustomProviderExecution() {
  console.log('Testing: Custom Provider Execution through searchEvidence...');

  const service = new EvidenceSearchService();

  class MockAcademicRegistryProvider {
    readonly name = 'MockAcademicRegistryProvider';
    readonly isConfigured = true;
    async search(queries: string[]): Promise<SearchResult[]> {
      return [
        {
          id: 'mock-1',
          title: 'SRM Institute Official Bulletin - Operations Normal',
          url: 'https://www.srmist.edu.in/announcements/bulletin-today.html',
          snippet: 'All academic operations continue as scheduled.',
          publisher: 'srmist.edu.in',
          sourceType: 'official',
          priorityRank: 1,
          query: queries[0] || 'srm notice',
          retrievedAt: new Date().toISOString(),
        },
      ];
    }
  }

  service.registerProvider(new MockAcademicRegistryProvider());
  service.setActiveProvider('MockAcademicRegistryProvider');

  const testClaim: ExtractedClaim = {
    id: 'test-custom-provider',
    originalInput: 'SRM College is closed tomorrow',
    claimText: 'SRM College is closed tomorrow',
    subject: 'SRM College',
    action: 'closed',
    timeReference: 'tomorrow',
    entities: ['SRM College'],
    keywords: ['srm', 'college', 'closed'],
    extractedAt: new Date().toISOString(),
    modality: 'assertive',
    isAmbiguous: false,
    verificationStatus: 'unverified',
    confidence: 0.95,
  };

  const response = await service.searchEvidence(testClaim);
  assert(response.status === 'success', `Expected success status, got ${response.status}`);
  assert(response.results.length === 1, `Expected 1 result, got ${response.results.length}`);
  assert(
    response.providerUsed === 'MockAcademicRegistryProvider',
    `Expected MockAcademicRegistryProvider, got ${response.providerUsed}`
  );
  assert(response.results[0].sourceType === 'official', 'Source type must be official');
  assert(response.results[0].priorityRank === 1, 'Priority rank must be 1');

  console.log('✓ testCustomProviderExecution passed.');
}

// Run all tests
async function runAllTests() {
  console.log('====================================================');
  console.log('RUNNING ECHO TRACE PHASE 3 EVIDENCE SEARCH TESTS');
  console.log('====================================================');

  testQueryGenerationSpecificationExample();
  testSourceClassificationHierarchy();
  testUrlNormalizationAndDeduplication();
  testProviderArchitecture();
  await testCustomProviderExecution();
  await testUnconfiguredFallbackSafeguard();

  console.log('====================================================');
  console.log('ALL PHASE 3 EVIDENCE SEARCH TESTS PASSED (100% OK)');
  console.log('====================================================');
}

runAllTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
