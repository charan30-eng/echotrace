import {
  InvestigationInput,
  InputType,
  InputValidationResult,
  InputMetadata,
  UrlDetails,
  SocialDetails,
} from '../types/investigation';

export const MAX_TEXT_LENGTH = 5000;
export const MAX_URL_LENGTH = 2048;
export const MAX_SOCIAL_LENGTH = 4000;

export const MIN_TEXT_LENGTH = 5;
export const MIN_SOCIAL_LENGTH = 5;

// Private / loopback IPv4 patterns
const PRIVATE_IP_REGEX = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

/**
 * Validates direct textual claim input.
 */
export function validateTextInput(
  rawText: string,
  options?: { isDemo?: boolean; scenarioId?: string }
): InputValidationResult {
  const trimmed = rawText.trim();

  // 1. Empty input
  if (!trimmed) {
    return {
      isValid: false,
      errorCode: 'EMPTY_INPUT',
      errorMessage: 'Please enter a claim statement or text to analyze.',
      field: 'text',
    };
  }

  // 2. Minimum length check
  if (trimmed.length < MIN_TEXT_LENGTH) {
    return {
      isValid: false,
      errorCode: 'EMPTY_INPUT',
      errorMessage: `Input statement is too short (${trimmed.length} chars). Please enter a complete claim or sentence (minimum ${MIN_TEXT_LENGTH} characters).`,
      field: 'text',
    };
  }

  // 3. Extremely long input
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      isValid: false,
      errorCode: 'INPUT_TOO_LONG',
      errorMessage: `Input text is too long (${trimmed.length.toLocaleString()} characters). Maximum allowed length is ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
      field: 'text',
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const metadata: InputMetadata = {
    charCount: trimmed.length,
    wordCount: words.length,
    isDemo: options?.isDemo ?? false,
    sourceScenarioId: options?.scenarioId,
  };

  const normalizedInput: InvestigationInput = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    inputType: 'text',
    rawInput: trimmed,
    submittedAt: new Date().toISOString(),
    metadata,
  };

  return {
    isValid: true,
    normalizedInput,
  };
}

/**
 * Validates a web URL input for claim extraction and evidence auditing.
 */
export function validateUrlInput(
  rawUrl: string,
  options?: { isDemo?: boolean; scenarioId?: string }
): InputValidationResult {
  const trimmed = rawUrl.trim();

  // 1. Empty input
  if (!trimmed) {
    return {
      isValid: false,
      errorCode: 'EMPTY_INPUT',
      errorMessage: 'Please enter a web URL to investigate.',
      field: 'url',
    };
  }

  // 2. Extremely long URL
  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      errorCode: 'INPUT_TOO_LONG',
      errorMessage: `URL is excessively long (${trimmed.length} characters). Maximum allowed URL length is ${MAX_URL_LENGTH} characters.`,
      field: 'url',
    };
  }

  // 3. Protocol scheme check
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return {
        isValid: false,
        errorCode: 'UNSUPPORTED_URL',
        errorMessage: `Unsupported URL protocol "${scheme}:". EchoTrace only accepts public HTTP or HTTPS web URLs.`,
        field: 'url',
      };
    }
  }

  // 4. URL Syntax parsing
  let parsedUrl: URL;
  let normalizedUrlString = trimmed;

  // Add protocol if user omitted it
  if (!schemeMatch) {
    normalizedUrlString = `https://${trimmed}`;
  }

  try {
    parsedUrl = new URL(normalizedUrlString);
  } catch {
    return {
      isValid: false,
      errorCode: 'INVALID_URL',
      errorMessage: 'Invalid URL format. Please provide a valid web address (e.g., https://example.com/article).',
      field: 'url',
    };
  }

  // 5. Verify parsed protocol is HTTP/HTTPS
  const protocol = parsedUrl.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return {
      isValid: false,
      errorCode: 'UNSUPPORTED_URL',
      errorMessage: `Unsupported URL protocol "${protocol}". EchoTrace only accepts public HTTP or HTTPS web URLs.`,
      field: 'url',
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 5. Hostname format validation
  if (!hostname || hostname.length === 0) {
    return {
      isValid: false,
      errorCode: 'INVALID_URL',
      errorMessage: 'URL is missing a valid domain name.',
      field: 'url',
    };
  }

  // 6. Unsupported hostnames (localhost, loopback, private intranet)
  if (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    PRIVATE_IP_REGEX.test(hostname)
  ) {
    return {
      isValid: false,
      errorCode: 'UNSUPPORTED_URL',
      errorMessage: `Unsupported URL host "${hostname}". Localhost and private intranet addresses cannot be audited. Please provide a public web link.`,
      field: 'url',
    };
  }

  // Hostname must have at least one dot (domain.tld) or be a valid public domain
  if (!hostname.includes('.')) {
    return {
      isValid: false,
      errorCode: 'INVALID_URL',
      errorMessage: `Invalid domain "${hostname}". Please provide a full domain with a top-level domain extension (e.g., .edu, .com, .org).`,
      field: 'url',
    };
  }

  const urlDetails: UrlDetails = {
    originalUrl: trimmed,
    normalizedUrl: parsedUrl.toString(),
    hostname,
    protocol,
    pathname: parsedUrl.pathname,
    domain: hostname.replace(/^www\./, ''),
    isSecure: protocol === 'https:',
  };

  const words = trimmed.split(/[/._?=&-]+/).filter(Boolean);
  const metadata: InputMetadata = {
    charCount: trimmed.length,
    wordCount: words.length,
    urlDetails,
    isDemo: options?.isDemo ?? false,
    sourceScenarioId: options?.scenarioId,
  };

  const normalizedInput: InvestigationInput = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    inputType: 'url',
    rawInput: trimmed,
    submittedAt: new Date().toISOString(),
    metadata,
  };

  return {
    isValid: true,
    normalizedInput,
  };
}

/**
 * Validates social media / public forum content input.
 */
export function validateSocialInput(
  rawPost: string,
  platform: string,
  options?: {
    author?: string;
    handleOrChannel?: string;
    reach?: string;
    isDemo?: boolean;
    scenarioId?: string;
  }
): InputValidationResult {
  const trimmed = rawPost.trim();

  // 1. Missing social content
  if (!trimmed) {
    return {
      isValid: false,
      errorCode: 'MISSING_SOCIAL_CONTENT',
      errorMessage: 'Please paste or enter the social media post or forum thread content.',
      field: 'social',
    };
  }

  // 2. Minimum length check
  if (trimmed.length < MIN_SOCIAL_LENGTH) {
    return {
      isValid: false,
      errorCode: 'MISSING_SOCIAL_CONTENT',
      errorMessage: `Social post text is too brief (${trimmed.length} chars). Please enter the full message or excerpt (minimum ${MIN_SOCIAL_LENGTH} characters).`,
      field: 'social',
    };
  }

  // 3. Extremely long social post
  if (trimmed.length > MAX_SOCIAL_LENGTH) {
    return {
      isValid: false,
      errorCode: 'INPUT_TOO_LONG',
      errorMessage: `Social content is too long (${trimmed.length.toLocaleString()} characters). Maximum allowed length is ${MAX_SOCIAL_LENGTH.toLocaleString()} characters.`,
      field: 'social',
    };
  }

  // 4. Platform validation
  const cleanPlatform = (platform || '').trim().toLowerCase();
  if (!cleanPlatform) {
    return {
      isValid: false,
      errorCode: 'MISSING_SOCIAL_CONTENT',
      errorMessage: 'Please select or specify the source social media platform.',
      field: 'social',
    };
  }

  const socialDetails: SocialDetails = {
    platform: cleanPlatform,
    author: options?.author,
    handleOrChannel: options?.handleOrChannel,
    reach: options?.reach,
  };

  const words = trimmed.split(/\s+/).filter(Boolean);
  const metadata: InputMetadata = {
    charCount: trimmed.length,
    wordCount: words.length,
    socialDetails,
    isDemo: options?.isDemo ?? false,
    sourceScenarioId: options?.scenarioId,
  };

  const normalizedInput: InvestigationInput = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    inputType: 'social',
    rawInput: trimmed,
    platform: cleanPlatform,
    submittedAt: new Date().toISOString(),
    metadata,
  };

  return {
    isValid: true,
    normalizedInput,
  };
}

/**
 * Universal dispatcher to validate any input modality.
 */
export function validateInvestigationInput(
  inputType: InputType,
  rawInput: string,
  platform?: string,
  options?: {
    isDemo?: boolean;
    scenarioId?: string;
    author?: string;
    handleOrChannel?: string;
  }
): InputValidationResult {
  switch (inputType) {
    case 'text':
      return validateTextInput(rawInput, options);
    case 'url':
      return validateUrlInput(rawInput, options);
    case 'social':
      return validateSocialInput(rawInput, platform || 'telegram', options);
    default:
      return {
        isValid: false,
        errorCode: 'EMPTY_INPUT',
        errorMessage: `Unknown input type: ${String(inputType)}`,
        field: 'text',
      };
  }
}
