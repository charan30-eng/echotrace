/**
 * EchoTrace Phase 4: Source Collection & Normalization Test Suite
 * 
 * Verifies:
 * 1. Conversion of raw SearchResult into NormalizedSource compatible with EchoTrace's Source type.
 * 2. Transparent reliability assessment (assessSourceReliability).
 * 3. Anti-Spoofing Defense: Does NOT assign 'high' simply because a title contains 'official'.
 * 4. Identification of Publisher and Domain without inventing fake names.
 * 5. Strict Non-Invention Rule: Null/undefined for missing author or publication dates.
 * 6. Deduplication and provenance preservation.
 * 7. Forward-compatible contentFetchStatus for Phase 5.
 */

import {
  collectSources,
  normalizeSource,
  deduplicateSources,
  assessSourceReliability,
  identifySourceType,
  identifyPublisher,
} from './sourceCollector.ts';
import { SearchResult } from '../types/evidenceSearch.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Full Normalization and Compatibility with Source Type
// -------------------------------------------------------------
function testNormalizationCompatibility() {
  console.log('Testing: SearchResult to NormalizedSource conversion...');

  const rawResult: SearchResult = {
    id: 'tavily-12345',
    title: 'SRM Institute Circular: Academic Operations Oct 5',
    url: 'https://www.srmist.edu.in/announcements/circular-oct5.html?utm_source=feed',
    snippet: 'The Registrar confirms that examinations will proceed without disruption.',
    publisher: 'srmist.edu.in',
    publishedAt: '2026-10-04T10:00:00Z',
    sourceType: 'official',
    query: 'SRM official notice college closed',
    retrievedAt: '2026-10-05T06:00:00Z',
    priorityRank: 1,
  };

  const normalized = normalizeSource(rawResult);

  // Compatible Source fields
  assert(Boolean(normalized.id), 'Must have an id');
  assert(normalized.type === 'Official notice', `Expected 'Official notice', got '${normalized.type}'`);
  assert(normalized.reliability === 'high', `Expected 'high' reliability, got '${normalized.reliability}'`);
  assert(normalized.status === 'Verified source', `Expected 'Verified source', got '${normalized.status}'`);
  assert(normalized.platform.includes('SRM'), `Expected SRM in platform, got '${normalized.platform}'`);
  assert(Boolean(normalized.notes), 'Must have explanatory notes');

  // Phase 4 Extended fields
  assert(normalized.domain === 'srmist.edu.in', `Domain must be srmist.edu.in, got ${normalized.domain}`);
  assert(normalized.url === 'https://srmist.edu.in/announcements/circular-oct5.html', 'URL must be canonical and normalized');
  assert(normalized.publishedAt === '2026-10-04T10:00:00Z', 'Must preserve authentic publishedAt date');
  assert(normalized.retrievalTimestamp === '2026-10-05T06:00:00Z', 'Must preserve retrievalTimestamp');
  assert(normalized.provenance.originalQuery === 'SRM official notice college closed', 'Must preserve original query');
  assert(normalized.contentFetchStatus === 'pending', 'Must initialize Phase 5 fetch hook as pending');

  console.log('✓ testNormalizationCompatibility passed.');
}

// -------------------------------------------------------------
// Test 2: Anti-Spoofing Defense (CRITICAL REQUIREMENT)
// A page claiming "official" in title on Reddit/Forum MUST NOT get 'high' reliability
// -------------------------------------------------------------
function testAntiSpoofingDefense() {
  console.log('Testing: Anti-Spoofing Defense on Unverified Domains...');

  // Case A: Reddit post claiming to be "OFFICIAL CIRCULAR"
  const spoofedForumPost: SearchResult = {
    id: 'forum-999',
    title: 'OFFICIAL CIRCULAR: SRM College Closed Tomorrow by Registrar Office Order',
    url: 'https://www.reddit.com/r/srmist/comments/88912/official_circular_college_closed',
    snippet: 'Forwarding the official notice signed by principal, holiday declared for all departments.',
    sourceType: 'anonymous_social',
    query: 'SRM official notice college closed',
    retrievedAt: new Date().toISOString(),
  };

  const normalizedA = normalizeSource(spoofedForumPost);

  assert(normalizedA.type === 'Forum', `Expected Forum, got ${normalizedA.type}`);
  assert(
    normalizedA.reliability === 'low',
    `CRITICAL FAILURE: Reddit post with 'official' in title must be 'low', got '${normalizedA.reliability}'`
  );
  assert(
    normalizedA.reliabilityExplanation.includes('unverified') || normalizedA.reliabilityExplanation.includes('open forum') || normalizedA.reliabilityExplanation.includes('lacking institutional authority'),
    `Explanation must explain discrepancy: ${normalizedA.reliabilityExplanation}`
  );

  // Case B: Blogspot claiming "Official Government Gazetted Holiday"
  const spoofedBlog: SearchResult = {
    id: 'blog-444',
    title: 'Tamil Nadu Government Official Holiday Declaration Order',
    url: 'https://campusrumors2026.blogspot.com/2026/10/official-holiday-order.html',
    snippet: 'District collector has officially confirmed school college closure.',
    sourceType: 'unknown',
    query: 'Tamil Nadu heavy rain official holiday',
    retrievedAt: new Date().toISOString(),
  };

  const normalizedB = normalizeSource(spoofedBlog);
  assert(normalizedB.type === 'Blog', `Expected Blog, got ${normalizedB.type}`);
  assert(
    normalizedB.reliability === 'low',
    `CRITICAL FAILURE: Blogspot with 'official' in title must be 'low', got '${normalizedB.reliability}'`
  );

  console.log('✓ testAntiSpoofingDefense passed.');
}

// -------------------------------------------------------------
// Test 3: Transparent Reliability Assessment across Diverse Tiers
// -------------------------------------------------------------
function testTransparentReliabilityTiers() {
  console.log('Testing: Transparent Reliability Tiers across Source Types...');

  // 1. Government Source (.gov.in)
  const govAssessment = assessSourceReliability({
    url: 'https://tnsdma.tn.gov.in/weather-warning.html',
    domain: 'tnsdma.tn.gov.in',
    type: 'Government source',
  });
  assert(govAssessment.reliability === 'high', 'Government source must be high');
  assert(govAssessment.explanation.includes('government registry domain'), 'Explanation must mention government domain');

  // 2. Reputable News Outlet (The Hindu)
  const newsAssessment = assessSourceReliability({
    url: 'https://www.thehindu.com/news/national/tamil-nadu/rain-update.html',
    domain: 'thehindu.com',
    type: 'News outlet',
  });
  assert(newsAssessment.reliability === 'high', 'The Hindu must be high reliability');
  assert(newsAssessment.explanation.includes('editorial verification standards'), 'Explanation must mention editorial standards');

  // 3. Official Social Account (@SRM_Univ verified handle)
  const socialAssessment = assessSourceReliability({
    url: 'https://twitter.com/SRM_Univ/status/1710000000',
    domain: 'twitter.com',
    type: 'Official social account',
  });
  assert(socialAssessment.reliability === 'medium', 'Official social account should be medium (secondary to signed circular)');
  assert(socialAssessment.explanation.includes('secondary to signed circulars'), 'Must explain why medium');

  // 4. Unknown Unclassified Website
  const unknownAssessment = assessSourceReliability({
    url: 'https://random-unverified-portal-99.xyz/updates',
    domain: 'random-unverified-portal-99.xyz',
    type: 'Unknown',
  });
  assert(unknownAssessment.reliability === 'unverified', 'Unknown domain must be unverified');

  console.log('✓ testTransparentReliabilityTiers passed.');
}

// -------------------------------------------------------------
// Test 4: Strict Non-Invention of Missing Metadata
// -------------------------------------------------------------
function testNonInventionOfMissingMetadata() {
  console.log('Testing: Strict Non-Invention of Missing Metadata...');

  const bareResult: SearchResult = {
    id: 'bare-1',
    title: 'Rain advisory statement',
    url: 'https://weather-chennai-bulletin.org/advisory',
    query: 'chennai weather',
    retrievedAt: new Date().toISOString(),
    sourceType: 'unknown',
  };

  const normalized = normalizeSource(bareResult);

  // Must NOT invent author
  assert(normalized.authorHandle === undefined, 'Must not invent author handle');
  // Must NOT invent publishedAt date
  assert(normalized.publishedAt === null, 'Must explicitly set publishedAt to null when not in metadata');
  // Publisher falls back to clean domain, not a fabricated company name
  assert(normalized.publisher === 'weather-chennai-bulletin.org', 'Must use domain as publisher when company is unknown');

  console.log('✓ testNonInventionOfMissingMetadata passed.');
}

// -------------------------------------------------------------
// Test 5: Source Deduplication & Provenance Query Merging
// -------------------------------------------------------------
function testDeduplicationAndProvenanceMerging() {
  console.log('Testing: Source Deduplication & Provenance Merging...');

  const results: SearchResult[] = [
    {
      id: 'res-1',
      title: 'SRM University Notice',
      url: 'https://www.srmist.edu.in/notice/?utm_source=twitter',
      snippet: 'Short snippet',
      query: 'SRM College closed tomorrow',
      retrievedAt: '2026-10-05T08:00:00Z',
      sourceType: 'official',
    },
    {
      id: 'res-2',
      title: 'SRM University Official Administrative Notice',
      url: 'https://srmist.edu.in/notice',
      snippet: 'Longer comprehensive snippet detailing registrar decision to continue regular classes.',
      query: 'SRM official notice college closed',
      retrievedAt: '2026-10-05T08:01:00Z',
      sourceType: 'official',
    },
    {
      id: 'res-3',
      title: 'The Hindu: Chennai Weather Alert',
      url: 'https://thehindu.com/news/chennai-rain.html',
      snippet: 'Heavy rain predicted in coastal districts.',
      query: 'Chennai heavy rain warning',
      retrievedAt: '2026-10-05T08:02:00Z',
      sourceType: 'news',
    },
  ];

  const collection = collectSources(results);

  assert(collection.totalReceived === 3, 'Received 3 results');
  assert(collection.totalUnique === 2, `Expected 2 unique sources after deduping, got ${collection.totalUnique}`);
  assert(collection.sources.length === 2, 'Sources array length must match totalUnique');

  const srmSource = collection.sources.find((s) => s.domain === 'srmist.edu.in');
  assert(srmSource !== undefined, 'Must find SRM source');
  assert(Boolean(srmSource!.notes?.includes('Also matched')), 'Notes must preserve supplementary matched query from deduplication');

  console.log('✓ testDeduplicationAndProvenanceMerging passed.');
}

// -------------------------------------------------------------
// Run All Tests
// -------------------------------------------------------------
function runAllPhase4Tests() {
  console.log('====================================================');
  console.log('RUNNING ECHO TRACE PHASE 4 SOURCE NORMALIZATION TESTS');
  console.log('====================================================');

  testNormalizationCompatibility();
  testAntiSpoofingDefense();
  testTransparentReliabilityTiers();
  testNonInventionOfMissingMetadata();
  testDeduplicationAndProvenanceMerging();

  console.log('====================================================');
  console.log('ALL PHASE 4 SOURCE NORMALIZATION TESTS PASSED (100% OK)');
  console.log('====================================================');
}

runAllPhase4Tests();
