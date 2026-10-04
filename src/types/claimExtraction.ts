/**
 * Phase 2 Claim Extraction Types
 * 
 * Formalizes the transition:
 * NORMALIZED INPUT → CLAIM EXTRACTION → STRUCTURED CLAIM
 */

export type ClaimModality =
  | 'assertive'      // Definitive statement (e.g., "SRM is closed tomorrow")
  | 'speculative'    // Uncertain / modal statement (e.g., "College may be closed")
  | 'reported'       // Attributed / hearsay (e.g., "Someone said SRM is closed")
  | 'conditional'    // Contingent statement (e.g., "If rain continues, classes will stop")
  | 'interrogative'; // Inquiry / query (e.g., "Is college closed tomorrow?")

/**
 * Structured, query-ready propositional claim extracted from raw input.
 * Consumed by Phase 3 (Evidence Search) to formulate search queries and cross-checks.
 */
export interface ExtractedClaim {
  id: string;
  originalInput: string;
  claimText: string;
  subject?: string;
  action?: string;
  object?: string;
  timeReference?: string;
  location?: string;
  reason?: string;
  entities: string[];
  keywords: string[];
  extractedAt: string;

  // Phase 2 Semantic Qualifiers:
  modality: ClaimModality;
  isAmbiguous: boolean;
  ambiguityNotes?: string;

  // Explicit verification separation:
  verificationStatus: 'unverified'; // Extraction != verification
  confidence: number; // Structural extraction completeness (0 - 1), NOT truth credibility
}

/**
 * Result returned by the Claim Extraction service.
 * Supports detection of multiple claims and ambiguities.
 */
export interface ClaimExtractionResult {
  inputId: string;
  originalInput: string;
  primaryClaim: ExtractedClaim;
  detectedClaims: ExtractedClaim[];
  hasMultipleClaims: boolean;
  hasAmbiguity: boolean;
  ambiguityReason?: string;
  extractedAt: string;
  extractionMethod: 'rule-based' | 'llm' | 'hybrid';
}

/**
 * Extensible interface for Claim Extraction services.
 * Allows swapping between local rule-based heuristics and future LLM extractors (Gemini/GenAI).
 */
export interface IClaimExtractor {
  extract(rawInput: string, inputId?: string, platform?: string): ClaimExtractionResult | Promise<ClaimExtractionResult>;
}
