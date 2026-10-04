import { claimExtractor } from './claimExtractor';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- RUNNING PHASE 2 CLAIM EXTRACTION TESTS ---');

// ==========================================
// TEST 1: SPECIFICATION EXAMPLE
// ==========================================
console.log('\n[TEST 1] Specification Example Extraction');
const input1 = 'Someone said SRM is closed tomorrow because of heavy rain.';
const result1 = claimExtractor.extract(input1, 'inv-spec-1');
const claim1 = result1.primaryClaim;

console.log('Extracted Claim 1:', JSON.stringify(claim1, null, 2));

assert(claim1.originalInput === input1, 'Original input must be preserved');
assert(claim1.subject === 'SRM College', `Subject should be 'SRM College', got '${claim1.subject}'`);
assert(claim1.action === 'closed', `Action should be 'closed', got '${claim1.action}'`);
assert(claim1.timeReference === 'tomorrow', `Time reference should be 'tomorrow', got '${claim1.timeReference}'`);
assert(claim1.reason === 'heavy rain', `Reason should be 'heavy rain', got '${claim1.reason}'`);
assert(claim1.entities.includes('SRM College'), 'Entities must contain SRM College');
assert(claim1.keywords.includes('closed'), 'Keywords must contain closed');
assert(claim1.keywords.includes('tomorrow'), 'Keywords must contain tomorrow');
assert(claim1.keywords.includes('heavy rain') || claim1.keywords.includes('rain'), 'Keywords must contain heavy rain');
assert(claim1.verificationStatus === 'unverified', 'Extracted claim must be UNVERIFIED');
assert(!('score' in claim1), 'Extracted claim must NOT contain credibility score');
console.log('✓ Test 1 passed: Specification example extracted accurately.');

// ==========================================
// TEST 2: AMBIGUITY & UNCERTAINTY PRESERVATION
// ==========================================
console.log('\n[TEST 2] Ambiguity & Uncertainty Preservation');
const input2 = 'College may be closed tomorrow';
const result2 = claimExtractor.extract(input2, 'inv-modal-2');
const claim2 = result2.primaryClaim;

console.log('Extracted Claim 2 (Modal):', JSON.stringify(claim2, null, 2));

assert(claim2.modality === 'speculative', `Modality must be 'speculative', got '${claim2.modality}'`);
assert(claim2.isAmbiguous === true, 'Claim must be marked as ambiguous');
assert(claim2.claimText.toLowerCase().includes('may'), `ClaimText must preserve modal 'may', got '${claim2.claimText}'`);
assert(!claim2.claimText.toLowerCase().includes('is closed'), 'ClaimText must NOT be rewritten to definitive "is closed"');
console.log('✓ Test 2 passed: Modal uncertainty strictly preserved.');

// ==========================================
// TEST 3: MULTIPLE CLAIMS DETECTION
// ==========================================
console.log('\n[TEST 3] Multiple Claims Detection');
const input3 = 'SRM College is closed tomorrow and the TCS placement drive has been cancelled';
const result3 = claimExtractor.extract(input3, 'inv-multi-3');

console.log('Multiple Claims Result:', {
  hasMultipleClaims: result3.hasMultipleClaims,
  claimsCount: result3.detectedClaims.length,
  claims: result3.detectedClaims.map((c) => ({
    subject: c.subject,
    action: c.action,
    claimText: c.claimText,
  })),
});

assert(result3.hasMultipleClaims === true, 'Compound statement must trigger hasMultipleClaims = true');
assert(result3.detectedClaims.length >= 2, `Should detect at least 2 claims, got ${result3.detectedClaims.length}`);
assert(result3.detectedClaims[0].action === 'closed', 'Claim 1 action should be closed');
assert(result3.detectedClaims[1].action === 'cancelled', 'Claim 2 action should be cancelled');
console.log('✓ Test 3 passed: Multiple claims detected and parsed into separate claims.');

// ==========================================
// TEST 4: DISTINCTION BETWEEN LAYERS
// ==========================================
console.log('\n[TEST 4] Verification Layer Distinction');
assert(claim1.originalInput !== claim1.claimText, 'Original input and clean claimText must be distinct');
assert(claim1.verificationStatus === 'unverified', 'Status must be strictly unverified');
console.log('✓ Test 4 passed: Clean boundary between raw input and extracted claim.');

console.log('\n=== ALL PHASE 2 CLAIM EXTRACTION TESTS PASSED! ===\n');
