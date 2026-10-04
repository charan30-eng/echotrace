import {
  validateTextInput,
  validateUrlInput,
  validateSocialInput,
  validateInvestigationInput,
  MAX_TEXT_LENGTH,
  MAX_URL_LENGTH,
  MAX_SOCIAL_LENGTH,
} from './inputValidator';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- RUNNING PHASE 1 INPUT VALIDATION & NORMALIZATION TESTS ---');

// ==========================================
// 1. DIRECT TEXT TESTS
// ==========================================
console.log('\n[TEST GROUP 1] Direct Text Validation');

// 1.1 Empty input
const emptyTextRes = validateTextInput('');
assert(!emptyTextRes.isValid, 'Empty text must be invalid');
assert(emptyTextRes.errorCode === 'EMPTY_INPUT', 'Empty text code must be EMPTY_INPUT');

const whitespaceTextRes = validateTextInput('    \n\t  ');
assert(!whitespaceTextRes.isValid, 'Whitespace-only text must be invalid');
assert(whitespaceTextRes.errorCode === 'EMPTY_INPUT', 'Whitespace code must be EMPTY_INPUT');

// 1.2 Too short input
const shortTextRes = validateTextInput('Hey');
assert(!shortTextRes.isValid, 'Text < 5 characters must be invalid');
assert(shortTextRes.errorCode === 'EMPTY_INPUT', 'Short text code must be EMPTY_INPUT');

// 1.3 Extremely long input
const longText = 'A'.repeat(MAX_TEXT_LENGTH + 1);
const longTextRes = validateTextInput(longText);
assert(!longTextRes.isValid, 'Text > MAX_TEXT_LENGTH must be invalid');
assert(longTextRes.errorCode === 'INPUT_TOO_LONG', 'Long text code must be INPUT_TOO_LONG');

// 1.4 Valid text
const validText = 'SRM College is closed tomorrow due to heavy rain advisory.';
const validTextRes = validateTextInput(validText);
assert(validTextRes.isValid, 'Valid text statement must be valid');
if (validTextRes.isValid) {
  assert(validTextRes.normalizedInput.inputType === 'text', 'inputType must be text');
  assert(validTextRes.normalizedInput.rawInput === validText, 'rawInput must match');
  assert(typeof validTextRes.normalizedInput.id === 'string', 'id must be string');
  assert(typeof validTextRes.normalizedInput.submittedAt === 'string', 'submittedAt must be string');
  assert(validTextRes.normalizedInput.metadata?.charCount === validText.length, 'charCount must match');
}
console.log('✓ Direct text validation tests passed.');

// ==========================================
// 2. URL VALIDATION TESTS
// ==========================================
console.log('\n[TEST GROUP 2] URL Validation & Normalization');

// 2.1 Empty URL
const emptyUrlRes = validateUrlInput('');
assert(!emptyUrlRes.isValid, 'Empty URL must be invalid');
assert(emptyUrlRes.errorCode === 'EMPTY_INPUT', 'Empty URL code must be EMPTY_INPUT');

// 2.2 Invalid URL format
const invalidUrlRes = validateUrlInput('not_a_valid_url_at_all');
assert(!invalidUrlRes.isValid, 'Malformed string must be invalid URL');
assert(invalidUrlRes.errorCode === 'INVALID_URL', 'Malformed URL code must be INVALID_URL');

// 2.3 Unsupported URL Protocol
const ftpUrlRes = validateUrlInput('ftp://files.example.com/circular.pdf');
assert(!ftpUrlRes.isValid, 'FTP protocol must be rejected');
assert(ftpUrlRes.errorCode === 'UNSUPPORTED_URL', 'FTP code must be UNSUPPORTED_URL');

const jsUrlRes = validateUrlInput('javascript:alert(1)');
assert(!jsUrlRes.isValid, 'javascript: URI must be rejected');
assert(jsUrlRes.errorCode === 'UNSUPPORTED_URL', 'javascript code must be UNSUPPORTED_URL');

const fileUrlRes = validateUrlInput('file:///C:/passwords.txt');
assert(!fileUrlRes.isValid, 'file:/// protocol must be rejected');
assert(fileUrlRes.errorCode === 'UNSUPPORTED_URL', 'file protocol code must be UNSUPPORTED_URL');

// 2.4 Unsupported Host (Localhost & Private IP)
const localhostRes = validateUrlInput('http://localhost:3000/internal-page');
assert(!localhostRes.isValid, 'localhost must be rejected');
assert(localhostRes.errorCode === 'UNSUPPORTED_URL', 'localhost code must be UNSUPPORTED_URL');

const loopbackRes = validateUrlInput('http://127.0.0.1/admin');
assert(!loopbackRes.isValid, '127.0.0.1 loopback must be rejected');
assert(loopbackRes.errorCode === 'UNSUPPORTED_URL', '127.0.0.1 code must be UNSUPPORTED_URL');

const privateIpRes = validateUrlInput('http://192.168.1.100/router');
assert(!privateIpRes.isValid, 'Private network 192.168.x.x must be rejected');
assert(privateIpRes.errorCode === 'UNSUPPORTED_URL', '192.168.x.x code must be UNSUPPORTED_URL');

// 2.5 Extremely long URL
const longUrl = 'https://example.com/' + 'a'.repeat(MAX_URL_LENGTH);
const longUrlRes = validateUrlInput(longUrl);
assert(!longUrlRes.isValid, 'Excessively long URL must be rejected');
assert(longUrlRes.errorCode === 'INPUT_TOO_LONG', 'Long URL code must be INPUT_TOO_LONG');

// 2.6 Valid URL without protocol auto-normalizes
const noProtoUrlRes = validateUrlInput('evarsity.srmist.edu.in/announcements/circular.html');
assert(noProtoUrlRes.isValid, 'Valid domain without https:// prefix should auto-normalize');
if (noProtoUrlRes.isValid) {
  assert(noProtoUrlRes.normalizedInput.inputType === 'url', 'inputType must be url');
  assert(noProtoUrlRes.normalizedInput.metadata?.urlDetails?.hostname === 'evarsity.srmist.edu.in', 'hostname must match');
  assert(noProtoUrlRes.normalizedInput.metadata?.urlDetails?.isSecure === true, 'isSecure must be true');
}

// 2.7 Valid full HTTPS URL
const fullUrl = 'https://evarsity.srmist.edu.in/announcements/monsoon-rain-advisory.html';
const fullUrlRes = validateUrlInput(fullUrl);
assert(fullUrlRes.isValid, 'Standard full HTTPS URL must be valid');
if (fullUrlRes.isValid) {
  assert(fullUrlRes.normalizedInput.rawInput === fullUrl, 'rawInput must be preserved');
  assert(fullUrlRes.normalizedInput.metadata?.urlDetails?.protocol === 'https:', 'protocol must be https:');
}
console.log('✓ Web URL validation and normalization tests passed.');

// ==========================================
// 3. SOCIAL CONTENT VALIDATION TESTS
// ==========================================
console.log('\n[TEST GROUP 3] Social Content Validation');

// 3.1 Missing social content
const emptySocialRes = validateSocialInput('', 'telegram');
assert(!emptySocialRes.isValid, 'Empty social content must be rejected');
assert(emptySocialRes.errorCode === 'MISSING_SOCIAL_CONTENT', 'Empty social code must be MISSING_SOCIAL_CONTENT');

// 3.2 Short social content
const shortSocialRes = validateSocialInput('Yo', 'telegram');
assert(!shortSocialRes.isValid, 'Short social post must be rejected');
assert(shortSocialRes.errorCode === 'MISSING_SOCIAL_CONTENT', 'Short social code must be MISSING_SOCIAL_CONTENT');

// 3.3 Extremely long social post
const longSocial = 'X'.repeat(MAX_SOCIAL_LENGTH + 1);
const longSocialRes = validateSocialInput(longSocial, 'reddit');
assert(!longSocialRes.isValid, 'Social post > MAX_SOCIAL_LENGTH must be rejected');
assert(longSocialRes.errorCode === 'INPUT_TOO_LONG', 'Long social code must be INPUT_TOO_LONG');

// 3.4 Valid social content with platform
const validSocial = '📢 [EXAM UPDATE] Tomorrow slot 2 exam postponed to Monday. Please verify on student portal.';
const validSocialRes = validateSocialInput(validSocial, 'telegram', {
  author: 'SRM Unofficial Updates',
  handleOrChannel: '@srm_exams_updates',
});
assert(validSocialRes.isValid, 'Valid social content must be valid');
if (validSocialRes.isValid) {
  assert(validSocialRes.normalizedInput.inputType === 'social', 'inputType must be social');
  assert(validSocialRes.normalizedInput.platform === 'telegram', 'platform must be telegram');
  assert(validSocialRes.normalizedInput.metadata?.socialDetails?.author === 'SRM Unofficial Updates', 'author must match');
}
console.log('✓ Social content validation tests passed.');

// ==========================================
// 4. INVESTIGATION INPUT MODEL INTEGRITY
// ==========================================
console.log('\n[TEST GROUP 4] InvestigationInput Normalized Model Integrity');

const universalRes = validateInvestigationInput(
  'url',
  'https://examinations.srmist.edu.in/timetable/slot-2.pdf',
  undefined,
  { isDemo: true, scenarioId: 'url-2' }
);
assert(universalRes.isValid, 'Universal dispatcher must succeed for valid URL');
if (universalRes.isValid) {
  const model = universalRes.normalizedInput;
  assert('id' in model, 'Model must have id');
  assert('inputType' in model, 'Model must have inputType');
  assert('rawInput' in model, 'Model must have rawInput');
  assert('submittedAt' in model, 'Model must have submittedAt');
  assert(model.metadata?.isDemo === true, 'metadata.isDemo must match');
  assert(model.metadata?.sourceScenarioId === 'url-2', 'metadata.sourceScenarioId must match');
  console.log('Emitted InvestigationInput JSON preview:\n', JSON.stringify(model, null, 2));
}

console.log('\n=== ALL PHASE 1 VALIDATION & NORMALIZATION TESTS PASSED SUCCESSFULLY! ===\n');
