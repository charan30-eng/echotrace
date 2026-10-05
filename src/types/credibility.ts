/**
 * EchoTrace Phase 7: Source Credibility & Reliability Assessment Types
 * 
 * Formal Architecture:
 * SOURCE + PROVENANCE + METADATA → SOURCE RELIABILITY
 * 
 * Strict Guarantees:
 * 1. Reliability is strictly NOT the same thing as truth:
 *    - A source can be highly reliable but publish information that contradicts a claim.
 *    - A low-reliability source can contain information that happens to be correct.
 * 2. Multi-factor audit:
 *    - Official domain, government domain, institutional ownership, publisher identity,
 *      primary vs secondary document, author attribution, publication date,
 *      source provenance, direct attributability, independent verifiability.
 * 3. Anti-simplistic safeguards:
 *    - Never assigns high reliability simply because title or URL contains the word 'official'.
 *    - Never assigns high score simply because a source is popular or viral.
 * 4. Transparent reasons and contextual limitations for every assessment.
 * 5. Strictly does NOT determine the final overall claim verdict.
 */

import { SourceReliability } from './claim';

/**
 * Fine-grained factor score breakdown for forensic explainability
 */
export interface CredibilityFactorBreakdown {
  domainAuthority: number;       // 0 - 25: Accredited institutional / sovereign TLD
  publisherIdentity: number;     // 0 - 20: Recognized publisher vs unknown/anonymous
  primaryDocumentStatus: number; // 0 - 20: Signed circular / PDF vs secondary reporting vs hearsay
  provenanceVerifiability: number;// 0 - 15: Publicly auditable canonical URL vs private/ephemeral chat
  attributability: number;       // 0 - 10: Formal institutional role/bylines vs unverified author
  temporalFreshness: number;     // 0 - 10: Authenticated timestamp vs undated/ambiguous metadata
}

/**
 * Standardized Credibility Assessment returned for each source
 */
export interface CredibilityAssessment {
  sourceId: string;
  reliability: SourceReliability; // 'high' | 'medium' | 'low' | 'unverified'
  score: number;                  // 0 to 100
  reasons: string[];              // Transparent forensic rationale explaining the score
  limitations: string[];          // Methodological or contextual limitations of this source
  breakdown?: CredibilityFactorBreakdown;
  assessedAt?: string;
  flags?: string[];               // e.g. 'SPOOFED_OFFICIAL_CLAIM', 'ANONYMOUS_HEARSAY', 'UNVERIFIED_BLOG'
}

/**
 * Summary of batch credibility assessment across all sources
 */
export interface BatchCredibilityResult {
  assessments: CredibilityAssessment[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unverifiedCount: number;
  averageScore: number;
  assessedAt: string;
}
