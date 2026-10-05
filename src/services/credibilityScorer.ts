/**
 * EchoTrace Phase 7: Source Credibility & Reliability Scorer Service
 * 
 * Formal Architecture:
 * SOURCE + PROVENANCE + METADATA → SOURCE RELIABILITY
 * 
 * Strict Guarantees:
 * 1. Reliability is NOT the same thing as truth:
 *    - A source can be highly reliable but publish information that contradicts a claim.
 *    - A low-reliability source can contain information that happens to be correct.
 * 2. Multi-factor audit (10 key factors):
 *    - Official domain, government domain, institutional ownership, publisher identity,
 *      primary vs secondary document, author identification, publication date,
 *      source provenance, direct attributability, independent verifiability.
 * 3. Anti-simplistic safeguards:
 *    - Never assigns 'high' solely because a URL or title contains the word 'official'.
 *    - Never awards points simply because a source is popular or viral.
 * 4. Transparent, explainable reasons and contextual limitations for every assessment.
 * 5. Strictly does NOT determine the final overall claim verdict.
 */

import { Source, SourceReliability, SourceType } from '../types/claim.ts';
import {
  BatchCredibilityResult,
  CredibilityAssessment,
  CredibilityFactorBreakdown,
} from '../types/credibility.ts';
import { NormalizedSource } from '../types/sourceCollection.ts';
import { extractDomain, identifyPublisher, identifySourceType } from './sourceCollector.ts';

// -------------------------------------------------------------
// Known Institutional & Sovereign Authorities
// -------------------------------------------------------------

const SOVEREIGN_TLDS = ['.gov', '.gov.in', '.nic.in', '.mil', '.mil.in'];
const INSTITUTIONAL_TLDS = ['.edu', '.edu.in', '.ac.in', '.ac.uk', '.res.in', '.ernet.in'];

const ACCREDITED_NEWS_DOMAINS = [
  'thehindu.com',
  'thehindubusinessline.com',
  'indianexpress.com',
  'timesofindia.indiatimes.com',
  'ndtv.com',
  'hindustantimes.com',
  'bbc.com',
  'reuters.com',
  'apnews.com',
  'theprint.in',
  'scroll.in',
  'news18.com',
  'indiatoday.in',
  'livemint.com',
  'deccanchronicle.com',
  'dtnext.in',
  'dinamalar.com',
  'dailythanthi.com',
  'aniin.com',
  'ptinews.com',
];

const SECONDARY_PORTALS = [
  'collegedunia.com',
  'shiksha.com',
  'careers360.com',
  'getmyuni.com',
  'campustimes.in',
  'studocu.com',
];

const OPEN_COMMUNITY_DOMAINS = [
  'reddit.com',
  'quora.com',
  'discord.com',
  'discord.gg',
  't.me',
  'telegram.org',
  'telegram.me',
  '4chan.org',
  'pastebin.com',
  'telegra.ph',
];

const BLOG_DOMAINS = [
  'medium.com',
  'blogspot.com',
  'wordpress.com',
  'substack.com',
  'blogger.com',
  'tumblr.com',
];

/**
 * Evaluates the 10 forensic factors and calculates an explainable credibility assessment.
 */
export function assessSourceCredibility(
  source: Source | NormalizedSource | Partial<NormalizedSource>
): CredibilityAssessment {
  const sourceId = source.id || `src-${Date.now()}`;
  const rawUrl = source.url || '';
  const domain = (source.domain || extractDomain(rawUrl)).toLowerCase();
  const title = (source.name || '').toLowerCase();
  const snippet = (source.notes || source.snippet || '').toLowerCase();
  const combinedMeta = `${domain} ${rawUrl} ${title} ${snippet}`.toLowerCase();
  const type: SourceType = source.type || identifySourceType(rawUrl, source.name, source.publisher || '');

  const reasons: string[] = [];
  const limitations: string[] = [];
  const flags: string[] = [];

  // Initialize Factor Breakdown (100-point rubric)
  let domainAuthority = 0;       // max 25
  let publisherIdentity = 0;     // max 20
  let primaryDocumentStatus = 0; // max 20
  let provenanceVerifiability = 0; // max 15
  let attributability = 0;       // max 10
  let temporalFreshness = 0;     // max 10

  // -------------------------------------------------------------
  // FACTOR 1: Official & Government Domain Authority (0 - 25)
  // -------------------------------------------------------------
  const isGovernmentTld = SOVEREIGN_TLDS.some((tld) => domain.endsWith(tld) || domain.includes(tld));
  const isInstitutionalTld = INSTITUTIONAL_TLDS.some((tld) => domain.endsWith(tld) || domain.includes(tld));
  const isAccreditedNews = ACCREDITED_NEWS_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));

  if (isGovernmentTld) {
    domainAuthority = 25;
    reasons.push(`Sovereign government domain authority (.gov / .nic.in) under authenticated state control.`);
  } else if (isInstitutionalTld) {
    domainAuthority = 25;
    reasons.push(`Accredited institutional educational domain (.edu / .ac.in) holding primary authority.`);
  } else if (isAccreditedNews) {
    domainAuthority = 20;
    reasons.push(`Established journalistic press domain with professional editorial accountability.`);
  } else if (SECONDARY_PORTALS.some((p) => domain.includes(p))) {
    domainAuthority = 10;
    reasons.push(`Commercial educational aggregator domain; secondary curation platform.`);
  } else if (BLOG_DOMAINS.some((b) => domain.includes(b))) {
    domainAuthority = 5;
    reasons.push(`Self-published web log hosting domain lacking institutional accreditation.`);
  } else if (OPEN_COMMUNITY_DOMAINS.some((f) => domain.includes(f))) {
    domainAuthority = 0;
    reasons.push(`Open community discussion platform vulnerable to anonymous user submissions.`);
  } else if (domain && domain !== 'unknown-domain') {
    domainAuthority = 8;
    reasons.push(`Standard web domain (${domain}); institutional standing unverified.`);
  } else {
    domainAuthority = 0;
    reasons.push(`No verifiable domain host attached to source record.`);
  }

  // -------------------------------------------------------------
  // FACTOR 2 & 3: Institutional Ownership & Publisher Identity (0 - 20)
  // -------------------------------------------------------------
  const identifiedPub = identifyPublisher(rawUrl, source.publisher || undefined, source.name);
  const publisherName = source.publisher || identifiedPub.publisher;

  if (isGovernmentTld || isInstitutionalTld) {
    publisherIdentity = 20;
    reasons.push(`Publisher is an accredited administrative or academic governing body (${publisherName || domain}).`);
  } else if (isAccreditedNews) {
    publisherIdentity = 16;
    reasons.push(`Publisher is a recognized news organization (${publisherName || domain}) with editorial oversight.`);
  } else if (type === 'Official social account') {
    publisherIdentity = 14;
    reasons.push(`Verified official institutional social broadcast account on public social network.`);
  } else if (type === 'Student portal post') {
    publisherIdentity = 8;
    reasons.push(`Secondary student advisory portal; curates third-party announcements.`);
  } else if (type === 'Blog') {
    publisherIdentity = 4;
    reasons.push(`Self-published author or blog without formal board oversight.`);
  } else if (type === 'Social post' || type === 'Forwarded chat' || type === 'Campus forum' || type === 'Forum') {
    publisherIdentity = 0;
    reasons.push(`User-generated community channel without verifiable publisher governance.`);
  } else {
    publisherIdentity = 5;
    reasons.push(`Publisher identity is unclassified.`);
  }

  // -------------------------------------------------------------
  // FACTOR 4 & 5: Primary Document vs. Secondary Reporting (0 - 20)
  // -------------------------------------------------------------
  const isPrimaryPdf =
    rawUrl.toLowerCase().endsWith('.pdf') ||
    combinedMeta.includes('circular ref') ||
    combinedMeta.includes('signed circular') ||
    combinedMeta.includes('office order') ||
    combinedMeta.includes('gazette notification');

  const isOfficialAnnouncement =
    type === 'Official notice' ||
    type === 'Government source' ||
    isGovernmentTld ||
    isInstitutionalTld ||
    combinedMeta.includes('advisory') ||
    combinedMeta.includes('press release') ||
    combinedMeta.includes('registrar advisory') ||
    combinedMeta.includes('disaster management');

  if (isPrimaryPdf && (isInstitutionalTld || isGovernmentTld)) {
    primaryDocumentStatus = 20;
    reasons.push(`Primary documentary circular (signed PDF / administrative order) hosted directly by the authority.`);
  } else if (isOfficialAnnouncement && (isInstitutionalTld || isGovernmentTld)) {
    primaryDocumentStatus = 18;
    reasons.push(`Direct primary announcement issued on the authority's announcements directory.`);
  } else if (isAccreditedNews) {
    primaryDocumentStatus = 12;
    reasons.push(`Secondary journalistic reporting quoting institutional decisions or weather bulletins.`);
  } else if (type === 'Official social account') {
    primaryDocumentStatus = 10;
    reasons.push(`Primary social broadcast, but secondary in evidentiary rigor to signed circular documents.`);
  } else if (type === 'Student portal post') {
    primaryDocumentStatus = 6;
    reasons.push(`Secondary tertiary reproduction of campus circulars.`);
  } else {
    primaryDocumentStatus = 0;
    reasons.push(`Informal hearsay or peer-to-peer forwarded message without primary document verification.`);
  }

  // -------------------------------------------------------------
  // FACTOR 6: Author Identification (0 - 10)
  // -------------------------------------------------------------
  const hasFormalAuthorRole =
    combinedMeta.includes('registrar') ||
    combinedMeta.includes('controller of examinations') ||
    combinedMeta.includes('district collector') ||
    combinedMeta.includes('collector') ||
    combinedMeta.includes('disaster management') ||
    combinedMeta.includes('authority') ||
    combinedMeta.includes('dean') ||
    combinedMeta.includes('principal') ||
    combinedMeta.includes('bureau') ||
    Boolean(source.authorHandle) ||
    isGovernmentTld;

  if (hasFormalAuthorRole && (isInstitutionalTld || isGovernmentTld)) {
    attributability += 5;
    reasons.push(`Issuing authority is explicitly attributed to a formal administrative office.`);
  } else if (isAccreditedNews) {
    attributability += 4;
    reasons.push(`Journalistic byline or editorial desk attribution.`);
  } else if (source.authorHandle) {
    attributability += 2;
    reasons.push(`Author handle identified (${source.authorHandle}), but institutional credential is unverified.`);
  } else {
    reasons.push(`Anonymous or unattributed authorship.`);
  }

  // -------------------------------------------------------------
  // FACTOR 7: Direct Attributability & Reference Citations (0 - 10)
  // -------------------------------------------------------------
  const hasOfficialRefNumber =
    /ref(?:\s+no)?[:.]?\s*#?[\w\/-]+/i.test(snippet) ||
    /circular\s+(?:no|ref)/i.test(snippet) ||
    /order\s+no/i.test(snippet);

  if (hasOfficialRefNumber && (isInstitutionalTld || isGovernmentTld)) {
    attributability += 5;
    reasons.push(`Contains formal administrative dispatch reference number verifiable in records.`);
  } else if (combinedMeta.includes('confirmed by') || combinedMeta.includes('clarified that')) {
    attributability += 3;
    reasons.push(`Includes direct attribution to university spokespersons.`);
  } else {
    attributability += 1;
  }

  // -------------------------------------------------------------
  // FACTOR 8: Publication Timestamp & Freshness (0 - 10)
  // -------------------------------------------------------------
  if (source.publishedAt) {
    temporalFreshness = 10;
    reasons.push(`Timestamped with authenticated publication date and time (${source.publishedAt}).`);
  } else if (source.timestamp && !source.timestamp.includes('Retrieved')) {
    temporalFreshness = 6;
    reasons.push(`Temporal marker recorded (${source.timestamp}), but origin timestamp metadata is unverified.`);
  } else {
    temporalFreshness = 2;
    reasons.push(`No authentic publication date provided in metadata.`);
  }

  // -------------------------------------------------------------
  // FACTOR 9 & 10: Source Provenance & Independent Verifiability (0 - 15)
  // -------------------------------------------------------------
  if (rawUrl && rawUrl.startsWith('http')) {
    if (source.contentFetchStatus === 'unsupported' || source.contentFetchStatus === 'failed') {
      provenanceVerifiability = 10;
      reasons.push(`Web URL provided, but retrieval was subject to access or network restrictions.`);
    } else {
      provenanceVerifiability = 15;
      reasons.push(`Publicly accessible canonical URL available for independent third-party verification.`);
    }
  } else {
    provenanceVerifiability = 0;
    reasons.push(`Non-verifiable origin: Source lacks a public canonical URL or exists only in ephemeral chat.`);
  }

  // -------------------------------------------------------------
  // ANTI-SPOOFING & ANTI-POPULARITY SAFEGUARDS (Crucial Defense)
  // -------------------------------------------------------------
  const claimsOfficial =
    title.includes('official notice') ||
    title.includes('official circular') ||
    title.includes('government order') ||
    snippet.includes('official notice') ||
    snippet.includes('official circular');

  const isOpenOrBlogHost =
    type === 'Forum' ||
    type === 'Blog' ||
    type === 'Campus forum' ||
    type === 'Social post' ||
    OPEN_COMMUNITY_DOMAINS.some((d) => domain.includes(d)) ||
    BLOG_DOMAINS.some((d) => domain.includes(d));

  let penalty = 0;

  // Anti-Spoofing Rule: Claiming "official" on open/blog domain
  if (claimsOfficial && isOpenOrBlogHost) {
    penalty += 30;
    flags.push('SPOOFED_OFFICIAL_CLAIM_ON_OPEN_HOST');
    reasons.push(
      `ANTI-SPOOFING PENALTY (-30): Title claims 'official' authority, but host (${domain}) is an open user platform lacking institutional domain control.`
    );
  }

  // Anti-Popularity Safeguard: High viral reach on anonymous post
  const isHighReach =
    (source.reach && (source.reach.includes('k') || source.reach.includes('students') || source.reach.includes('groups'))) ||
    false;

  if (isHighReach && !isInstitutionalTld && !isGovernmentTld && !isAccreditedNews) {
    flags.push('VIRAL_UNVERIFIED_AMPLIFICATION');
    limitations.push(
      `Popularity Safeguard: Large social reach or forward velocity does NOT increase credibility without authenticated institutional provenance.`
    );
  }

  // Compute Total Composite Score (0 - 100)
  const rawScore =
    domainAuthority +
    publisherIdentity +
    primaryDocumentStatus +
    provenanceVerifiability +
    attributability +
    temporalFreshness -
    penalty;

  const score = Math.max(5, Math.min(100, Math.round(rawScore)));

  // Determine Reliability Tier
  let reliability: SourceReliability = 'unverified';
  if (score >= 75) {
    reliability = 'high';
  } else if (score >= 50) {
    reliability = 'medium';
  } else if (score >= 20) {
    reliability = 'low';
  } else {
    reliability = 'unverified';
  }

  // -------------------------------------------------------------
  // CONTEXTUAL LIMITATIONS GENERATION (Required by Specification)
  // -------------------------------------------------------------
  if (isAccreditedNews || type === 'News outlet') {
    limitations.push(
      `Secondary journalistic reporting; subject to editorial condensation and potential transmission lag relative to direct registrar announcements.`
    );
    limitations.push(
      `Coverage focuses on regional district-wide conditions rather than autonomous campus-specific schedules unless explicitly cited.`
    );
  } else if (isGovernmentTld || type === 'Government source') {
    limitations.push(
      `Focuses on civic and public district-level administration; autonomous private universities may operate under independent institutional guidelines.`
    );
  } else if (isInstitutionalTld || type === 'Official notice') {
    limitations.push(
      `Administrative circulars reflect operational policies at the time of issuance and may be updated or superseded if local weather conditions worsen.`
    );
    limitations.push(
      `Focuses on campus boundaries; does not provide real-time hyper-local neighborhood waterlogging or road transit status.`
    );
  } else if (type === 'Official social account') {
    limitations.push(
      `Social media broadcasts are brief alerts; valuable for fast notice but carry less evidentiary weight than numbered, signed circular documents.`
    );
  } else if (type === 'Student portal post') {
    limitations.push(
      `Republished via secondary student aggregator; information is curated but does not carry regulatory issuance authority.`
    );
  } else {
    // Low or Unverified
    limitations.push(
      `Completely anonymous with zero institutional accountability; impossible to independently verify the author's identity or access credentials.`
    );
    limitations.push(
      `High risk of semantic mutation, cognitive drift, satirical fabrication, or unverified peer-to-peer rumor circulation.`
    );
    if (!rawUrl || !rawUrl.startsWith('http')) {
      limitations.push(
        `Lacks a persistent public URL; cannot be independently audited by third-party fact-checkers.`
      );
    }
  }

  const breakdown: CredibilityFactorBreakdown = {
    domainAuthority,
    publisherIdentity,
    primaryDocumentStatus,
    provenanceVerifiability,
    attributability,
    temporalFreshness,
  };

  return {
    sourceId,
    reliability,
    score,
    reasons,
    limitations,
    breakdown,
    assessedAt: new Date().toISOString(),
    flags: flags.length > 0 ? flags : undefined,
  };
}

/**
 * Assesses credibility for an array of sources and returns aggregate distribution statistics.
 */
export function assessBatchCredibility(
  sources: (Source | NormalizedSource | Partial<NormalizedSource>)[]
): BatchCredibilityResult {
  const assessments: CredibilityAssessment[] = [];
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let unverifiedCount = 0;
  let scoreSum = 0;

  for (const source of sources) {
    const assessment = assessSourceCredibility(source);
    assessments.push(assessment);
    scoreSum += assessment.score;

    if (assessment.reliability === 'high') highCount++;
    else if (assessment.reliability === 'medium') mediumCount++;
    else if (assessment.reliability === 'low') lowCount++;
    else if (assessment.reliability === 'unverified') unverifiedCount++;
  }

  const averageScore = sources.length > 0 ? Math.round(scoreSum / sources.length) : 0;

  return {
    assessments,
    highCount,
    mediumCount,
    lowCount,
    unverifiedCount,
    averageScore,
    assessedAt: new Date().toISOString(),
  };
}

/**
 * Credibility Scorer Service Abstraction
 */
export class CredibilityScorerService {
  public assessCredibility(
    source: Source | NormalizedSource | Partial<NormalizedSource>
  ): CredibilityAssessment {
    return assessSourceCredibility(source);
  }

  public assessBatchCredibility(
    sources: (Source | NormalizedSource | Partial<NormalizedSource>)[]
  ): BatchCredibilityResult {
    return assessBatchCredibility(sources);
  }
}

export const credibilityScorer = new CredibilityScorerService();
