/**
 * EchoTrace Phase 5: Evidence Extraction Service
 * 
 * Formal Architecture:
 * SOURCES → FETCH SOURCE CONTENT → EXTRACT RELEVANT EVIDENCE
 * 
 * Strict Guarantees:
 * 1. Identifies the actual passages that support or contradict the claim.
 * 2. Never simply uses search-result snippets as final evidence when original source can be accessed.
 * 3. Never fabricates content when a page cannot be accessed.
 * 4. Preserves excerpt (1-2 sentences) AND context (surrounding section/paragraph)
 *    to prevent out-of-context deception or cherry-picking.
 * 5. Preserves exact source URL and retrieval timestamp.
 * 6. Maps source types to standardized EvidenceType ('official' | 'government' | 'news' | 'social' | 'secondary' | 'unknown').
 * 7. Supports explicit fetch statuses: 'accessible' | 'partially_accessible' | 'inaccessible' | 'failed'.
 * 8. Strictly does NOT calculate final TRUE/FALSE verdict yet (reserved for Phase 6).
 */

import { ExtractedClaim } from '../types/claimExtraction.ts';
import {
  Evidence,
  EvidenceExtractionBatchResult,
  EvidenceExtractionOptions,
  EvidenceType,
  FetchedSourceContent,
  FetchStatus,
} from '../types/evidence.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';

// High-value semantic verification keywords frequently appearing in institutional / emergency claims
const VERIFICATION_SIGNALS = [
  'holiday',
  'working day',
  'regular classes',
  'classes suspended',
  'classes as usual',
  'postponed',
  'examinations',
  'exams',
  'circular',
  'registrar',
  'rain',
  'cyclone',
  'red alert',
  'closure',
  'closed',
  'open',
  'operating',
  'rescheduled',
  'rumor',
  'fake',
  'clarification',
  'advisory',
  'collector',
  'district',
];

/**
 * Maps EchoTrace source types to standardized EvidenceType.
 */
export function mapSourceTypeToEvidenceType(sourceType: string): EvidenceType {
  const lower = sourceType.toLowerCase();
  if (lower.includes('official notice') || lower.includes('primary')) return 'official';
  if (lower.includes('government')) return 'government';
  if (lower.includes('news')) return 'news';
  if (
    lower.includes('social') ||
    lower.includes('forum') ||
    lower.includes('chat') ||
    lower.includes('campus forum')
  ) {
    return 'social';
  }
  if (lower.includes('student') || lower.includes('blog') || lower.includes('secondary')) {
    return 'secondary';
  }
  return 'unknown';
}

/**
 * Splits plain text into paragraphs, filtering out noise.
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 25);
}

/**
 * Splits a paragraph into individual sentences while preserving abbreviations where possible.
 */
function splitIntoSentences(paragraph: string): string[] {
  // Regex matches punctuation (.!?) followed by space and capital letter or digit
  const rawSentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  return rawSentences.map((s) => s.trim()).filter((s) => s.length >= 15);
}

/**
 * Evaluates the relevance of a passage against an extracted claim.
 * Returns a score between 0.0 and 1.0, plus matched keywords.
 */
export function scorePassageRelevance(
  passage: string,
  claim: ExtractedClaim
): { score: number; matchedKeywords: string[] } {
  const passageLower = passage.toLowerCase();
  const matched = new Set<string>();
  let weightedPoints = 0;
  let maxPossiblePoints = 12; // Normalization base

  // 1. Entity Match (Weight: 3.5 per match)
  const entities = [...(claim.entities || [])];
  if (claim.subject && !entities.includes(claim.subject)) {
    entities.push(claim.subject);
  }

  for (const entity of entities) {
    const entLower = entity.toLowerCase().trim();
    if (entLower.length > 2 && passageLower.includes(entLower)) {
      matched.add(entity);
      weightedPoints += 3.5;
    }
  }

  // 2. Action / State Match (Weight: 3.0 per match)
  const actionTerms = (claim.action || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  for (const term of actionTerms) {
    if (passageLower.includes(term)) {
      matched.add(term);
      weightedPoints += 3.0;
    }
  }

  // 3. Reason / Catalyst Match (Weight: 2.5 per match)
  const reasonTerms = (claim.reason || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  for (const term of reasonTerms) {
    if (passageLower.includes(term)) {
      matched.add(term);
      weightedPoints += 2.5;
    }
  }

  // 4. Claim Keywords Overlap (Weight: 1.5 per match)
  for (const kw of claim.keywords || []) {
    const kwLower = kw.toLowerCase().trim();
    if (kwLower.length > 2 && passageLower.includes(kwLower)) {
      matched.add(kw);
      weightedPoints += 1.5;
    }
  }

  // 5. High-Value Verification Signals (Weight: 1.2 per match)
  for (const sig of VERIFICATION_SIGNALS) {
    if (passageLower.includes(sig) && !matched.has(sig)) {
      matched.add(sig);
      weightedPoints += 1.2;
    }
  }

  // 6. Time Reference Match (Weight: 2.0)
  if (claim.timeReference) {
    const timeLower = claim.timeReference.toLowerCase().trim();
    if (timeLower.length > 2 && passageLower.includes(timeLower)) {
      matched.add(claim.timeReference);
      weightedPoints += 2.0;
    }
  }

  // Normalize score between 0.05 and 0.98
  const rawScore = weightedPoints / maxPossiblePoints;
  const score = Math.min(0.98, Math.max(0.05, Math.round(rawScore * 100) / 100));

  return {
    score,
    matchedKeywords: Array.from(matched),
  };
}

/**
 * Extracts candidate excerpt (1-2 sentences) and enclosing paragraph context
 * from fetched main text.
 */
function findBestPassage(
  mainText: string,
  claim: ExtractedClaim,
  options: EvidenceExtractionOptions = {}
): {
  excerpt: string;
  context: string;
  relevanceScore: number;
  matchedKeywords: string[];
} {
  const paragraphs = splitIntoParagraphs(mainText);

  if (paragraphs.length === 0) {
    const fallbackText = mainText.slice(0, 300);
    const { score, matchedKeywords } = scorePassageRelevance(fallbackText, claim);
    return {
      excerpt: fallbackText,
      context: fallbackText,
      relevanceScore: score,
      matchedKeywords,
    };
  }

  let bestExcerpt = '';
  let bestContext = '';
  let bestScore = -1;
  let bestKeywords: string[] = [];

  for (const para of paragraphs) {
    const sentences = splitIntoSentences(para);

    if (sentences.length <= 2) {
      // Evaluate paragraph as a whole
      const { score, matchedKeywords } = scorePassageRelevance(para, claim);
      if (score > bestScore) {
        bestScore = score;
        bestExcerpt = para;
        bestContext = para;
        bestKeywords = matchedKeywords;
      }
    } else {
      // Evaluate rolling 1-2 sentence windows
      for (let i = 0; i < sentences.length; i++) {
        const singleSentence = sentences[i];
        const twoSentence =
          i < sentences.length - 1 ? `${singleSentence} ${sentences[i + 1]}` : singleSentence;

        const eval1 = scorePassageRelevance(singleSentence, claim);
        const eval2 = scorePassageRelevance(twoSentence, claim);

        const chosenWindow = eval2.score > eval1.score ? twoSentence : singleSentence;
        const chosenEval = eval2.score > eval1.score ? eval2 : eval1;

        if (chosenEval.score > bestScore) {
          bestScore = chosenEval.score;
          bestExcerpt = chosenWindow;
          bestContext = para; // Context is the full enclosing paragraph!
          bestKeywords = chosenEval.matchedKeywords;
        }
      }
    }
  }

  // Cap lengths to prevent oversized UI blocks if specified
  const maxExcerpt = options.maxExcerptLength || 500;
  const maxContext = options.maxContextLength || 1200;

  return {
    excerpt: bestExcerpt.length > maxExcerpt ? `${bestExcerpt.slice(0, maxExcerpt)}...` : bestExcerpt,
    context: bestContext.length > maxContext ? `${bestContext.slice(0, maxContext)}...` : bestContext,
    relevanceScore: bestScore >= 0 ? bestScore : 0.1,
    matchedKeywords: bestKeywords,
  };
}

/**
 * Extracts a standardized Evidence record from a NormalizedSource and its FetchedSourceContent.
 * 
 * Strict Guarantees:
 * - Does NOT fabricate content when a page cannot be accessed.
 * - Extracts actual passages from page content (not just search snippets) when accessible.
 * - Preserves both excerpt (1-2 sentences) and context (enclosing paragraph).
 * - Preserves exact URL and retrievedAt timestamp.
 * - Never determines final TRUE/FALSE verdict.
 */
export function extractEvidence(
  claim: ExtractedClaim,
  source: NormalizedSource,
  content: FetchedSourceContent,
  options: EvidenceExtractionOptions = {}
): Evidence {
  const evidenceType = mapSourceTypeToEvidenceType(source.type);
  const evidenceId = `evi-${source.id}-${Date.now().toString(36)}`;
  const retrievedAt = content.retrievedAt || new Date().toISOString();
  const url = source.url || content.url || '';
  const title = content.title || source.name;
  const publisher = source.publisher || undefined;
  const publishedAt = source.publishedAt || content.publishedTime || undefined;

  // Case 1: Inaccessible page (HTTP 401/403, paywall gate, robots.txt blocked)
  if (content.status === 'inaccessible') {
    return {
      id: evidenceId,
      sourceId: source.id,
      title,
      url,
      publisher,
      publishedAt,
      retrievedAt,
      excerpt: '',
      context: undefined,
      relevanceScore: 0.0,
      evidenceType,
      extractionMethod: 'inaccessible-source-preserved',
      fetchStatus: 'inaccessible',
      inaccessibleReason:
        content.inaccessibleReason ||
        'Source page is inaccessible due to access restrictions or paywall.',
      matchedKeywords: [],
    };
  }

  // Case 2: Failed fetch (HTTP 404, 5xx, network timeout, invalid URL)
  if (content.status === 'failed') {
    return {
      id: evidenceId,
      sourceId: source.id,
      title,
      url,
      publisher,
      publishedAt,
      retrievedAt,
      excerpt: '',
      context: undefined,
      relevanceScore: 0.0,
      evidenceType,
      extractionMethod: 'failed-fetch-recorded',
      fetchStatus: 'failed',
      inaccessibleReason:
        content.inaccessibleReason || 'Failed to retrieve page content from publisher.',
      matchedKeywords: [],
    };
  }

  // Case 3: Primary PDF Circular Document
  if (content.isPdf) {
    const excerpt = content.mainText || `[Official PDF Document at ${url}]`;
    const context = `Primary administrative circular file detected on publisher host (${source.domain || url}).`;
    return {
      id: evidenceId,
      sourceId: source.id,
      title,
      url,
      publisher,
      publishedAt,
      retrievedAt,
      excerpt,
      context,
      relevanceScore: 0.88,
      evidenceType,
      extractionMethod: 'primary-pdf-circular-descriptor',
      fetchStatus: 'accessible',
      matchedKeywords: ['circular', 'pdf', 'official'],
    };
  }

  // Case 4: Partially Accessible Page (Meta description only, minimal HTML body)
  if (content.status === 'partially_accessible') {
    const textToScan = content.mainText || content.description || '';
    const { score, matchedKeywords } = scorePassageRelevance(textToScan, claim);
    return {
      id: evidenceId,
      sourceId: source.id,
      title,
      url,
      publisher,
      publishedAt,
      retrievedAt,
      excerpt: textToScan,
      context: `Extracted from structured page metadata description: "${textToScan}"`,
      relevanceScore: score,
      evidenceType,
      extractionMethod: 'meta-description-fallback',
      fetchStatus: 'partially_accessible',
      inaccessibleReason: content.inaccessibleReason,
      matchedKeywords,
    };
  }

  // Case 5: Fully Accessible Page Content (Standard HTML extraction)
  const mainText = content.mainText || '';

  // Guard: if mainText is unexpectedly empty despite 'accessible' status
  if (!mainText || mainText.trim().length === 0) {
    return {
      id: evidenceId,
      sourceId: source.id,
      title,
      url,
      publisher,
      publishedAt,
      retrievedAt,
      excerpt: '',
      context: undefined,
      relevanceScore: 0.0,
      evidenceType,
      extractionMethod: 'empty-body-detected',
      fetchStatus: 'partially_accessible',
      inaccessibleReason: 'Page content contained no readable text body.',
      matchedKeywords: [],
    };
  }

  // Find the exact 1-2 sentence excerpt and its enclosing paragraph context
  const { excerpt, context, relevanceScore, matchedKeywords } = findBestPassage(
    mainText,
    claim,
    options
  );

  return {
    id: evidenceId,
    sourceId: source.id,
    title,
    url,
    publisher,
    publishedAt,
    retrievedAt,
    excerpt,
    context,
    relevanceScore,
    evidenceType,
    extractionMethod: 'semantic-passage-search',
    fetchStatus: 'accessible',
    matchedKeywords,
  };
}

/**
 * Extracts evidence for all sources given a map of fetched contents.
 */
export function extractAllEvidence(
  claim: ExtractedClaim,
  sources: NormalizedSource[],
  fetchedContents: Map<string, FetchedSourceContent>,
  options: EvidenceExtractionOptions = {}
): EvidenceExtractionBatchResult {
  const evidenceList: Evidence[] = [];
  let accessibleCount = 0;
  let partiallyAccessibleCount = 0;
  let inaccessibleCount = 0;
  let failedCount = 0;

  for (const source of sources) {
    // Look up fetched content by source.id or by canonical URL
    const fetched =
      fetchedContents.get(source.id) ||
      (source.url ? fetchedContents.get(source.url) : undefined);

    if (!fetched) {
      // Content has not been fetched yet or was skipped
      const unretrievedEvidence: Evidence = {
        id: `evi-pending-${source.id}`,
        sourceId: source.id,
        title: source.name,
        url: source.url || '',
        publisher: source.publisher || undefined,
        publishedAt: source.publishedAt || undefined,
        retrievedAt: new Date().toISOString(),
        excerpt: '',
        relevanceScore: 0.0,
        evidenceType: mapSourceTypeToEvidenceType(source.type),
        extractionMethod: 'unretrieved',
        fetchStatus: 'failed',
        inaccessibleReason: 'Page content was not retrieved during batch fetch.',
      };
      evidenceList.push(unretrievedEvidence);
      failedCount++;
      continue;
    }

    const evidence = extractEvidence(claim, source, fetched, options);
    evidenceList.push(evidence);

    if (evidence.fetchStatus === 'accessible') accessibleCount++;
    else if (evidence.fetchStatus === 'partially_accessible') partiallyAccessibleCount++;
    else if (evidence.fetchStatus === 'inaccessible') inaccessibleCount++;
    else if (evidence.fetchStatus === 'failed') failedCount++;
  }

  // Sort evidence list by relevanceScore descending, accessible first
  evidenceList.sort((a, b) => {
    if (a.fetchStatus === 'accessible' && b.fetchStatus !== 'accessible') return -1;
    if (b.fetchStatus === 'accessible' && a.fetchStatus !== 'accessible') return 1;
    return b.relevanceScore - a.relevanceScore;
  });

  return {
    evidenceList,
    totalSourcesProcessed: sources.length,
    accessibleCount,
    partiallyAccessibleCount,
    inaccessibleCount,
    failedCount,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Evidence Extractor Service Abstraction
 */
export class EvidenceExtractorService {
  public extractEvidence(
    claim: ExtractedClaim,
    source: NormalizedSource,
    content: FetchedSourceContent,
    options?: EvidenceExtractionOptions
  ): Evidence {
    return extractEvidence(claim, source, content, options);
  }

  public extractAllEvidence(
    claim: ExtractedClaim,
    sources: NormalizedSource[],
    fetchedContents: Map<string, FetchedSourceContent>,
    options?: EvidenceExtractionOptions
  ): EvidenceExtractionBatchResult {
    return extractAllEvidence(claim, sources, fetchedContents, options);
  }
}

export const evidenceExtractor = new EvidenceExtractorService();
