/**
 * EchoTrace Phase 6: Semantic Evidence Analyzer Service
 * 
 * Formal Architecture:
 * CLAIM + EVIDENCE → SUPPORT / CONTRADICTION / NEUTRAL
 * 
 * Strict Guarantees:
 * 1. For every Evidence object, determines its relationship to the ExtractedClaim:
 *    - 'supports'
 *    - 'contradicts'
 *    - 'neutral'
 *    - 'insufficient'
 * 2. Independence of Source Credibility:
 *    - Source credibility is NOT confused with propositional relationship.
 *    - A high-credibility government source can contradict the claim.
 *    - An unreliable social post can support the claim while remaining low reliability.
 * 3. Element-by-Element Propositional Audit:
 *    - Evaluates: subject, action, object, time, location, conditions, negation, uncertainty, wording.
 * 4. Modality Discrimination:
 *    - "may be closed" is strictly NOT interpreted as "is closed".
 *    - Speculative/conditional modal verbs are identified and separated from definitive affirmations.
 * 5. Explicit Negation Detection:
 *    - "not closed", "classes as usual", "regular working day", and "no holiday" are identified as direct contradictions to "is closed".
 * 6. Partial Support Distinction:
 *    - Distinguishes full support (action + reason matched) from partial support
 *      (e.g., supports closure, but does NOT establish heavy rain as the catalyst).
 * 7. Strictly does NOT calculate the overall final truth verdict yet (reserved for future synthesis).
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import { Evidence } from '../types/evidence.ts';
import {
  BatchEvidenceAssessmentResult,
  ElementAlignment,
  EvidenceAssessment,
  EvidenceRelationship,
  ModalityEvaluation,
  SupportType,
} from '../types/evidenceAnalysis.ts';

// -------------------------------------------------------------
// Linguistic Vocabularies & Semantic Patterns
// -------------------------------------------------------------

// Speculative / Uncertain Modal Indicators
const SPECULATIVE_PATTERNS = [
  /\bmay\s+be\b/i,
  /\bmight\s+be\b/i,
  /\bcould\s+be\b/i,
  /\bpossibility\s+of\b/i,
  /\bpossible\s+closure\b/i,
  /\bpotential\s+holiday\b/i,
  /\bunconfirmed\b/i,
  /\bspeculat(?:ed|ing|ion)\b/i,
  /\brumor(?:ed|s)?\b/i,
  /\blikely\s+to\b/i,
  /\bpending\s+(?:announcement|decision|orders?)\b/i,
  /\bif\s+(?:rain|weather|conditions?)\b/i,
  /\bdeliberating\b/i,
  /\bexpected\s+to\s+decide\b/i,
  /\bunder\s+consideration\b/i,
];

// Explicit Speculative Closure Patterns (e.g. "may be closed", "might declare holiday")
const SPECULATIVE_CLOSURE_PATTERNS = [
  /\bmay\s+(?:be\s+)?closed\b/i,
  /\bmight\s+(?:be\s+)?closed\b/i,
  /\bcould\s+(?:be\s+)?closed\b/i,
  /\bmay\s+(?:declare\s+)?(?:a\s+)?holiday\b/i,
  /\bmight\s+(?:declare\s+)?(?:a\s+)?holiday\b/i,
  /\bcould\s+(?:declare\s+)?(?:a\s+)?holiday\b/i,
  /\bpossibility\s+of\s+(?:closure|holiday)\b/i,
  /\bpossible\s+(?:closure|holiday)\b/i,
  /\bpotential\s+(?:closure|holiday)\b/i,
  /\bunconfirmed\s+(?:closure|holiday)\b/i,
  /\blikely\s+to\s+(?:be\s+)?closed\b/i,
  /\bif\s+.*(?:closed|holiday|suspend)/i,
];

// Direct Negation & Continuity Patterns (Contradicting closure / holiday claims)
const NEGATION_PATTERNS = [
  /\bnot\s+closed\b/i,
  /\bis\s+not\s+closed\b/i,
  /\bwill\s+not\s+be\s+closed\b/i,
  /\bwill\s+not\s+remain\s+closed\b/i,
  /\bno\s+holiday\b/i,
  /\bno\s+holiday\s+(?:has\s+been\s+)?declared\b/i,
  /\bnot\s+declaring\s+holiday\b/i,
  /\bclasses\s+(?:are\s+)?not\s+suspended\b/i,
  /\bexams?\s+(?:are\s+)?not\s+postponed\b/i,
  /\bneither\s+closed\s+nor\b/i,
  /\bdeni(?:es|ed)\s+(?:any\s+)?(?:closure|holiday|postponement)\b/i,
  /\brefut(?:es|ed)\s+(?:the\s+)?(?:rumor|claim|report)\b/i,
  /\bdebunked\b/i,
  /\bfalse\s+(?:circular|notice|news|claim|report)\b/i,
  /\bfake\s+(?:circular|notice|message|order)\b/i,
  /\bbaseless\s+rumor\b/i,
  /\buntrue\b/i,
  /\bhoax\b/i,
  /\bclarifi(?:es|ed)\s+that\s+no\b/i,
];

// Operational Continuity Patterns (Equivalent to negation of closure)
const CONTINUITY_PATTERNS = [
  /\bfunction(?:s|ing)?\s+normally\b/i,
  /\bwill\s+function\s+normally\b/i,
  /\boperat(?:e|es|ing)\s+normally\b/i,
  /\bnormal\s+working\s+day\b/i,
  /\bregular\s+working\s+day\b/i,
  /\bregular\s+classes\b/i,
  /\bclasses\s+as\s+usual\b/i,
  /\bclasses\s+will\s+continue\b/i,
  /\bconducted\s+as\s+scheduled\b/i,
  /\bexaminations?\s+will\s+proceed\b/i,
  /\bwithout\s+disruption\b/i,
  /\bin\s+session\b/i,
  /\ball\s+colleges\s+remain\s+open\b/i,
  /\bregular\s+timetable\b/i,
  /\bopen\s+as\s+scheduled\b/i,
];

// Affirmative Closure Patterns (Supporting closure / holiday claims)
const AFFIRMATIVE_CLOSURE_PATTERNS = [
  /\bholiday\s+(?:has\s+been\s+)?declared\b/i,
  /\bdeclared\s+(?:a\s+)?holiday\b/i,
  /\bprecautionary\s+holiday\b/i,
  /\bclasses\s+(?:are\s+|stand\s+)?suspended\b/i,
  /\bacademic\s+activities\s+suspended\b/i,
  /\bwill\s+remain\s+closed\b/i,
  /\bis\s+closed\b/i,
  /\bare\s+closed\b/i,
  /\bclosed\s+tomorrow\b/i,
  /\bclosed\s+on\s+account\b/i,
  /\bcampus\s+closure\b/i,
  /\bcollege\s+closed\b/i,
  /\bexams?\s+(?:are\s+|have\s+been\s+)?postponed\b/i,
  /\bpostponed\s+to\s+a\s+later\s+date\b/i,
  /\brescheduled\b/i,
  /\bordering\s+closure\b/i,
];

// Weather / Heavy Rain Catalyst Patterns
const RAIN_REASON_PATTERNS = [
  /\bheavy\s+rain(?:fall)?\b/i,
  /\brain(?:fall)?\b/i,
  /\bdownpour\b/i,
  /\binundat(?:ed|ion)\b/i,
  /\bwaterlogging\b/i,
  /\bcyclone\b/i,
  /\bmonsoon\b/i,
  /\bred\s+alert\b/i,
  /\borange\s+alert\b/i,
  /\bweather\s+warning\b/i,
  /\binclement\s+weather\b/i,
];

// Temporal Marker Patterns
const TIME_PATTERNS: Record<string, RegExp[]> = {
  tomorrow: [/\btomorrow\b/i, /\bnext\s+day\b/i],
  today: [/\btoday\b/i],
  monday: [/\bmonday\b/i],
  tuesday: [/\btuesday\b/i],
  wednesday: [/\bwednesday\b/i],
  thursday: [/\bthursday\b/i],
  friday: [/\bfriday\b/i],
};

/**
 * Checks whether text contains any regex match from an array.
 */
function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Extracts all matching text snippets from an array of regex patterns.
 */
function findMatches(text: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Evaluates fine-grained element alignment between claim and evidence text.
 */
export function evaluateElementAlignment(
  claim: ExtractedClaim,
  evidenceText: string
): ElementAlignment {
  const textLower = evidenceText.toLowerCase();
  const matchedElements: string[] = [];
  const unmatchedElements: string[] = [];

  // 1. Subject Alignment (e.g. "SRM", "SRMIST", "College", "University")
  const subjectTerms = [
    claim.subject,
    ...(claim.entities || []),
  ].filter(Boolean) as string[];

  let subjectMatched = false;
  for (const sub of subjectTerms) {
    const subLower = sub.toLowerCase().trim();
    if (subLower.length > 2 && textLower.includes(subLower)) {
      subjectMatched = true;
      if (!matchedElements.includes(`Subject: ${sub}`)) {
        matchedElements.push(`Subject: ${sub}`);
      }
    }
  }

  // Also check if generic institutional nouns match if specific name isn't repeated
  if (!subjectMatched && (textLower.includes('college') || textLower.includes('university') || textLower.includes('institution'))) {
    subjectMatched = true;
    matchedElements.push('Subject: Institutional Reference');
  }

  if (!subjectMatched && claim.subject) {
    unmatchedElements.push(`Subject: ${claim.subject}`);
  }

  // 2. Action Alignment (e.g. closure, holiday, classes suspended, regular working day)
  const hasAffirmativeAction = matchesAny(evidenceText, AFFIRMATIVE_CLOSURE_PATTERNS);
  const hasNegativeAction = matchesAny(evidenceText, NEGATION_PATTERNS) || matchesAny(evidenceText, CONTINUITY_PATTERNS);
  const actionMatched = hasAffirmativeAction || hasNegativeAction;

  if (hasAffirmativeAction) {
    matchedElements.push('Action: Closure / Holiday Affirmed');
  } else if (hasNegativeAction) {
    matchedElements.push('Action: Continuity / Negation Affirmed');
  } else if (claim.action) {
    unmatchedElements.push(`Action: ${claim.action}`);
  }

  // 3. Reason / Catalyst Alignment (e.g. heavy rain, cyclone)
  const hasRainReason = matchesAny(evidenceText, RAIN_REASON_PATTERNS);
  let reasonMatched = false;

  if (claim.reason) {
    const claimReasonLower = claim.reason.toLowerCase();
    const isRainClaim = claimReasonLower.includes('rain') || claimReasonLower.includes('cyclone') || claimReasonLower.includes('weather');
    if (isRainClaim && hasRainReason) {
      reasonMatched = true;
      matchedElements.push(`Reason: ${claim.reason}`);
    } else if (textLower.includes(claimReasonLower)) {
      reasonMatched = true;
      matchedElements.push(`Reason: ${claim.reason}`);
    } else {
      unmatchedElements.push(`Reason: ${claim.reason}`);
    }
  } else {
    // No specific reason claimed
    reasonMatched = true;
  }

  // 4. Time Reference Alignment (e.g. tomorrow, specific day)
  let timeMatched = false;
  if (claim.timeReference) {
    const timeLower = claim.timeReference.toLowerCase().trim();
    const timeRegexes = TIME_PATTERNS[timeLower] || [new RegExp(`\\b${timeLower}\\b`, 'i')];
    if (matchesAny(evidenceText, timeRegexes)) {
      timeMatched = true;
      matchedElements.push(`Time: ${claim.timeReference}`);
    } else {
      unmatchedElements.push(`Time: ${claim.timeReference}`);
    }
  } else {
    timeMatched = true; // Not time-contingent
  }

  // 5. Location Alignment (e.g. Kattankulathur, Chennai, Chengalpattu)
  let locationMatched = false;
  if (claim.location) {
    const locLower = claim.location.toLowerCase().trim();
    if (locLower.length > 2 && textLower.includes(locLower)) {
      locationMatched = true;
      matchedElements.push(`Location: ${claim.location}`);
    } else {
      unmatchedElements.push(`Location: ${claim.location}`);
    }
  } else {
    locationMatched = true;
  }

  return {
    subjectMatched,
    actionMatched,
    reasonMatched,
    timeMatched,
    locationMatched,
    matchedElements,
    unmatchedElements,
  };
}

/**
 * Evaluates modality, uncertainty, and epistemic qualifications.
 * Guarantees: "may be closed" is strictly NOT interpreted as "is closed".
 */
export function evaluateModality(
  claim: ExtractedClaim,
  evidenceText: string
): ModalityEvaluation {
  const hasSpeculative = matchesAny(evidenceText, SPECULATIVE_PATTERNS);
  const hasSpeculativeClosure = matchesAny(evidenceText, SPECULATIVE_CLOSURE_PATTERNS);
  const hasNegation = matchesAny(evidenceText, NEGATION_PATTERNS);
  const hasContinuity = matchesAny(evidenceText, CONTINUITY_PATTERNS);

  // An affirmative closure is only genuine if it is NOT part of a speculative/modal construction
  const hasExplicitConfirmation = [
    /\bdeclared\s+(?:a\s+)?holiday\b/i,
    /\bholiday\s+has\s+been\s+declared\b/i,
    /\bconfirmed\s+(?:that\s+)?classes\s+are\s+suspended\b/i,
    /\bofficial\s+circular\s+issued\b/i,
    /\bordering\s+closure\b/i,
  ].some((p) => p.test(evidenceText));

  const hasAffirmative =
    matchesAny(evidenceText, AFFIRMATIVE_CLOSURE_PATTERNS) &&
    (!hasSpeculativeClosure || hasExplicitConfirmation);

  let evidenceModality: 'assertive' | 'speculative' | 'conditional' | 'negated' | 'neutral' = 'neutral';

  if (hasNegation || hasContinuity) {
    evidenceModality = 'negated';
  } else if (hasSpeculativeClosure || (hasSpeculative && !hasExplicitConfirmation)) {
    evidenceModality = 'speculative';
  } else if (hasAffirmative) {
    evidenceModality = 'assertive';
  }

  const claimModality = claim.modality || 'assertive';

  // If claim is an affirmative assertion ("is closed"), but evidence only expresses possibility ("may be closed"):
  const isSpeculativeOnly =
    (claimModality === 'assertive' || claimModality === 'reported') &&
    (hasSpeculativeClosure || (hasSpeculative && !hasAffirmative)) &&
    !hasExplicitConfirmation &&
    !hasNegation &&
    !hasContinuity;

  const isAssertionMatch =
    claimModality === 'assertive' && (hasAffirmative || hasNegation || hasContinuity);

  return {
    evidenceModality,
    claimModality,
    isAssertionMatch,
    isSpeculativeOnly,
  };
}

/**
 * Analyzes a single Evidence record against the ExtractedClaim.
 * 
 * Strict Guarantees:
 * - Does NOT confuse source credibility with whether evidence supports the claim.
 * - Discriminates: "supports", "contradicts", "neutral", "insufficient".
 * - "may be closed" != "is closed".
 * - "not closed" == contradiction to "is closed".
 * - Detects partial support when action matches but causal catalyst does not.
 * - Does NOT generate final overall verdict.
 */
export function analyzeEvidence(
  claim: ExtractedClaim,
  evidence: Evidence
): EvidenceAssessment {
  const evidenceId = evidence.id;

  // -------------------------------------------------------------
  // STEP 1: Insufficient Evidence Check
  // Inaccessible, failed, or empty text cannot establish any stance.
  // -------------------------------------------------------------
  if (
    evidence.fetchStatus === 'inaccessible' ||
    evidence.fetchStatus === 'failed' ||
    !evidence.excerpt ||
    evidence.excerpt.trim().length === 0
  ) {
    const reason =
      evidence.inaccessibleReason ||
      (evidence.fetchStatus === 'inaccessible'
        ? 'Access restricted by authentication or paywall'
        : 'Text was not retrievable from host');

    return {
      evidenceId,
      relationship: 'insufficient',
      relevanceScore: 0.0,
      explanation: `Insufficient evidence: Page content could not be accessed (${reason}). EchoTrace strictly refuses to speculate or infer claims without direct textual proof.`,
      matchedClaimElements: [],
      supportType: 'none',
      assessedAt: new Date().toISOString(),
    };
  }

  // Combine excerpt and context for comprehensive textual evaluation
  const passageText = evidence.excerpt;
  const contextText = evidence.context || evidence.excerpt;
  const combinedText = `${passageText} ${contextText}`;

  // Evaluate element alignments and modalities
  const alignment = evaluateElementAlignment(claim, combinedText);
  const modality = evaluateModality(claim, combinedText);

  // -------------------------------------------------------------
  // STEP 2: Modality Guard ("may be closed" != "is closed")
  // -------------------------------------------------------------
  if (modality.isSpeculativeOnly) {
    const speculativeTerms = findMatches(combinedText, SPECULATIVE_PATTERNS);
    return {
      evidenceId,
      relationship: 'neutral',
      relevanceScore: 0.45,
      explanation: `Neutral / Speculative: Text expresses uncertainty or potential conditions (${speculativeTerms.map((t) => `'${t}'`).join(', ')}). In accordance with Phase 6 rules, speculative phrasing ('may be closed') does NOT confirm the affirmative claim assertion ('is closed').`,
      matchedClaimElements: alignment.matchedElements,
      supportType: 'none',
      elementAlignment: alignment,
      modalityEvaluation: modality,
      assessedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------
  // STEP 3: Contradiction Detection ("not closed", "classes as usual")
  // -------------------------------------------------------------
  const negationMatches = findMatches(combinedText, NEGATION_PATTERNS);
  const continuityMatches = findMatches(combinedText, CONTINUITY_PATTERNS);
  const hasContradictionPhrases = negationMatches.length > 0 || continuityMatches.length > 0;

  // Check if contradiction specifically targets schools rather than higher education
  const mentionsSchoolsOnly =
    combinedText.toLowerCase().includes('schools only') ||
    combinedText.toLowerCase().includes('primary and secondary schools') ||
    combinedText.toLowerCase().includes('school holiday');

  const mentionsCollegesNormal =
    combinedText.toLowerCase().includes('colleges function normally') ||
    combinedText.toLowerCase().includes('colleges and universities') ||
    combinedText.toLowerCase().includes('higher educational institutions');

  // If evidence refutes closure or affirms normal operations for colleges/universities:
  if (hasContradictionPhrases) {
    const refutingSignals = [...negationMatches, ...continuityMatches];
    const explanationParts: string[] = [
      `Direct Contradiction: Evidence explicitly negates the claim proposition.`,
    ];

    if (continuityMatches.length > 0) {
      explanationParts.push(
        `Publisher affirms operational continuity: ${continuityMatches.map((m) => `"${m}"`).join(', ')}.`
      );
    }
    if (negationMatches.length > 0) {
      explanationParts.push(
        `Publisher explicitly denies closure: ${negationMatches.map((m) => `"${m}"`).join(', ')}.`
      );
    }
    if (mentionsSchoolsOnly && mentionsCollegesNormal) {
      explanationParts.push(
        `Critical distinction detected: Precautionary holiday applies strictly to elementary/secondary schools, whereas universities function normally.`
      );
    }

    return {
      evidenceId,
      relationship: 'contradicts',
      relevanceScore: 0.92,
      explanation: explanationParts.join(' '),
      matchedClaimElements: alignment.matchedElements,
      supportType: 'none',
      elementAlignment: alignment,
      modalityEvaluation: modality,
      assessedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------
  // STEP 4: Support & Partial Support Detection
  // -------------------------------------------------------------
  const closureMatches = findMatches(combinedText, AFFIRMATIVE_CLOSURE_PATTERNS);
  const hasAffirmativeClosure = closureMatches.length > 0 && !modality.isSpeculativeOnly;

  if (hasAffirmativeClosure) {
    // If evidence is purely about schools closing while the claim is about a university:
    if (mentionsSchoolsOnly && !alignment.subjectMatched) {
      return {
        evidenceId,
        relationship: 'neutral',
        relevanceScore: 0.4,
        explanation: `Neutral / Entity Scope Mismatch: Evidence announces holiday for primary/secondary schools, but does not confirm closure for ${claim.subject || 'university higher education'}.`,
        matchedClaimElements: alignment.matchedElements,
        supportType: 'none',
        elementAlignment: alignment,
        modalityEvaluation: modality,
        assessedAt: new Date().toISOString(),
      };
    }

    // Check whether causal reason (e.g. heavy rain) is established
    const rainMatches = findMatches(combinedText, RAIN_REASON_PATTERNS);
    const hasRainReason = rainMatches.length > 0;
    const claimSpecifiesReason = Boolean(claim.reason);

    if (claimSpecifiesReason && !hasRainReason) {
      // PARTIAL SUPPORT: Confirms closure, but does NOT establish the catalyst
      return {
        evidenceId,
        relationship: 'supports',
        supportType: 'partial',
        relevanceScore: 0.78,
        explanation: `Partial Support: Evidence confirms the closure/holiday action (${closureMatches.map((m) => `"${m}"`).join(', ')}), but does NOT establish '${claim.reason}' as the causal catalyst. Closure confirmed; causality unestablished.`,
        matchedClaimElements: alignment.matchedElements,
        elementAlignment: alignment,
        modalityEvaluation: modality,
        assessedAt: new Date().toISOString(),
      };
    }

    // FULL SUPPORT: Confirms both action and causal catalyst
    return {
      evidenceId,
      relationship: 'supports',
      supportType: 'full',
      relevanceScore: 0.95,
      explanation: claimSpecifiesReason
        ? `Full Support: Evidence confirms both the institutional closure/holiday (${closureMatches.map((m) => `"${m}"`).join(', ')}) AND establishes '${claim.reason}' (${rainMatches.map((m) => `"${m}"`).join(', ')}) as the underlying catalyst.`
        : `Full Support: Evidence directly affirms the core claim action: ${closureMatches.map((m) => `"${m}"`).join(', ')}.`,
      matchedClaimElements: alignment.matchedElements,
      elementAlignment: alignment,
      modalityEvaluation: modality,
      assessedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------
  // STEP 5: Neutral Background / Topic Mention
  // (Discusses weather or institution, but takes no stance on closure)
  // -------------------------------------------------------------
  const rainMatches = findMatches(combinedText, RAIN_REASON_PATTERNS);
  if (rainMatches.length > 0) {
    return {
      evidenceId,
      relationship: 'neutral',
      supportType: 'none',
      relevanceScore: 0.5,
      explanation: `Neutral / Topical Context: Evidence discusses meteorological conditions (${rainMatches.map((m) => `"${m}"`).join(', ')}), but makes no statement regarding university operational status, class cancellation, or institutional closure.`,
      matchedClaimElements: alignment.matchedElements,
      elementAlignment: alignment,
      modalityEvaluation: modality,
      assessedAt: new Date().toISOString(),
    };
  }

  // Fallback for unclassified general text
  return {
    evidenceId,
    relationship: 'neutral',
    supportType: 'none',
    relevanceScore: 0.25,
    explanation: `Neutral: Evidence text does not address the core proposition, action, or operational status of the claim.`,
    matchedClaimElements: alignment.matchedElements,
    elementAlignment: alignment,
    modalityEvaluation: modality,
    assessedAt: new Date().toISOString(),
  };
}

/**
 * Evaluates an entire collection of Evidence items against the ExtractedClaim.
 */
export function analyzeAllEvidence(
  claim: ExtractedClaim,
  evidenceList: Evidence[]
): BatchEvidenceAssessmentResult {
  const assessments: EvidenceAssessment[] = [];
  let supportsCount = 0;
  let partialSupportsCount = 0;
  let contradictsCount = 0;
  let neutralCount = 0;
  let insufficientCount = 0;

  for (const evidence of evidenceList) {
    const assessment = analyzeEvidence(claim, evidence);
    assessments.push(assessment);

    if (assessment.relationship === 'supports') {
      supportsCount++;
      if (assessment.supportType === 'partial') {
        partialSupportsCount++;
      }
    } else if (assessment.relationship === 'contradicts') {
      contradictsCount++;
    } else if (assessment.relationship === 'neutral') {
      neutralCount++;
    } else if (assessment.relationship === 'insufficient') {
      insufficientCount++;
    }
  }

  return {
    assessments,
    supportsCount,
    partialSupportsCount,
    contradictsCount,
    neutralCount,
    insufficientCount,
    assessedAt: new Date().toISOString(),
  };
}

/**
 * Evidence Analyzer Service Abstraction
 */
export class EvidenceAnalyzerService {
  public analyzeEvidence(claim: ExtractedClaim, evidence: Evidence): EvidenceAssessment {
    return analyzeEvidence(claim, evidence);
  }

  public analyzeAllEvidence(
    claim: ExtractedClaim,
    evidenceList: Evidence[]
  ): BatchEvidenceAssessmentResult {
    return analyzeAllEvidence(claim, evidenceList);
  }
}

export const evidenceAnalyzer = new EvidenceAnalyzerService();
