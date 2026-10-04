export type InputType = 'text' | 'url' | 'social';

export type SupportedSocialPlatform = 'telegram' | 'x' | 'reddit' | 'instagram' | 'other';

export interface UrlDetails {
  originalUrl: string;
  normalizedUrl: string;
  hostname: string;
  protocol: string;
  pathname: string;
  domain: string;
  isSecure: boolean;
}

export interface SocialDetails {
  platform: string;
  author?: string;
  handleOrChannel?: string;
  reach?: string;
  timestamp?: string;
}

export interface InputMetadata {
  charCount: number;
  wordCount: number;
  urlDetails?: UrlDetails;
  socialDetails?: SocialDetails;
  sourceScenarioId?: string;
  isDemo?: boolean;
}

/**
 * Clean normalized input model representing the standardized intake
 * across all input modalities (Direct Text, Web URL, Social Media Post).
 * Produced by Phase 1 and consumed by Phase 2 (Claim Extraction).
 */
export interface InvestigationInput {
  id: string;
  inputType: InputType;
  rawInput: string;
  platform?: string;
  submittedAt: string;
  metadata?: InputMetadata;
}

export interface ValidationSuccess {
  isValid: true;
  normalizedInput: InvestigationInput;
  warnings?: string[];
}

export interface ValidationFailure {
  isValid: false;
  errorCode:
    | 'EMPTY_INPUT'
    | 'INVALID_URL'
    | 'UNSUPPORTED_URL'
    | 'INPUT_TOO_LONG'
    | 'MISSING_SOCIAL_CONTENT';
  errorMessage: string;
  field: 'text' | 'url' | 'social';
}

export type InputValidationResult = ValidationSuccess | ValidationFailure;
