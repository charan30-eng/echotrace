/**
 * EchoTrace Phase 3: Source Priority Classifier & URL Normalizer
 * 
 * Strict Source Hierarchy (Phase 3 Architecture):
 * 1. Official institutional sources (rank 1)
 * 2. Government sources (rank 2)
 * 3. Primary documents (rank 3)
 * 4. Reputable news organizations (rank 4)
 * 5. Verified/public official social accounts (rank 5)
 * 6. Secondary sources (rank 6)
 * 7. Unknown websites (rank 7)
 * 8. Anonymous social posts (rank 8)
 * 
 * Architectural Rule:
 * Search engine ranking is NEVER automatically treated as truth.
 * Evidence is explicitly classified and audited by provenance.
 */

import { SearchResult, SearchResultSourceType } from '../types/evidenceSearch.ts';

// Known reputable news domains
const REPUTABLE_NEWS_DOMAINS = [
  'thehindu.com',
  'thehindubusinessline.com',
  'timesofindia.indiatimes.com',
  'indianexpress.com',
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

// Institutional top-level domains and patterns
const INSTITUTIONAL_TLDS = [
  '.edu',
  '.edu.in',
  '.ac.in',
  '.ac.uk',
  '.ac.nz',
  '.res.in',
  '.ernet.in',
];

// Government top-level domains and patterns
const GOVERNMENT_TLDS = [
  '.gov',
  '.gov.in',
  '.nic.in',
  '.mil',
  '.mil.in',
  'imd.gov.in',
  'ndma.gov.in',
  'tnsdma.tn.gov.in',
  'chennaicorporation.gov.in',
];

// Secondary aggregators / student portals
const SECONDARY_PORTALS = [
  'collegedunia.com',
  'shiksha.com',
  'careers360.com',
  'getmyuni.com',
  'quora.com',
  'medium.com',
  'linkedin.com/pulse',
  'studocu.com',
  'scribd.com',
  'campustimes.in',
];

// Anonymous / informal social platforms
const ANONYMOUS_SOCIAL_DOMAINS = [
  'reddit.com',
  't.me',
  'telegram.org',
  'telegram.me',
  'discord.com',
  'discord.gg',
  '4chan.org',
  'pastebin.com',
  'telegra.ph',
];

/**
 * Normalizes a URL by stripping tracking parameters, normalizing lowercase host,
 * and standardizing path trailing slashes.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl.trim());
    urlObj.protocol = 'https:'; // Standardize protocol for comparison
    urlObj.hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');

    // Strip tracking and analytics parameters
    const paramsToDelete: string[] = [];
    urlObj.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.startsWith('utm_') ||
        lowerKey === 'ref' ||
        lowerKey === 'source' ||
        lowerKey === 'fbclid' ||
        lowerKey === 'gclid' ||
        lowerKey === 'igshid' ||
        lowerKey === 'ncid'
      ) {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach((key) => urlObj.searchParams.delete(key));

    // Strip hash fragment
    urlObj.hash = '';

    // Strip trailing slash if pathname is not root
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;

    return urlObj.toString();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Classifies the source type and priority rank (1 to 8) based on URL, title, and publisher.
 */
export function classifySource(
  rawUrl: string,
  title = '',
  publisher = ''
): { sourceType: SearchResultSourceType; priorityRank: number } {
  let hostname = '';
  let pathname = '';
  try {
    const urlObj = new URL(rawUrl);
    hostname = urlObj.hostname.toLowerCase();
    pathname = urlObj.pathname.toLowerCase();
  } catch {
    hostname = rawUrl.toLowerCase();
  }

  const combinedMeta = `${hostname} ${pathname} ${title} ${publisher}`.toLowerCase();

  // 1. OFFICIAL INSTITUTIONAL SOURCES (Rank 1)
  const isInstitutional =
    INSTITUTIONAL_TLDS.some((tld) => hostname.endsWith(tld) || hostname.includes(tld)) ||
    hostname.includes('srmist.edu.in') ||
    hostname.includes('srmuniv.ac.in') ||
    hostname.includes('annauniv.edu') ||
    hostname.includes('iitm.ac.in') ||
    hostname.includes('vit.ac.in') ||
    combinedMeta.includes('registrar office') ||
    combinedMeta.includes('controller of examinations');

  if (isInstitutional) {
    return { sourceType: 'official', priorityRank: 1 };
  }

  // 2. GOVERNMENT SOURCES (Rank 2)
  const isGovernment =
    GOVERNMENT_TLDS.some((tld) => hostname.endsWith(tld) || hostname.includes(tld)) ||
    combinedMeta.includes('district collector') ||
    combinedMeta.includes('disaster management') ||
    combinedMeta.includes('meteorological department');

  if (isGovernment) {
    return { sourceType: 'government', priorityRank: 2 };
  }

  // 3. PRIMARY DOCUMENTS (Rank 3: PDFs, official gazettes, circular files)
  const isPdfOrCircular =
    pathname.endsWith('.pdf') ||
    pathname.includes('/circular') ||
    pathname.includes('/notification') ||
    pathname.includes('/gazette') ||
    pathname.includes('/orders/') ||
    combinedMeta.includes('official circular') ||
    combinedMeta.includes('office order');

  if (isPdfOrCircular && !ANONYMOUS_SOCIAL_DOMAINS.some((d) => hostname.includes(d))) {
    return { sourceType: 'primary', priorityRank: 3 };
  }

  // 4. REPUTABLE NEWS ORGANIZATIONS (Rank 4)
  const isReputableNews = REPUTABLE_NEWS_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );
  if (isReputableNews) {
    return { sourceType: 'news', priorityRank: 4 };
  }

  // 5. VERIFIED / OFFICIAL SOCIAL ACCOUNTS (Rank 5)
  // e.g. x.com/SRM_Univ, twitter.com/chennaicorp
  const isSocialPlatform =
    hostname.includes('twitter.com') ||
    hostname.includes('x.com') ||
    hostname.includes('facebook.com') ||
    hostname.includes('instagram.com') ||
    hostname.includes('linkedin.com');

  if (isSocialPlatform) {
    const isOfficialHandle =
      combinedMeta.includes('official') ||
      combinedMeta.includes('srm') ||
      combinedMeta.includes('university') ||
      combinedMeta.includes('police') ||
      combinedMeta.includes('collector');

    if (isOfficialHandle) {
      return { sourceType: 'social_verified', priorityRank: 5 };
    }
  }

  // 6. SECONDARY SOURCES (Rank 6)
  const isSecondary = SECONDARY_PORTALS.some((d) => hostname.includes(d));
  if (isSecondary) {
    return { sourceType: 'secondary', priorityRank: 6 };
  }

  // 7. ANONYMOUS SOCIAL / FORUMS (Rank 8)
  const isAnonymousSocial = ANONYMOUS_SOCIAL_DOMAINS.some((d) => hostname.includes(d));
  if (isAnonymousSocial || (isSocialPlatform && !combinedMeta.includes('official'))) {
    return { sourceType: 'anonymous_social', priorityRank: 8 };
  }

  // 8. UNKNOWN WEBSITES (Rank 7)
  return { sourceType: 'unknown', priorityRank: 7 };
}

/**
 * Deduplicates an array of SearchResult items based on normalized canonical URL.
 * Preserves the highest-priority (lowest rank number) or richest instance.
 */
export function deduplicateResultsByUrl(results: SearchResult[]): SearchResult[] {
  const map = new Map<string, SearchResult>();

  for (const item of results) {
    if (!item.url) continue;
    const normalizedUrl = normalizeUrl(item.url);

    const existing = map.get(normalizedUrl);
    if (!existing) {
      map.set(normalizedUrl, {
        ...item,
        url: item.url, // Keep original valid URL
      });
    } else {
      // If the new item has a higher source priority (e.g. 1 is better than 4)
      const existingRank = existing.priorityRank || 7;
      const newRank = item.priorityRank || 7;

      if (newRank < existingRank || (!existing.snippet && item.snippet)) {
        map.set(normalizedUrl, {
          ...item,
          url: item.url,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Sorts SearchResults according to Phase 3 Source Priority Hierarchy:
 * 1 (Official) > 2 (Gov) > 3 (Primary) > 4 (News) > 5 (Verified Social) > 6 (Secondary) > 7 (Unknown) > 8 (Anonymous)
 */
export function sortResultsByPriority(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => {
    const rankA = a.priorityRank || 7;
    const rankB = b.priorityRank || 7;

    if (rankA !== rankB) {
      return rankA - rankB; // Lower number = higher priority
    }

    // Secondary tie-breaker: length of informative snippet
    const snippetLenA = a.snippet?.length || 0;
    const snippetLenB = b.snippet?.length || 0;
    return snippetLenB - snippetLenA;
  });
}
