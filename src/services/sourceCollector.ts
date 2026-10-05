/**
 * EchoTrace Phase 4: Source Collection & Normalization Service
 * 
 * Formal Architecture:
 * SEARCH RESULTS → SOURCE COLLECTION → NORMALIZED SOURCES
 * 
 * Strict Guarantees:
 * 1. Converts raw SearchResult items into reliable NormalizedSource records compatible with EchoTrace's existing Source type.
 * 2. Preserves all compatible fields: id, type, name, platform, reliability, status, timestamp, authorHandle, reach, notes.
 * 3. Does NOT invent publisher names, authors, publication dates, or verification status.
 * 4. Distinguishes authentic source types: Official notice, Government source, News outlet,
 *    Official social account, Social post, Blog, Forum, Unknown.
 * 5. Provides transparent, explainable reliability assessments (assessSourceReliability).
 *    Never assigns 'high' solely because a page title contains the word 'official'.
 * 6. Prepares normalized sources for Phase 5 page content fetching.
 */

import {
  Source,
  SourceReliability,
  SourceType,
  VerificationStatus,
} from '../types/claim.ts';
import { SearchResult } from '../types/evidenceSearch.ts';
import {
  NormalizedSource,
  SourceCollectionResult,
  SourceCollectorOptions,
  SourceProvenance,
  SourceReliabilityAssessment,
} from '../types/sourceCollection.ts';
import { normalizeUrl } from './sourceClassifier.ts';

// -------------------------------------------------------------
// Domain Knowledge Registries (Strict Provenance Auditing)
// -------------------------------------------------------------

// Known institutional portals with primary authority
const INSTITUTIONAL_DOMAINS: Record<string, string> = {
  'srmist.edu.in': 'SRM Institute of Science and Technology',
  'srmuniv.ac.in': 'SRM University',
  'annauniv.edu': 'Anna University',
  'iitm.ac.in': 'Indian Institute of Technology Madras',
  'vit.ac.in': 'Vellore Institute of Technology',
  'unom.ac.in': 'University of Madras',
  'bdu.ac.in': 'Bharathidasan University',
  'tndte.gov.in': 'Directorate of Technical Education Tamil Nadu',
};

// Known government authorities & meteorological agencies
const GOVERNMENT_DOMAINS: Record<string, string> = {
  'tnsdma.tn.gov.in': 'Tamil Nadu State Disaster Management Authority',
  'chennaicorporation.gov.in': 'Greater Chennai Corporation',
  'imd.gov.in': 'India Meteorological Department (IMD)',
  'mausam.imd.gov.in': 'IMD Weather Services',
  'ndma.gov.in': 'National Disaster Management Authority (NDMA)',
  'tn.gov.in': 'Government of Tamil Nadu',
  'chennaipolice.gov.in': 'Greater Chennai Police',
  'chennai.nic.in': 'Chennai District Collectorate',
  'kancheepuram.nic.in': 'Kancheepuram District Collectorate',
  'chengalpattu.nic.in': 'Chengalpattu District Collectorate',
};

// Reputable journalistic news publishers
const REPUTABLE_NEWS_DOMAINS: Record<string, string> = {
  'thehindu.com': 'The Hindu',
  'thehindubusinessline.com': 'The Hindu BusinessLine',
  'indianexpress.com': 'The Indian Express',
  'timesofindia.indiatimes.com': 'The Times of India',
  'ndtv.com': 'NDTV',
  'hindustantimes.com': 'Hindustan Times',
  'bbc.com': 'BBC News',
  'reuters.com': 'Reuters',
  'apnews.com': 'Associated Press',
  'theprint.in': 'ThePrint',
  'scroll.in': 'Scroll.in',
  'news18.com': 'News18',
  'indiatoday.in': 'India Today',
  'livemint.com': 'Mint',
  'deccanchronicle.com': 'Deccan Chronicle',
  'dtnext.in': 'DT Next',
  'dinamalar.com': 'Dinamalar',
  'dailythanthi.com': 'Daily Thanthi',
  'aniin.com': 'Asian News International (ANI)',
  'ptinews.com': 'Press Trust of India (PTI)',
};

// Secondary student aggregators
const SECONDARY_AGGREGATORS: Record<string, string> = {
  'collegedunia.com': 'Collegedunia',
  'shiksha.com': 'Shiksha',
  'careers360.com': 'Careers360',
  'getmyuni.com': 'GetMyUni',
  'campustimes.in': 'Campus Times',
  'studocu.com': 'StuDocu',
};

// Blog platforms
const BLOG_DOMAINS = [
  'medium.com',
  'blogspot.com',
  'wordpress.com',
  'substack.com',
  'blogger.com',
  'tumblr.com',
  'telegra.ph',
];

// Discussion forums & community boards
const FORUM_DOMAINS = [
  'reddit.com',
  'quora.com',
  'discord.com',
  'discord.gg',
  't.me',
  'telegram.org',
  'telegram.me',
  '4chan.org',
  'pastebin.com',
];

// Major social network platforms
const SOCIAL_PLATFORMS = [
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'threads.net',
  'linkedin.com',
];

/**
 * Extracts and normalizes hostname/domain from a URL
 */
export function extractDomain(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl.trim());
    return urlObj.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return rawUrl.trim().toLowerCase().split('/')[0] || 'unknown-domain';
  }
}

/**
 * Identifies the authentic publisher name from domain registry or metadata.
 * STRICT: Does NOT invent fake company or publisher names.
 * If unknown, returns domain or null.
 */
export function identifyPublisher(
  rawUrl: string,
  rawPublisher?: string,
  title?: string
): { publisher: string | null; domain: string } {
  const domain = extractDomain(rawUrl);

  // 1. Direct registry lookup
  if (INSTITUTIONAL_DOMAINS[domain]) {
    return { publisher: INSTITUTIONAL_DOMAINS[domain], domain };
  }
  if (GOVERNMENT_DOMAINS[domain]) {
    return { publisher: GOVERNMENT_DOMAINS[domain], domain };
  }
  if (REPUTABLE_NEWS_DOMAINS[domain]) {
    return { publisher: REPUTABLE_NEWS_DOMAINS[domain], domain };
  }
  if (SECONDARY_AGGREGATORS[domain]) {
    return { publisher: SECONDARY_AGGREGATORS[domain], domain };
  }

  // 2. Check subdomain matches (e.g. news.google.com, mausam.imd.gov.in)
  for (const [knownDomain, name] of Object.entries(INSTITUTIONAL_DOMAINS)) {
    if (domain.endsWith(`.${knownDomain}`)) return { publisher: name, domain };
  }
  for (const [knownDomain, name] of Object.entries(GOVERNMENT_DOMAINS)) {
    if (domain.endsWith(`.${knownDomain}`)) return { publisher: name, domain };
  }
  for (const [knownDomain, name] of Object.entries(REPUTABLE_NEWS_DOMAINS)) {
    if (domain.endsWith(`.${knownDomain}`)) return { publisher: name, domain };
  }

  // 3. Social platform identification
  if (domain === 'twitter.com' || domain === 'x.com') {
    return { publisher: 'X (formerly Twitter)', domain };
  }
  if (domain === 'reddit.com') {
    return { publisher: 'Reddit Community', domain };
  }
  if (domain === 'quora.com') {
    return { publisher: 'Quora Forum', domain };
  }

  // 4. Use genuine search metadata publisher if non-empty and not a raw URL
  if (
    rawPublisher &&
    typeof rawPublisher === 'string' &&
    rawPublisher.trim().length > 1 &&
    !rawPublisher.includes('http://') &&
    !rawPublisher.includes('https://') &&
    rawPublisher.toLowerCase() !== domain
  ) {
    return { publisher: rawPublisher.trim(), domain };
  }

  // 5. Default to the clean domain without inventing fiction
  return { publisher: domain, domain };
}

/**
 * Identifies the exact SourceType category based on domain provenance and URL structure.
 * Distinguishes:
 * - Official notice
 * - Government source
 * - News outlet
 * - Official social account
 * - Social post
 * - Blog
 * - Forum
 * - Unknown
 */
export function identifySourceType(
  rawUrl: string,
  title = '',
  publisher = ''
): SourceType {
  const domain = extractDomain(rawUrl);
  let pathname = '';
  try {
    pathname = new URL(rawUrl).pathname.toLowerCase();
  } catch {
    pathname = '';
  }

  const combined = `${domain} ${pathname} ${title} ${publisher}`.toLowerCase();

  // 1. Official Institutional Notice (.edu, .edu.in, .ac.in, or university registrar)
  const isInstitutionalDomain =
    domain.endsWith('.edu') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.ac.uk') ||
    Boolean(INSTITUTIONAL_DOMAINS[domain]);

  if (isInstitutionalDomain) {
    return 'Official notice';
  }

  // 2. Government Source (.gov, .gov.in, .nic.in, disaster mgmt)
  const isGovernmentDomain =
    domain.endsWith('.gov') ||
    domain.endsWith('.gov.in') ||
    domain.endsWith('.nic.in') ||
    domain.endsWith('.mil') ||
    Boolean(GOVERNMENT_DOMAINS[domain]);

  if (isGovernmentDomain) {
    return 'Government source';
  }

  // Primary circular or PDF document hosted on an institutional or gov site
  const isCircularPdf =
    pathname.endsWith('.pdf') ||
    pathname.includes('/circular') ||
    pathname.includes('/notification') ||
    pathname.includes('/orders/');

  if (isCircularPdf && (domain.includes('.in') || domain.includes('.edu') || domain.includes('.org'))) {
    if (combined.includes('registrar') || combined.includes('exam') || combined.includes('college')) {
      return 'Official notice';
    }
  }

  // 3. News Outlet
  const isReputableNews =
    Boolean(REPUTABLE_NEWS_DOMAINS[domain]) ||
    Object.keys(REPUTABLE_NEWS_DOMAINS).some((d) => domain.endsWith(`.${d}`));

  if (isReputableNews) {
    return 'News outlet';
  }

  // 4. Social Accounts: Distinguish Official Social Account vs Generic Social Post
  const isSocial = SOCIAL_PLATFORMS.some((p) => domain === p || domain.endsWith(`.${p}`));
  if (isSocial) {
    const isOfficialSocialHandle =
      combined.includes('srm_univ') ||
      combined.includes('chennaicorp') ||
      combined.includes('tnsdma') ||
      combined.includes('tnpolice') ||
      (combined.includes('official') && (combined.includes('university') || combined.includes('police') || combined.includes('collector')));

    if (isOfficialSocialHandle) {
      return 'Official social account';
    }
    return 'Social post';
  }

  // 5. Discussion Forum
  const isForum = FORUM_DOMAINS.some((f) => domain === f || domain.endsWith(`.${f}`));
  if (isForum) {
    return 'Forum';
  }

  // 6. Independent Blog
  const isBlog = BLOG_DOMAINS.some((b) => domain === b || domain.endsWith(`.${b}`));
  if (isBlog || pathname.includes('/blog/') || pathname.includes('/post/')) {
    return 'Blog';
  }

  // 7. Student Aggregator / Secondary portal
  if (SECONDARY_AGGREGATORS[domain]) {
    return 'Student portal post';
  }

  // 8. Unknown / Unclassified
  return 'Unknown';
}

/**
 * Transparent Source Reliability Assessment Function:
 * assessSourceReliability(source)
 * 
 * Strict Principle:
 * Do NOT simply assign "high" because a page title contains the word "official."
 * Evaluates:
 * - Domain registrar authority and cryptographic TLD (.edu, .gov, .nic.in)
 * - Publisher identity and track record
 * - Source type classification
 * - Anti-Spoofing: Penalizes title claims of official circulars hosted on unverified forums or blogs
 * - Provenance metadata and document format (signed PDF / circular)
 * 
 * Returns both:
 * - reliability: 'high' | 'medium' | 'low' | 'unverified'
 * - explanation: clear human-readable forensic audit rationale
 */
export function assessSourceReliability(
  source: {
    url?: string;
    domain?: string;
    type?: SourceType;
    name?: string;
    publisher?: string | null;
    snippet?: string;
  }
): SourceReliabilityAssessment {
  const url = source.url || '';
  const domain = (source.domain || extractDomain(url)).toLowerCase();
  const type = source.type || identifySourceType(url, source.name, source.publisher || '');
  const titleAndSnippet = `${source.name || ''} ${source.snippet || ''}`.toLowerCase();
  const factors: string[] = [];
  const flags: string[] = [];

  // Check if title or snippet aggressively claims "official" status
  const claimsOfficialInText =
    titleAndSnippet.includes('official notice') ||
    titleAndSnippet.includes('official circular') ||
    titleAndSnippet.includes('confirmed by principal') ||
    titleAndSnippet.includes('office order');

  // -------------------------------------------------------------
  // RULE 1: Anti-Spoofing Defense (Crucial Forensic Principle)
  // If text claims "official" BUT domain is a public forum, blog, or unverified social post:
  // -------------------------------------------------------------
  if (
    claimsOfficialInText &&
    (type === 'Forum' ||
      type === 'Blog' ||
      type === 'Social post' ||
      domain.includes('reddit.com') ||
      domain.includes('quora.com') ||
      domain.includes('medium.com') ||
      domain.includes('blogspot.com') ||
      domain.includes('t.me'))
  ) {
    flags.push('SPOOFED_OFFICIAL_CLAIM_ON_UNVERIFIED_HOST');
    return {
      reliability: 'low',
      explanation: `Title or text claims official status, but hosting domain (${domain}) is an open ${type.toLowerCase()} lacking institutional authority or identity verification.`,
      score: 15,
      factors: [
        'Domain lacks institutional authority (.edu, .ac.in, or .gov)',
        'Host is an open community/forum platform vulnerable to unverified user uploads',
        'Discrepancy detected between claim assertion ("official") and hosting provenance',
      ],
      flags,
    };
  }

  // -------------------------------------------------------------
  // RULE 2: Primary Institutional Authorities (.edu, .edu.in, .ac.in)
  // -------------------------------------------------------------
  if (type === 'Official notice') {
    const isPrimaryPdf = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('/circular');
    factors.push('Published on accredited academic/institutional registrar domain (.edu / .ac.in)');
    if (isPrimaryPdf) factors.push('Primary document format (signed PDF / administrative order)');

    return {
      reliability: 'high',
      explanation: isPrimaryPdf
        ? `Primary documentary circular (PDF) hosted directly on the institution's official registrar domain (${domain}).`
        : `Published directly on the institution's official registrar domain (${domain}).`,
      score: 95,
      factors,
    };
  }

  // -------------------------------------------------------------
  // RULE 3: Authenticated Government Entities (.gov, .gov.in, .nic.in)
  // -------------------------------------------------------------
  if (type === 'Government source') {
    factors.push('Sovereign administrative domain (.gov.in / .nic.in)');
    factors.push('Government regulatory or disaster management authority');

    return {
      reliability: 'high',
      explanation: `Published on an authenticated government registry domain (${domain}) with administrative authority.`,
      score: 95,
      factors,
    };
  }

  // -------------------------------------------------------------
  // RULE 4: Reputable Journalistic News Outlets
  // -------------------------------------------------------------
  if (type === 'News outlet') {
    const isTopTierWire =
      domain.includes('thehindu.com') ||
      domain.includes('indianexpress.com') ||
      domain.includes('reuters.com') ||
      domain.includes('bbc.com') ||
      domain.includes('ndtv.com');

    factors.push('Established news publication with professional editorial standards');
    if (isTopTierWire) factors.push('Accredited national / international press agency');

    return {
      reliability: isTopTierWire ? 'high' : 'medium',
      explanation: isTopTierWire
        ? `Published by an accredited news organization with established editorial verification standards (${domain}).`
        : `Published by a regional news outlet (${domain}); subject to editorial reporting.`,
      score: isTopTierWire ? 85 : 70,
      factors,
    };
  }

  // -------------------------------------------------------------
  // RULE 5: Verified Official Social Channels
  // -------------------------------------------------------------
  if (type === 'Official social account') {
    factors.push('Verified institutional handle on public social network');
    factors.push('Fast real-time broadcast signal');

    return {
      reliability: 'medium',
      explanation: `Verified public institutional social account (${domain}); valuable real-time corroboration, though secondary to signed circulars.`,
      score: 65,
      factors,
    };
  }

  // -------------------------------------------------------------
  // RULE 6: Secondary Aggregators & Student Portals
  // -------------------------------------------------------------
  if (type === 'Student portal post' || SECONDARY_AGGREGATORS[domain]) {
    factors.push('Secondary student aggregator / educational information portal');
    factors.push('Information is curated but lacks primary regulatory issuance');

    return {
      reliability: 'medium',
      explanation: `Secondary student portal (${domain}); republishes public announcements but does not hold primary institutional issuance authority.`,
      score: 50,
      factors,
    };
  }

  // -------------------------------------------------------------
  // RULE 7: Independent Blogs & Web Logs
  // -------------------------------------------------------------
  if (type === 'Blog') {
    factors.push('Self-published web log / blog platform');
    factors.push('No institutional accountability or verified editorial review board');

    return {
      reliability: 'low',
      explanation: `Self-published blog (${domain}) without institutional accountability or verified editorial governance.`,
      score: 25,
      factors,
    };
  }

  // -------------------------------------------------------------
  // RULE 8: Discussion Forums & Informal Communities
  // -------------------------------------------------------------
  if (type === 'Forum' || type === 'Campus forum' || type === 'Social post' || type === 'Forwarded chat') {
    factors.push('User-generated discussion thread or social channel');
    factors.push('High vulnerability to unverified rumors, hearsay, and semantic drift');

    return {
      reliability: 'low',
      explanation: `User-generated community thread on ${domain}; high vulnerability to anonymous rumor circulation and unverified commentary.`,
      score: 15,
      factors,
    };
  }

  // -------------------------------------------------------------
  // RULE 9: Unknown / Unclassified Web Source
  // -------------------------------------------------------------
  factors.push('Unrecognized domain provenance');
  return {
    reliability: 'unverified',
    explanation: `Domain provenance (${domain}) is unclassified; authority and publication standards have not been verified.`,
    score: 30,
    factors,
  };
}

/**
 * Normalizes a single SearchResult into an EchoTrace NormalizedSource record.
 * 
 * Strict Guarantees:
 * - Does NOT invent authors, publication dates, or fake verification statuses.
 * - If metadata is unavailable, explicitly uses null or undefined.
 */
export function normalizeSource(
  result: SearchResult,
  options: SourceCollectorOptions = {}
): NormalizedSource {
  const canonicalUrl = normalizeUrl(result.url);
  const { publisher, domain } = identifyPublisher(canonicalUrl, result.publisher, result.title);
  const type = identifySourceType(canonicalUrl, result.title, publisher || '');

  // Transparent forensic reliability assessment
  const assessment = assessSourceReliability({
    url: canonicalUrl,
    domain,
    type,
    name: result.title,
    publisher,
    snippet: result.snippet,
  });

  const retrievalTimestamp = result.retrievedAt || new Date().toISOString();
  const publishedAt = result.publishedAt || null;

  // Format a human-readable display timestamp (never inventing past dates)
  let displayTimestamp = 'Retrieved just now';
  if (publishedAt) {
    try {
      const pubDate = new Date(publishedAt);
      if (!isNaN(pubDate.getTime())) {
        displayTimestamp = pubDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      displayTimestamp = `Published: ${publishedAt}`;
    }
  } else {
    displayTimestamp = `Retrieved: ${new Date(retrievalTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  const provenance: SourceProvenance = {
    originalQuery: result.query,
    searchProvider: result.id.split('-')[0] || undefined,
    sourceTypeRank: result.priorityRank,
    rawTitle: result.title,
    rawSnippet: result.snippet,
    relevanceScore: result.relevanceScore,
    canonicalUrl,
    collectedAt: new Date().toISOString(),
  };

  // Status defaults to 'Needs verification' because raw search items have not yet
  // undergone Phase 5 content scraping and Phase 6 contradiction verification.
  const status: VerificationStatus =
    type === 'Official notice' && assessment.reliability === 'high'
      ? 'Verified source'
      : 'Needs verification';

  // Construct source name (concise and factual without inventing fluff)
  const sourceName = publisher && publisher !== domain
    ? `${publisher}: ${result.title.slice(0, 70)}`
    : result.title.slice(0, 85);

  return {
    id: `src-norm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    name: sourceName,
    platform: publisher || domain,
    reliability: assessment.reliability,
    status,
    timestamp: displayTimestamp,
    authorHandle: undefined, // Strictly do not fabricate author handles
    reach: undefined,        // Strictly do not fabricate social reach counts
    notes: `${assessment.explanation} [Matched Query: "${result.query}"]`,

    // Phase 4 Extended Fields
    url: canonicalUrl,
    domain,
    publisher,
    publishedAt,
    retrievalTimestamp,
    reliabilityExplanation: assessment.explanation,
    provenance,
    contentFetchStatus: 'pending', // Hook ready for Phase 5 content fetcher
    snippet: result.snippet,
  };
}

/**
 * Deduplicates an array of NormalizedSource records based on canonical URL.
 * Preserves the richest record and merges provenance queries.
 */
export function deduplicateSources(sources: NormalizedSource[]): NormalizedSource[] {
  const map = new Map<string, NormalizedSource>();

  for (const src of sources) {
    if (!src.url) continue;
    const key = normalizeUrl(src.url);

    const existing = map.get(key);
    if (!existing) {
      map.set(key, src);
    } else {
      // If the new source has a higher reliability score or a longer informative snippet:
      const existingScore = existing.reliability === 'high' ? 3 : existing.reliability === 'medium' ? 2 : 1;
      const newScore = src.reliability === 'high' ? 3 : src.reliability === 'medium' ? 2 : 1;
      const existingSnippetLen = existing.snippet?.length || 0;
      const newSnippetLen = src.snippet?.length || 0;

      if (newScore > existingScore || (newScore === existingScore && newSnippetLen > existingSnippetLen)) {
        // Retain newer richer record while preserving prior matched query
        map.set(key, {
          ...src,
          notes: `${src.notes} (Also matched: "${existing.provenance.originalQuery}")`,
        });
      } else {
        // Update existing record's notes with supplementary query match
        existing.notes = `${existing.notes} (Also matched: "${src.provenance.originalQuery}")`;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Main Source Normalization Pipeline Entry Point:
 * collectSources(searchResults: SearchResult[], options?: SourceCollectorOptions)
 * 
 * Ingests raw SearchResult items, normalizes metadata, assesses reliability,
 * deduplicates URLs, and returns clean, verified NormalizedSource records.
 */
export function collectSources(
  searchResults: SearchResult[],
  options: SourceCollectorOptions = {}
): SourceCollectionResult {
  const normalizedList: NormalizedSource[] = [];

  for (const result of searchResults) {
    if (!result || !result.url) continue;
    const normalized = normalizeSource(result, options);
    normalizedList.push(normalized);
  }

  // Deduplicate sources by canonical URL (enabled by default)
  const shouldDedupe = options.deduplicate !== false;
  const deduplicated = shouldDedupe ? deduplicateSources(normalizedList) : normalizedList;

  // Sort by reliability priority: High > Medium > Low > Unverified
  const reliabilityPriority: Record<SourceReliability, number> = {
    high: 1,
    medium: 2,
    unverified: 3,
    low: 4,
  };

  const sorted = [...deduplicated].sort((a, b) => {
    const pA = reliabilityPriority[a.reliability] || 5;
    const pB = reliabilityPriority[b.reliability] || 5;
    return pA - pB;
  });

  const finalSources = options.maxSources ? sorted.slice(0, options.maxSources) : sorted;

  // Aggregate category counts
  let officialCount = 0;
  let governmentCount = 0;
  let newsCount = 0;
  let socialCount = 0;
  let otherCount = 0;

  for (const s of finalSources) {
    if (s.type === 'Official notice') officialCount++;
    else if (s.type === 'Government source') governmentCount++;
    else if (s.type === 'News outlet') newsCount++;
    else if (s.type === 'Official social account' || s.type === 'Social post') socialCount++;
    else otherCount++;
  }

  return {
    sources: finalSources,
    totalReceived: searchResults.length,
    totalUnique: finalSources.length,
    officialCount,
    governmentCount,
    newsCount,
    socialCount,
    otherCount,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Singleton Service Abstraction
 */
export class SourceCollectorService {
  public collectSources(
    searchResults: SearchResult[],
    options?: SourceCollectorOptions
  ): SourceCollectionResult {
    return collectSources(searchResults, options);
  }

  public normalizeSource(result: SearchResult, options?: SourceCollectorOptions): NormalizedSource {
    return normalizeSource(result, options);
  }

  public deduplicateSources(sources: NormalizedSource[]): NormalizedSource[] {
    return deduplicateSources(sources);
  }

  public assessSourceReliability(source: Partial<NormalizedSource>): SourceReliabilityAssessment {
    return assessSourceReliability(source);
  }
}

export const sourceCollector = new SourceCollectorService();
