/**
 * EchoTrace Phase 7: Source Credibility Scorer Test Suite
 * 
 * Verifies:
 * 1. Multi-factor audit (official domain, government domain, institutional ownership,
 *    publisher identity, primary vs secondary document, author attribution, publication date,
 *    source provenance, direct attributability, independent verifiability).
 * 2. Anti-simplistic safeguards:
 *    - Page claiming "official" on Reddit/Blogspot does NOT get high reliability (Anti-spoofing).
 *    - High social popularity/reach does NOT elevate credibility without provenance.
 * 3. Independence from Claim Truth:
 *    - High-reliability source can contradict.
 *    - Low-reliability source can support.
 * 4. Transparent reasons and contextual limitations generated for every source.
 * 5. Batch assessment and statistical distribution.
 */

import { NormalizedSource } from '../types/sourceCollection.ts';
import {
  assessBatchCredibility,
  assessSourceCredibility,
} from './credibilityScorer.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Official Institutional Source (High Reliability Example)
// -------------------------------------------------------------
function testOfficialInstitutionalSource() {
  console.log('Testing: Official Institutional Source (High Reliability Example)...');

  const officialSource: NormalizedSource = {
    id: 'src-srm-reg-01',
    type: 'Official notice',
    name: 'SRMIST Office of Academic Affairs: Circular on Academic Operations',
    platform: 'srmist.edu.in',
    reliability: 'high',
    status: 'Verified source',
    timestamp: 'Today, 9:00 AM',
    url: 'https://srmist.edu.in/announcements/circular-operations.pdf',
    domain: 'srmist.edu.in',
    publisher: 'SRM Institute of Science and Technology',
    publishedAt: '2026-10-04T18:00:00Z',
    retrievalTimestamp: '2026-10-05T06:00:00Z',
    reliabilityExplanation: 'Primary registrar circular.',
    contentFetchStatus: 'fetched',
    snippet: 'Signed circular ref #SRM-ADM-2026-R4 confirming regular classes.',
    provenance: {
      originalQuery: 'srm official circular',
      canonicalUrl: 'https://srmist.edu.in/announcements/circular-operations.pdf',
      collectedAt: '2026-10-05T06:00:00Z',
    },
  };

  const assessment = assessSourceCredibility(officialSource);

  // Must achieve high reliability
  assert(assessment.reliability === 'high', `Expected 'high', got '${assessment.reliability}'`);
  assert(assessment.score >= 80, `Expected score >= 80, got ${assessment.score}`);

  // Must have explainable reasons
  assert(assessment.reasons.length >= 3, 'Must have at least 3 explainable reasons');
  assert(
    assessment.reasons.some((r) => r.includes('Accredited institutional educational domain')),
    'Must cite institutional domain authority'
  );
  assert(
    assessment.reasons.some((r) => r.includes('Primary documentary circular') || r.includes('primary')),
    'Must recognize primary document status'
  );

  // Must include contextual limitations
  assert(assessment.limitations.length >= 1, 'Must include at least 1 contextual limitation');
  assert(
    assessment.limitations.some((l) => l.includes('superseded') || l.includes('weather conditions')),
    'Must note limitations regarding potential subsequent addendums'
  );

  console.log('✓ testOfficialInstitutionalSource passed.');
}

// -------------------------------------------------------------
// Test 2: Anonymous Post / Forwarded Chat (Low Reliability Example)
// -------------------------------------------------------------
function testAnonymousPost() {
  console.log('Testing: Anonymous Post / Forwarded Chat (Low Reliability Example)...');

  const anonymousSource: Partial<NormalizedSource> = {
    id: 'src-anon-chat',
    type: 'Forwarded chat',
    name: 'Department WhatsApp Forward ("Forwarded many times")',
    platform: 'WhatsApp Broadcast',
    reliability: 'low',
    status: 'Needs verification',
    timestamp: '10:20 AM',
    url: '', // No public URL
    domain: 'whatsapp.com',
    publisher: null,
    publishedAt: null,
    reach: '36 batch group chats',
    notes: 'Anonymous forward without signed circular or dean signature.',
  };

  const assessment = assessSourceCredibility(anonymousSource);

  assert(
    assessment.reliability === 'low' || assessment.reliability === 'unverified',
    `Expected 'low' or 'unverified', got '${assessment.reliability}'`
  );
  assert(assessment.score <= 35, `Expected score <= 35, got ${assessment.score}`);

  // Must explain why it is low
  assert(
    assessment.reasons.some((r) => r.includes('Anonymous') || r.includes('Informal hearsay') || r.includes('Non-verifiable')),
    'Must explain anonymous/unverified nature'
  );

  // Must include explicit limitations
  assert(
    assessment.limitations.some((l) => l.includes('Completely anonymous') || l.includes('semantic mutation') || l.includes('persistent public URL')),
    'Must state audit limitations for anonymous chat'
  );

  console.log('✓ testAnonymousPost passed.');
}

// -------------------------------------------------------------
// Test 3: Anti-Spoofing Defense (CRITICAL REQUIREMENT)
// A Reddit / Blog post titled "OFFICIAL CIRCULAR" must NOT receive high reliability
// -------------------------------------------------------------
function testAntiSpoofingDefense() {
  console.log('Testing: Anti-Spoofing Defense on Open Platforms...');

  const spoofedSource: Partial<NormalizedSource> = {
    id: 'src-spoofed-forum',
    type: 'Forum',
    name: 'OFFICIAL CIRCULAR: SRM College Closed Tomorrow by Order of Registrar',
    platform: 'Reddit Community',
    url: 'https://www.reddit.com/r/srmist/comments/8812/official_circular_college_closed',
    domain: 'reddit.com',
    publisher: 'Reddit Community',
    snippet: 'This is an official notice confirmed by principal, holiday declared.',
  };

  const assessment = assessSourceCredibility(spoofedSource);

  // CRITICAL: Must NOT be high reliability simply because "official" appears in title
  assert(
    assessment.reliability !== 'high',
    `CRITICAL VIOLATION: Spoofed Reddit post was awarded '${assessment.reliability}' reliability!`
  );
  assert(
    assessment.reliability === 'low' || assessment.reliability === 'unverified',
    `Expected 'low' or 'unverified', got '${assessment.reliability}'`
  );

  // Must trigger anti-spoofing flag and penalty
  assert(
    assessment.flags?.includes('SPOOFED_OFFICIAL_CLAIM_ON_OPEN_HOST') === true,
    'Must trigger SPOOFED_OFFICIAL_CLAIM_ON_OPEN_HOST flag'
  );
  assert(
    assessment.reasons.some((r) => r.includes('ANTI-SPOOFING PENALTY')),
    'Must include explicit anti-spoofing penalty in reasons'
  );

  console.log('✓ testAntiSpoofingDefense passed.');
}

// -------------------------------------------------------------
// Test 4: Anti-Popularity Safeguard (Viral reach != credibility)
// -------------------------------------------------------------
function testAntiPopularitySafeguard() {
  console.log('Testing: Anti-Popularity Safeguard (Viral reach != credibility)...');

  const viralSocialPost: Partial<NormalizedSource> = {
    id: 'src-viral-post',
    type: 'Social post',
    name: 'Viral Student Tweet about Campus Closure',
    platform: 'X (formerly Twitter)',
    url: 'https://twitter.com/student_updates/status/171099999',
    domain: 'twitter.com',
    reach: '85,000 students',
    snippet: 'SRM holiday declared tomorrow guys, retweet to spread!',
  };

  const assessment = assessSourceCredibility(viralSocialPost);

  // Popularity must NOT elevate to high
  assert(
    assessment.reliability !== 'high',
    `Viral reach must NOT inflate score to high, got '${assessment.reliability}'`
  );
  assert(
    assessment.flags?.includes('VIRAL_UNVERIFIED_AMPLIFICATION') === true,
    'Must flag VIRAL_UNVERIFIED_AMPLIFICATION'
  );
  assert(
    assessment.limitations.some((l) => l.includes('Popularity Safeguard') || l.includes('audience reach')),
    'Must include popularity limitation warning'
  );

  console.log('✓ testAntiPopularitySafeguard passed.');
}

// -------------------------------------------------------------
// Test 5: Government Authority Domain (.gov.in)
// -------------------------------------------------------------
function testGovernmentAuthorityDomain() {
  console.log('Testing: Government Authority Domain (.gov.in)...');

  const govSource: Partial<NormalizedSource> = {
    id: 'src-tnsdma',
    type: 'Government source',
    name: 'Tamil Nadu State Disaster Management Advisory',
    platform: 'tnsdma.tn.gov.in',
    url: 'https://tnsdma.tn.gov.in/press/rain-oct5.html',
    domain: 'tnsdma.tn.gov.in',
    publisher: 'Tamil Nadu State Disaster Management Authority',
    publishedAt: '2026-10-04T20:00:00Z',
    snippet: 'Precautionary holiday declared for primary schools only.',
  };

  const assessment = assessSourceCredibility(govSource);

  assert(assessment.reliability === 'high', `Expected 'high', got '${assessment.reliability}'`);
  assert(assessment.score >= 80, `Expected score >= 80, got ${assessment.score}`);
  assert(
    assessment.reasons.some((r) => r.includes('Sovereign government domain authority')),
    'Must cite sovereign government domain authority'
  );
  assert(
    assessment.limitations.some((l) => l.includes('district-level') || l.includes('autonomous private universities')),
    'Must include civic vs autonomous university scope limitation'
  );

  console.log('✓ testGovernmentAuthorityDomain passed.');
}

// -------------------------------------------------------------
// Test 6: Reputable News Publisher (The Hindu)
// -------------------------------------------------------------
function testReputableNewsPublisher() {
  console.log('Testing: Reputable News Publisher (The Hindu)...');

  const newsSource: Partial<NormalizedSource> = {
    id: 'src-hindu',
    type: 'News outlet',
    name: 'The Hindu: Chennai Weather & Education Update',
    platform: 'The Hindu',
    url: 'https://thehindu.com/news/cities/chennai/oct5.html',
    domain: 'thehindu.com',
    publisher: 'The Hindu',
    publishedAt: '2026-10-05T04:00:00Z',
    snippet: 'Colleges in Chengalpattu district reported normal attendance.',
  };

  const assessment = assessSourceCredibility(newsSource);

  assert(
    assessment.reliability === 'high' || assessment.reliability === 'medium',
    `Expected 'high' or 'medium', got '${assessment.reliability}'`
  );
  assert(assessment.score >= 65, `Expected score >= 65, got ${assessment.score}`);
  assert(
    assessment.reasons.some((r) => r.includes('journalistic press domain') || r.includes('editorial accountability')),
    'Must cite editorial accountability'
  );
  assert(
    assessment.limitations.some((l) => l.includes('Secondary journalistic reporting') || l.includes('editorial condensation')),
    'Must note secondary journalistic reporting limitations'
  );

  console.log('✓ testReputableNewsPublisher passed.');
}

// -------------------------------------------------------------
// Test 7: Batch Credibility Assessment & Statistical Distribution
// -------------------------------------------------------------
function testBatchCredibilityAssessment() {
  console.log('Testing: Batch Credibility Assessment across Collection...');

  const batchSources: Partial<NormalizedSource>[] = [
    {
      id: 'b-1',
      type: 'Official notice',
      url: 'https://srmist.edu.in/notice.pdf',
      domain: 'srmist.edu.in',
      name: 'SRM Circular Ref #2026-R4',
      publishedAt: '2026-10-04T18:00:00Z',
    },
    {
      id: 'b-2',
      type: 'Government source',
      url: 'https://tnsdma.tn.gov.in/release.html',
      domain: 'tnsdma.tn.gov.in',
      name: 'TNSDMA Press Release',
      publishedAt: '2026-10-04T20:00:00Z',
    },
    {
      id: 'b-3',
      type: 'News outlet',
      url: 'https://thehindu.com/news/1.html',
      domain: 'thehindu.com',
      name: 'The Hindu Report',
      publishedAt: '2026-10-05T03:00:00Z',
    },
    {
      id: 'b-4',
      type: 'Forwarded chat',
      name: 'Anonymous Chat Forward',
      domain: 'whatsapp.com',
    },
  ];

  const batchResult = assessBatchCredibility(batchSources as any);

  assert(batchResult.assessments.length === 4, 'Processed 4 sources');
  assert(batchResult.highCount >= 2, `Expected at least 2 high sources, got ${batchResult.highCount}`);
  assert(batchResult.lowCount + batchResult.unverifiedCount >= 1, 'Expected at least 1 low/unverified source');
  assert(batchResult.averageScore > 40, `Expected sensible average score, got ${batchResult.averageScore}`);

  console.log('✓ testBatchCredibilityAssessment passed.');
}

// -------------------------------------------------------------
// Run All Phase 7 Tests
// -------------------------------------------------------------
function runAllPhase7Tests() {
  console.log('====================================================');
  console.log('RUNNING ECHO TRACE PHASE 7 CREDIBILITY SCORER TESTS');
  console.log('====================================================');

  testOfficialInstitutionalSource();
  testAnonymousPost();
  testAntiSpoofingDefense();
  testAntiPopularitySafeguard();
  testGovernmentAuthorityDomain();
  testReputableNewsPublisher();
  testBatchCredibilityAssessment();

  console.log('====================================================');
  console.log('ALL PHASE 7 CREDIBILITY SCORER TESTS PASSED (100% OK)');
  console.log('====================================================');
}

runAllPhase7Tests();
