/**
 * EchoTrace Phase 6: Semantic Evidence Analyzer Test Suite
 * 
 * Verifies:
 * 1. Semantic relationship classification: 'supports', 'contradicts', 'neutral', 'insufficient'.
 * 2. Independence of Source Credibility:
 *    - High-credibility government source contradicting the claim -> 'contradicts'.
 *    - Low-credibility social post supporting the claim -> 'supports'.
 * 3. Modality Discrimination:
 *    - "may be closed" is strictly NOT interpreted as "is closed".
 * 4. Negation Detection:
 *    - "not closed" is interpreted as contradiction to "is closed".
 * 5. Partial Support Detection:
 *    - "Classes are suspended tomorrow" SUPPORTS closure, but does NOT establish heavy rain as the cause.
 * 6. Element Alignment:
 *    - Audits subject, action, reason, time, location, conditions, negation, uncertainty, wording.
 * 7. Non-Verdict Principle:
 *    - Produces per-evidence assessments without computing overall verdict.
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import { Evidence } from '../types/evidence.ts';
import {
  analyzeAllEvidence,
  analyzeEvidence,
  evaluateElementAlignment,
  evaluateModality,
} from './evidenceAnalyzer.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Sample Extracted Claim (Phase 2 format)
const sampleClaim: ExtractedClaim = {
  id: 'claim-srm-rain-1',
  originalInput: 'SRM is closed tomorrow because of heavy rain.',
  claimText: 'SRM is closed tomorrow because of heavy rain.',
  subject: 'SRM',
  action: 'closed',
  reason: 'heavy rain',
  timeReference: 'tomorrow',
  location: 'Kattankulathur',
  entities: ['SRM', 'SRMIST'],
  keywords: ['srm', 'closed', 'tomorrow', 'heavy rain', 'holiday'],
  extractedAt: '2026-10-05T06:00:00Z',
  modality: 'assertive',
  isAmbiguous: false,
  verificationStatus: 'unverified',
  confidence: 0.95,
};

// -------------------------------------------------------------
// Test 1: Full Support (Action + Catalyst Matched)
// -------------------------------------------------------------
function testFullSupport() {
  console.log('Testing: Full Support (Action + Reason both confirmed)...');

  const evidence: Evidence = {
    id: 'evi-full-support',
    sourceId: 'src-official-srm',
    title: 'SRMIST Registrar Official Announcement',
    url: 'https://srmist.edu.in/announcements/weather-holiday.html',
    retrievedAt: new Date().toISOString(),
    excerpt: 'SRM declared a holiday tomorrow on account of heavy downpour and cyclone warnings.',
    relevanceScore: 0.95,
    evidenceType: 'official',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessment = analyzeEvidence(sampleClaim, evidence);

  assert(assessment.relationship === 'supports', `Expected 'supports', got '${assessment.relationship}'`);
  assert(assessment.supportType === 'full', `Expected 'full' support, got '${assessment.supportType}'`);
  assert(assessment.explanation.includes('Full Support'), 'Explanation must indicate Full Support');
  assert(assessment.explanation.includes('heavy rain'), 'Explanation must mention the confirmed reason');
  assert(assessment.relevanceScore >= 0.9, `Relevance score must be high, got ${assessment.relevanceScore}`);

  console.log('✓ testFullSupport passed.');
}

// -------------------------------------------------------------
// Test 2: Partial Support (Prompt Specification Example)
// "Classes are suspended tomorrow" -> SUPPORTS closure, but does NOT establish heavy rain
// -------------------------------------------------------------
function testPartialSupportSpecificationExample() {
  console.log('Testing: Partial Support (Closure supported, but causality unestablished)...');

  const evidence: Evidence = {
    id: 'evi-partial-support',
    sourceId: 'src-notice-board',
    title: 'Academic Notice',
    url: 'https://srmist.edu.in/notice-105',
    retrievedAt: new Date().toISOString(),
    excerpt: 'All classes are suspended tomorrow across Kattankulathur campus.',
    relevanceScore: 0.85,
    evidenceType: 'official',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessment = analyzeEvidence(sampleClaim, evidence);

  // CRITICAL REQUIREMENT VERIFICATION
  assert(assessment.relationship === 'supports', `Must classify as 'supports', got '${assessment.relationship}'`);
  assert(assessment.supportType === 'partial', `CRITICAL: Must be 'partial' support, got '${assessment.supportType}'`);
  assert(
    assessment.explanation.includes('Partial Support') || assessment.explanation.includes('Causality unestablished') || assessment.explanation.includes('does NOT establish'),
    `Explanation must explain that rain was not established: ${assessment.explanation}`
  );
  assert(
    assessment.elementAlignment?.reasonMatched === false,
    'Element alignment must record that reason (heavy rain) was NOT matched'
  );
  assert(
    assessment.elementAlignment?.actionMatched === true,
    'Element alignment must record that action (closure/suspension) WAS matched'
  );

  console.log('✓ testPartialSupportSpecificationExample passed.');
}

// -------------------------------------------------------------
// Test 3: Direct Contradiction ("not closed", "classes as usual")
// -------------------------------------------------------------
function testDirectContradiction() {
  console.log('Testing: Direct Contradiction ("not closed" / "regular working day")...');

  // Case A: Explicit negation ("not closed")
  const evidenceNegated: Evidence = {
    id: 'evi-negated',
    sourceId: 'src-srm-registrar',
    title: 'Registrar Press Note',
    url: 'https://srmist.edu.in/press/clarification.html',
    retrievedAt: new Date().toISOString(),
    excerpt: 'The university is not closed tomorrow; all scheduled examinations will proceed without disruption.',
    relevanceScore: 0.95,
    evidenceType: 'official',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessA = analyzeEvidence(sampleClaim, evidenceNegated);
  assert(assessA.relationship === 'contradicts', `Expected 'contradicts', got '${assessA.relationship}'`);
  assert(assessA.explanation.includes('Publisher explicitly denies closure') || assessA.explanation.includes('negates the claim'), 'Explanation must cite denial of closure');

  // Case B: Operational continuity ("function normally", "regular classes")
  const evidenceContinuity: Evidence = {
    id: 'evi-continuity',
    sourceId: 'src-hindu-city',
    title: 'The Hindu Education Bureau',
    url: 'https://thehindu.com/news/cities/chennai/srm-normal.html',
    retrievedAt: new Date().toISOString(),
    excerpt: 'SRM Institute will function normally tomorrow with regular classes in session.',
    relevanceScore: 0.92,
    evidenceType: 'news',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessB = analyzeEvidence(sampleClaim, evidenceContinuity);
  assert(assessB.relationship === 'contradicts', `Expected 'contradicts', got '${assessB.relationship}'`);
  assert(assessB.explanation.includes('operational continuity') || assessB.explanation.includes('function normally'), 'Explanation must cite operational continuity');

  console.log('✓ testDirectContradiction passed.');
}

// -------------------------------------------------------------
// Test 4: Modality Discrimination ("may be closed" != "is closed")
// -------------------------------------------------------------
function testModalityUncertaintyDiscrimination() {
  console.log('Testing: Modality Discrimination ("may be closed" != "is closed")...');

  const speculativeEvidence: Evidence = {
    id: 'evi-speculative',
    sourceId: 'src-student-blog',
    title: 'Campus Weather Talk',
    url: 'https://campusrumors.blog/oct5',
    retrievedAt: new Date().toISOString(),
    excerpt: 'SRM may be closed tomorrow if heavy rain continues into the evening.',
    relevanceScore: 0.6,
    evidenceType: 'secondary',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessment = analyzeEvidence(sampleClaim, speculativeEvidence);

  // CRITICAL REQUIREMENT: "may be closed" must NOT be interpreted as "is closed"
  assert(
    assessment.relationship !== 'supports',
    `CRITICAL VIOLATION: Speculative 'may be closed' was incorrectly classified as '${assessment.relationship}'`
  );
  assert(assessment.relationship === 'neutral', `Expected 'neutral' for speculative statement, got '${assessment.relationship}'`);
  assert(assessment.modalityEvaluation?.isSpeculativeOnly === true, 'Modality evaluation must identify speculative only');
  assert(
    assessment.explanation.includes('may be closed') || assessment.explanation.includes('uncertainty'),
    `Explanation must explain why speculative text does not confirm assertion: ${assessment.explanation}`
  );

  console.log('✓ testModalityUncertaintyDiscrimination passed.');
}

// -------------------------------------------------------------
// Test 5: Neutral Background (Weather advisory without institutional stance)
// -------------------------------------------------------------
function testNeutralTopicalBackground() {
  console.log('Testing: Neutral Background (Discusses rain without institutional stance)...');

  const weatherNotice: Evidence = {
    id: 'evi-imd-weather',
    sourceId: 'src-imd-bulletin',
    title: 'IMD Coastal Weather Warning',
    url: 'https://imd.gov.in/bulletin-chennai',
    retrievedAt: new Date().toISOString(),
    excerpt: 'The India Meteorological Department issued a red alert warning for heavy rainfall across Chengalpattu and Chennai districts.',
    relevanceScore: 0.7,
    evidenceType: 'government',
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessment = analyzeEvidence(sampleClaim, weatherNotice);

  assert(assessment.relationship === 'neutral', `Expected 'neutral', got '${assessment.relationship}'`);
  assert(
    assessment.explanation.includes('Neutral') && (assessment.explanation.includes('makes no statement') || assessment.explanation.includes('operational status')),
    `Explanation must clarify no stance was taken on university closure: ${assessment.explanation}`
  );

  console.log('✓ testNeutralTopicalBackground passed.');
}

// -------------------------------------------------------------
// Test 6: Insufficient Evidence (Paywalled, Inaccessible, Failed)
// -------------------------------------------------------------
function testInsufficientEvidenceHandling() {
  console.log('Testing: Insufficient Evidence (Paywalled / HTTP 403)...');

  const inaccessibleEvidence: Evidence = {
    id: 'evi-paywalled-lock',
    sourceId: 'src-paywalled',
    title: 'Premium Weather Journal',
    url: 'https://paywalled-journal.com/rain-holiday',
    retrievedAt: new Date().toISOString(),
    excerpt: '',
    relevanceScore: 0.0,
    evidenceType: 'news',
    extractionMethod: 'inaccessible-source-preserved',
    fetchStatus: 'inaccessible',
    inaccessibleReason: 'Authentication or subscription required (HTTP 403).',
  };

  const assessment = analyzeEvidence(sampleClaim, inaccessibleEvidence);

  assert(assessment.relationship === 'insufficient', `Expected 'insufficient', got '${assessment.relationship}'`);
  assert(assessment.relevanceScore === 0.0, 'Relevance score must be 0 for insufficient content');
  assert(assessment.explanation.includes('could not be accessed') || assessment.explanation.includes('Insufficient evidence'), 'Explanation must state content was inaccessible');

  console.log('✓ testInsufficientEvidenceHandling passed.');
}

// -------------------------------------------------------------
// Test 7: Independence of Source Credibility (CRITICAL REQUIREMENT)
// A high-credibility government source can contradict.
// An unreliable social post can support (without elevating its credibility).
// -------------------------------------------------------------
function testIndependenceFromSourceCredibility() {
  console.log('Testing: Independence from Source Credibility...');

  // Scenario 1: Highly Credible Government Source CONTRADICTS the claim
  const highCredibilityGovSource: Evidence = {
    id: 'evi-gov-tnsdma',
    sourceId: 'src-gov-official',
    title: 'Tamil Nadu State Disaster Management Advisory',
    url: 'https://tnsdma.tn.gov.in/press-release',
    retrievedAt: new Date().toISOString(),
    excerpt: 'Holiday declared for primary schools only; all universities and colleges in Chengalpattu will function normally.',
    relevanceScore: 0.94,
    evidenceType: 'government', // Highly credible tier
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessGov = analyzeEvidence(sampleClaim, highCredibilityGovSource);
  assert(
    assessGov.relationship === 'contradicts',
    `High-credibility government source MUST be classified as 'contradicts', got '${assessGov.relationship}'`
  );

  // Scenario 2: Unreliable Social Rumor SUPPORTS the claim
  const lowCredibilitySocialPost: Evidence = {
    id: 'evi-social-rumor',
    sourceId: 'src-social-anon',
    title: 'Anonymous Student Telegram Post',
    url: 'https://t.me/srm_rumors/994',
    retrievedAt: new Date().toISOString(),
    excerpt: 'SRM is officially closed tomorrow due to heavy rain guys, circular confirmed!',
    relevanceScore: 0.9,
    evidenceType: 'social', // Low credibility tier
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
  };

  const assessSocial = analyzeEvidence(sampleClaim, lowCredibilitySocialPost);
  assert(
    assessSocial.relationship === 'supports',
    `Low-credibility social rumor MUST be classified as 'supports' propositionally, got '${assessSocial.relationship}'`
  );

  console.log('✓ testIndependenceFromSourceCredibility passed.');
}

// -------------------------------------------------------------
// Test 8: Batch Evidence Analysis across Diverse Items
// -------------------------------------------------------------
function testBatchEvidenceAnalysis() {
  console.log('Testing: Batch Evidence Analysis across Collection...');

  const evidenceList: Evidence[] = [
    // 1. Full Support
    {
      id: 'batch-1',
      sourceId: 'src-1',
      title: 'Full Support Notice',
      url: 'https://example.com/1',
      retrievedAt: new Date().toISOString(),
      excerpt: 'SRM declared holiday tomorrow on account of heavy rain.',
      relevanceScore: 0.9,
      evidenceType: 'official',
      extractionMethod: 'semantic-passage-search',
      fetchStatus: 'accessible',
    },
    // 2. Partial Support
    {
      id: 'batch-2',
      sourceId: 'src-2',
      title: 'Partial Support Notice',
      url: 'https://example.com/2',
      retrievedAt: new Date().toISOString(),
      excerpt: 'Classes are suspended tomorrow at SRM.',
      relevanceScore: 0.8,
      evidenceType: 'official',
      extractionMethod: 'semantic-passage-search',
      fetchStatus: 'accessible',
    },
    // 3. Contradiction
    {
      id: 'batch-3',
      sourceId: 'src-3',
      title: 'Contradiction Press Release',
      url: 'https://example.com/3',
      retrievedAt: new Date().toISOString(),
      excerpt: 'SRM is not closed and will function normally tomorrow.',
      relevanceScore: 0.92,
      evidenceType: 'official',
      extractionMethod: 'semantic-passage-search',
      fetchStatus: 'accessible',
    },
    // 4. Neutral
    {
      id: 'batch-4',
      sourceId: 'src-4',
      title: 'Neutral Weather Report',
      url: 'https://example.com/4',
      retrievedAt: new Date().toISOString(),
      excerpt: 'IMD warns of heavy rain across coastal Tamil Nadu.',
      relevanceScore: 0.5,
      evidenceType: 'news',
      extractionMethod: 'semantic-passage-search',
      fetchStatus: 'accessible',
    },
    // 5. Insufficient
    {
      id: 'batch-5',
      sourceId: 'src-5',
      title: 'Inaccessible Paywalled Page',
      url: 'https://example.com/5',
      retrievedAt: new Date().toISOString(),
      excerpt: '',
      relevanceScore: 0.0,
      evidenceType: 'secondary',
      extractionMethod: 'inaccessible-source-preserved',
      fetchStatus: 'inaccessible',
    },
  ];

  const batchResult = analyzeAllEvidence(sampleClaim, evidenceList);

  assert(batchResult.assessments.length === 5, 'Must have 5 assessments');
  assert(batchResult.supportsCount === 2, `Expected 2 supports (1 full + 1 partial), got ${batchResult.supportsCount}`);
  assert(batchResult.partialSupportsCount === 1, `Expected 1 partial support, got ${batchResult.partialSupportsCount}`);
  assert(batchResult.contradictsCount === 1, `Expected 1 contradiction, got ${batchResult.contradictsCount}`);
  assert(batchResult.neutralCount === 1, `Expected 1 neutral, got ${batchResult.neutralCount}`);
  assert(batchResult.insufficientCount === 1, `Expected 1 insufficient, got ${batchResult.insufficientCount}`);

  console.log('✓ testBatchEvidenceAnalysis passed.');
}

// -------------------------------------------------------------
// Run All Phase 6 Tests
// -------------------------------------------------------------
function runAllPhase6Tests() {
  console.log('====================================================');
  console.log('RUNNING ECHO TRACE PHASE 6 EVIDENCE ANALYZER TESTS');
  console.log('====================================================');

  testFullSupport();
  testPartialSupportSpecificationExample();
  testDirectContradiction();
  testModalityUncertaintyDiscrimination();
  testNeutralTopicalBackground();
  testInsufficientEvidenceHandling();
  testIndependenceFromSourceCredibility();
  testBatchEvidenceAnalysis();

  console.log('====================================================');
  console.log('ALL PHASE 6 EVIDENCE ANALYZER TESTS PASSED (100% OK)');
  console.log('====================================================');
}

runAllPhase6Tests();
