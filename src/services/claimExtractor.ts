import {
  ExtractedClaim,
  ClaimExtractionResult,
  ClaimModality,
  IClaimExtractor,
} from '../types/claimExtraction';

// Stopwords excluded from keywords
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'someone', 'said', 'people', 'saying', 'heard', 'hearing', 'rumor',
  'rumors', 'anyone', 'please', 'alert', 'urgent', 'notice'
]);

// Known Named Entities
const KNOWN_ENTITIES: { name: string; aliases: RegExp }[] = [
  { name: 'SRM College', aliases: /\b(srm\s+college|srm\s+university|srmist|srm|college\s+x)\b/i },
  { name: 'TCS', aliases: /\b(tcs|tata\s+consultancy\s+services)\b/i },
  { name: 'Controller of Examinations', aliases: /\b(controller\s+of\s+examinations|coe)\b/i },
  { name: 'Office of the Registrar', aliases: /\b(office\s+of\s+the\s+registrar|registrar|academic\s+affairs)\b/i },
  { name: 'Milan Cultural Fest', aliases: /\b(milan\s+cultural\s+fest|milan\s+2026|milan\s+fest|cultural\s+fest)\b/i },
  { name: 'Transport Department', aliases: /\b(transport\s+department|transport\s+office|bus\s+fleet|college\s+buses)\b/i },
  { name: 'Placement Office', aliases: /\b(placement\s+office|placement\s+cell|campus\s+placements)\b/i },
  { name: 'Kattankulathur Campus', aliases: /\b(kattankulathur|ktr|chennai\s+campus)\b/i },
];

/**
 * Standard Rule-Based / Heuristic Claim Extractor.
 * Implements deterministic semantic parsing of propositional assertions.
 */
export class RuleBasedClaimExtractor implements IClaimExtractor {
  public extract(
    rawInput: string,
    inputId?: string,
    platform?: string
  ): ClaimExtractionResult {
    const cleanRaw = rawInput.trim();
    const effectiveInputId = inputId || `inv-${Date.now()}`;
    const dateIso = new Date().toISOString();

    // Check if input represents a web URL
    const isUrl = /^(https?:\/\/|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/)/i.test(cleanRaw);

    if (isUrl) {
      return this.extractFromUrl(cleanRaw, effectiveInputId, dateIso);
    }

    // Check for multiple distinct clauses/claims
    const clauses = this.splitClauses(cleanRaw);

    if (clauses.length > 1) {
      const detectedClaims = clauses.map((clause, idx) =>
        this.extractSingleProposition(clause, cleanRaw, `${effectiveInputId}-c${idx + 1}`, dateIso, platform)
      );

      return {
        inputId: effectiveInputId,
        originalInput: cleanRaw,
        primaryClaim: detectedClaims[0],
        detectedClaims,
        hasMultipleClaims: true,
        hasAmbiguity: detectedClaims.some((c) => c.isAmbiguous),
        ambiguityReason: detectedClaims.some((c) => c.isAmbiguous)
          ? 'Multiple compound claims detected; at least one claim contains modal uncertainty.'
          : 'Multiple discrete claims detected in a single submission.',
        extractedAt: dateIso,
        extractionMethod: 'rule-based',
      };
    }

    // Single assertion
    const primaryClaim = this.extractSingleProposition(
      cleanRaw,
      cleanRaw,
      `${effectiveInputId}-c1`,
      dateIso,
      platform
    );

    return {
      inputId: effectiveInputId,
      originalInput: cleanRaw,
      primaryClaim,
      detectedClaims: [primaryClaim],
      hasMultipleClaims: false,
      hasAmbiguity: primaryClaim.isAmbiguous,
      ambiguityReason: primaryClaim.ambiguityNotes,
      extractedAt: dateIso,
      extractionMethod: 'rule-based',
    };
  }

  /**
   * Splits compound sentences containing multiple independent assertion clauses.
   */
  private splitClauses(input: string): string[] {
    // Look for coordinators that join two clauses with subject-like nouns and verbs
    const splitRegex = /\s+(?:and\s+the|and\s+also|;\s*|,\s*while\s+|,?\s*additionally\s+|,?\s*furthermore\s+)\s+/i;
    const parts = input.split(splitRegex).map((p) => p.trim()).filter((p) => p.length > 10);

    // Only consider multiple claims if at least two parts have verb-like action markers
    if (parts.length >= 2) {
      const actionPattern = /\b(closed|postponed|cancelled|deferred|suspended|operating|delay|strike|freeze)\b/i;
      const validClauses = parts.filter((p) => actionPattern.test(p));
      if (validClauses.length >= 2) {
        return validClauses;
      }
    }

    return [input];
  }

  /**
   * Extracts a single structured proposition from a text segment.
   */
  private extractSingleProposition(
    clause: string,
    originalInput: string,
    id: string,
    extractedAt: string,
    platform?: string
  ): ExtractedClaim {
    // 1. Detect Modality & Epistemic Uncertainty
    const { modality, isAmbiguous, ambiguityNotes } = this.detectModality(clause);

    // 2. Strip conversational framing while preserving modal verbs
    const propositionCore = this.cleanPropositionCore(clause);

    // 3. Extract Subject
    const subject = this.extractSubject(propositionCore);

    // 4. Extract Action / Predicate
    const action = this.extractAction(propositionCore);

    // 5. Extract Time Reference
    const timeReference = this.extractTimeReference(propositionCore);

    // 6. Extract Reason
    const reason = this.extractReason(propositionCore);

    // 7. Extract Location
    const location = this.extractLocation(propositionCore);

    // 8. Extract Object
    const object = this.extractObject(propositionCore, subject, action);

    // 9. Extract Named Entities
    const entities = this.extractEntities(propositionCore);

    // 10. Extract High-Entropy Keywords
    const keywords = this.extractKeywords(propositionCore, [
      subject,
      action,
      timeReference,
      reason,
      location,
    ]);

    // Construct the canonical claim text
    const claimText = this.constructCanonicalClaimText(
      propositionCore,
      subject,
      action,
      timeReference,
      reason,
      modality
    );

    return {
      id,
      originalInput,
      claimText,
      subject,
      action,
      object,
      timeReference,
      location,
      reason,
      entities,
      keywords,
      extractedAt,
      modality,
      isAmbiguous,
      ambiguityNotes,
      verificationStatus: 'unverified',
      confidence: this.calculateExtractionConfidence(subject, action, keywords),
    };
  }

  /**
   * Detects epistemic modal qualifiers (e.g., "may", "might", "could", "reportedly").
   */
  private detectModality(text: string): {
    modality: ClaimModality;
    isAmbiguous: boolean;
    ambiguityNotes?: string;
  } {
    const lower = text.toLowerCase();

    // Speculative modal verbs
    const speculativeMatch = lower.match(/\b(may|might|could|possibly|probably|tentatively|speculated\s+to|allegedly)\b/i);
    if (speculativeMatch) {
      return {
        modality: 'speculative',
        isAmbiguous: true,
        ambiguityNotes: `Contains modal qualifier ('${speculativeMatch[1]}'). Proposition represents possibility, not a definitive assertion.`,
      };
    }

    // Interrogative / Question inquiry
    if (lower.startsWith('is it true') || lower.startsWith('can anyone confirm') || text.includes('?')) {
      return {
        modality: 'interrogative',
        isAmbiguous: true,
        ambiguityNotes: 'Framed as an inquiry or verification query rather than an affirmative fact claim.',
      };
    }

    // Attributed / Hearsay frame
    const reportedMatch = lower.match(/\b(someone\s+said|heard\s+that|claims\s+that|rumor\s+that|according\s+to|people\s+are\s+saying)\b/i);
    if (reportedMatch) {
      return {
        modality: 'reported',
        isAmbiguous: false,
        ambiguityNotes: `Attribution frame detected ('${reportedMatch[1]}'). Claim extracted from reported hearsay.`,
      };
    }

    // Conditional
    if (/\b(if\s+|unless\s+|provided\s+that)\b/i.test(lower)) {
      return {
        modality: 'conditional',
        isAmbiguous: true,
        ambiguityNotes: 'Conditional dependency detected. Verification depends on stated precondition.',
      };
    }

    // Standard affirmative declarative statement
    return {
      modality: 'assertive',
      isAmbiguous: false,
    };
  }

  /**
   * Strips attribution frames ("Someone said that...") but strictly preserves modal qualifiers ("may be").
   */
  private cleanPropositionCore(text: string): string {
    let clean = text.trim();

    // Strip social metadata tags and broadcast prefixes
    clean = clean.replace(/^(?:📢|🚨|⚠️|\[.*?\]|PSA:|Notice:)\s*/i, '');

    // Strip attribution prefixes
    clean = clean.replace(/^(?:someone\s+said\s+(?:that\s+)?|hearing\s+(?:rumors\s+)?(?:that\s+)?|i\s+heard\s+(?:that\s+)?|people\s+are\s+saying\s+(?:that\s+)?|alert:\s*|is\s+it\s+true\s+that\s+)/i, '');

    // Capitalize first letter
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    return clean;
  }

  /**
   * Identifies the primary grammatical subject or target entity.
   */
  private extractSubject(text: string): string {
    // Check known entity catalog first
    for (const item of KNOWN_ENTITIES) {
      if (item.aliases.test(text)) {
        return item.name;
      }
    }

    // Target noun phrase before verb
    const subjectMatch = text.match(/^(?:the\s+)?([A-Za-z0-9\s'-]+?)\s+(?:is|are|will|has|have|may|might|could|was|were)\b/i);
    if (subjectMatch && subjectMatch[1].trim().length > 1) {
      const candidate = subjectMatch[1].trim();
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }

    return 'Target Subject';
  }

  /**
   * Identifies the primary action / predicate.
   */
  private extractAction(text: string): string {
    const actionPatterns: { label: string; regex: RegExp }[] = [
      { label: 'closed', regex: /\b(closed|remain\s+closed|shut\s+down|suspending|suspended)\b/i },
      { label: 'postponed', regex: /\b(postponed|deferred|rescheduled|moved\s+to\s+monday|delayed)\b/i },
      { label: 'cancelled', regex: /\b(cancelled|called\s+off|withdrawn|scrapped|revoked)\b/i },
      { label: 'suspended', regex: /\b(not\s+operate|halted|suspended|tripped|offline)\b/i },
      { label: 'operational', regex: /\b(operational|continue|functioning|as\s+scheduled)\b/i },
    ];

    for (const item of actionPatterns) {
      if (item.regex.test(text)) {
        return item.label;
      }
    }

    // Fallback verb match
    const verbMatch = text.match(/\b(?:is|are|will\s+be|was)\s+([a-z]+ed)\b/i);
    if (verbMatch) {
      return verbMatch[1].toLowerCase();
    }

    return 'asserted';
  }

  /**
   * Extracts temporal references (e.g., "tomorrow", "Monday", "for 48 hours").
   */
  private extractTimeReference(text: string): string | undefined {
    const timeMatch = text.match(/\b(tomorrow\s+morning|tomorrow|tonight|today|yesterday|this\s+weekend|next\s+week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|for\s+\d+\s+hours|at\s+\d+:\d+\s*(?:am|pm)?)\b/i);
    return timeMatch ? timeMatch[1].toLowerCase() : undefined;
  }

  /**
   * Extracts causal reasons (e.g., "because of heavy rain", "due to hiring freeze").
   */
  private extractReason(text: string): string | undefined {
    const reasonMatch = text.match(/\b(?:because\s+of|due\s+to|owing\s+to|on\s+account\s+of|as\s+a\s+result\s+of)\s+([^.,;!?]+)/i);
    if (reasonMatch) {
      return reasonMatch[1].trim();
    }

    // Weather reason shorthand
    if (/\b(?:heavy\s+rain|weather\s+warnings|cyclone|power\s+outage|hiring\s+freeze|driver\s+strike)\b/i.test(text)) {
      const match = text.match(/\b(heavy\s+rain|weather\s+warnings|cyclone|power\s+outage|hiring\s+freeze|driver\s+strike)\b/i);
      return match ? match[1].toLowerCase() : undefined;
    }

    return undefined;
  }

  /**
   * Extracts location or campus markers.
   */
  private extractLocation(text: string): string | undefined {
    const locMatch = text.match(/\b(?:at|in|near)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
    if (locMatch && !STOP_WORDS.has(locMatch[1].toLowerCase())) {
      return locMatch[1];
    }

    if (/\bchennai\b/i.test(text)) return 'Chennai';
    if (/\bkattankulathur\b/i.test(text)) return 'Kattankulathur';

    return undefined;
  }

  /**
   * Extracts secondary object target if distinct from subject.
   */
  private extractObject(text: string, subject: string, action: string): string | undefined {
    if (action === 'closed' && !subject.toLowerCase().includes('campus')) {
      return 'campus operations';
    }
    if (action === 'postponed' && !subject.toLowerCase().includes('exam')) {
      return 'scheduled assessments';
    }
    if (action === 'cancelled' && subject.toLowerCase().includes('tcs')) {
      return 'campus recruitment drive';
    }
    return undefined;
  }

  /**
   * Extracts all recognized entities.
   */
  private extractEntities(text: string): string[] {
    const found: string[] = [];
    for (const item of KNOWN_ENTITIES) {
      if (item.aliases.test(text)) {
        found.push(item.name);
      }
    }
    return found.length > 0 ? Array.from(new Set(found)) : ['Unspecified Entity'];
  }

  /**
   * Extracts high-entropy query keywords for Phase 3 evidence search.
   */
  private extractKeywords(
    text: string,
    priors: (string | undefined)[]
  ): string[] {
    const keywords = new Set<string>();

    // Add valid priors directly
    for (const prior of priors) {
      if (prior && prior.length > 2 && !STOP_WORDS.has(prior.toLowerCase())) {
        keywords.add(prior.toLowerCase());
      }
    }

    // Tokenize text for keywords
    const tokens = text.toLowerCase().match(/\b[a-z0-9_-]{3,}\b/g) || [];
    for (const token of tokens) {
      if (!STOP_WORDS.has(token)) {
        keywords.add(token);
      }
    }

    return Array.from(keywords).slice(0, 8);
  }

  /**
   * Assembles the canonical, normalized claim text while preserving user uncertainty.
   */
  private constructCanonicalClaimText(
    propositionCore: string,
    subject: string,
    action: string,
    timeReference?: string,
    reason?: string,
    modality?: ClaimModality
  ): string {
    // If the proposition is already well formed, ensure the subject is clear
    if (propositionCore.toLowerCase().startsWith('srm is')) {
      return propositionCore.replace(/^srm is/i, 'SRM College is');
    }

    if (modality === 'speculative' && !propositionCore.includes('may') && !propositionCore.includes('might')) {
      return `${subject} may be ${action}${timeReference ? ` ${timeReference}` : ''}${reason ? ` because of ${reason}` : ''}.`;
    }

    return propositionCore.endsWith('.') ? propositionCore : `${propositionCore}.`;
  }

  /**
   * Calculates structural extraction completeness confidence (0 to 1).
   */
  private calculateExtractionConfidence(subject: string, action: string, keywords: string[]): number {
    let score = 0.5;
    if (subject && subject !== 'Target Subject') score += 0.25;
    if (action && action !== 'asserted') score += 0.15;
    if (keywords.length >= 3) score += 0.1;
    return Math.min(1.0, score);
  }

  /**
   * Specialized extractor for URL-based claims.
   */
  private extractFromUrl(
    url: string,
    inputId: string,
    extractedAt: string
  ): ClaimExtractionResult {
    let hostname = 'web';
    let pathTokens: string[] = [];

    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      hostname = parsed.hostname;
      pathTokens = parsed.pathname
        .split(/[/._-]+/)
        .filter((t) => t.length > 2 && !STOP_WORDS.has(t.toLowerCase()) && !/^\d+$/.test(t));
    } catch {
      // ignore
    }

    const isOfficial = hostname.includes('.edu') || hostname.includes('srmist.edu.in');
    const subject = isOfficial ? 'SRM Institutional Portal' : hostname;
    const action = pathTokens.some((t) => /circular|notice|advisory/i.test(t))
      ? 'published circular'
      : 'reported';

    const keywords = Array.from(new Set([hostname, ...pathTokens])).slice(0, 6);
    const claimText = `Notice from ${hostname}: ${pathTokens.slice(0, 4).join(' ')}`;

    const claim: ExtractedClaim = {
      id: `${inputId}-c1`,
      originalInput: url,
      claimText,
      subject,
      action,
      timeReference: undefined,
      entities: [hostname],
      keywords,
      extractedAt,
      modality: 'assertive',
      isAmbiguous: true,
      ambiguityNotes: 'URL slug claims represent document headings, not substantiated factual assertions.',
      verificationStatus: 'unverified',
      confidence: 0.65,
    };

    return {
      inputId,
      originalInput: url,
      primaryClaim: claim,
      detectedClaims: [claim],
      hasMultipleClaims: false,
      hasAmbiguity: true,
      ambiguityReason: 'Web URL submitted. Full document content scraping and fact extraction scheduled for Phase 3.',
      extractedAt,
      extractionMethod: 'rule-based',
    };
  }
}

/**
 * Service Boundary for Claim Extraction.
 * Enables dependency injection and plugging in future LLM-based extractors.
 */
class ClaimExtractionService {
  private activeExtractor: IClaimExtractor;

  constructor() {
    this.activeExtractor = new RuleBasedClaimExtractor();
  }

  /**
   * Set a custom extractor (e.g. Gemini LLM Extractor).
   */
  public setExtractor(extractor: IClaimExtractor) {
    this.activeExtractor = extractor;
  }

  /**
   * Extracts structured claims from raw input text or normalized input.
   */
  public extract(
    rawInput: string,
    inputId?: string,
    platform?: string
  ): ClaimExtractionResult {
    // If asynchronous in the future, can await Promise
    const res = this.activeExtractor.extract(rawInput, inputId, platform);
    return res as ClaimExtractionResult;
  }

  /**
   * Architecture Hook for Future AI/LLM Extraction (Gemini via @google/genai).
   * Defines the structured prompt contract for Phase 2 LLM migration.
   */
  public getAiPromptContract(rawInput: string) {
    return {
      systemInstruction: `You are an expert epistemic claim extraction engine. Deconstruct the user input into atomic propositions without altering uncertainty, without assuming truth, and without assigning credibility scores.`,
      schema: {
        type: 'OBJECT',
        properties: {
          claims: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                claimText: { type: 'STRING' },
                subject: { type: 'STRING' },
                action: { type: 'STRING' },
                object: { type: 'STRING' },
                timeReference: { type: 'STRING' },
                location: { type: 'STRING' },
                reason: { type: 'STRING' },
                modality: { type: 'STRING', enum: ['assertive', 'speculative', 'reported', 'conditional', 'interrogative'] },
                isAmbiguous: { type: 'BOOLEAN' },
                entities: { type: 'ARRAY', items: { type: 'STRING' } },
                keywords: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['claimText', 'modality', 'isAmbiguous', 'entities', 'keywords'],
            },
          },
        },
        required: ['claims'],
      },
      input: rawInput,
    };
  }
}

// Export singleton service instance
export const claimExtractor = new ClaimExtractionService();
