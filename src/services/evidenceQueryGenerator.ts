/**
 * EchoTrace Phase 3: Evidence Search Query Generator
 * 
 * Implements the 5 multi-query search strategies specified in the Phase 3 architecture:
 * 1. Exact claim
 * 2. Main entities + action
 * 3. Entity + event
 * 4. Entity + time
 * 5. Important keywords
 * 
 * Example:
 * Claim: "SRM College is closed tomorrow because of heavy rain."
 * Formulated Searches:
 * - "SRM College closed tomorrow heavy rain"
 * - "SRM official notice college closed"
 * - "SRM heavy rain closure"
 * - "SRM university announcement"
 */

import { ExtractedClaim } from '../types/claimExtraction';
import { GeneratedQuery, SearchQueryPlan, SearchStrategyKind } from '../types/evidenceSearch';

function cleanQueryString(str: string): string {
  return str
    .replace(/["'?!.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deduplicateQueries(queries: GeneratedQuery[]): GeneratedQuery[] {
  const seen = new Set<string>();
  const deduped: GeneratedQuery[] = [];

  for (const q of queries) {
    const normalized = cleanQueryString(q.query).toLowerCase();
    if (normalized.length >= 3 && !seen.has(normalized)) {
      seen.add(normalized);
      deduped.push({
        ...q,
        query: cleanQueryString(q.query),
      });
    }
  }

  return deduped;
}

/**
 * Formulates a multi-angle search query plan from an ExtractedClaim.
 */
export function generateSearchQueries(claim: ExtractedClaim): SearchQueryPlan {
  const generatedQueries: GeneratedQuery[] = [];
  const primaryEntity = claim.subject || (claim.entities.length > 0 ? claim.entities[0] : '');
  const primaryAction = claim.action || '';
  const primaryReason = claim.reason || '';
  const primaryTime = claim.timeReference || '';
  const primaryLocation = claim.location || '';
  const keywords = claim.keywords || [];

  // 1. STRATEGY 1: Exact Claim
  // Clean declarative proposition without attribution or conversational noise
  const exactClean = cleanQueryString(claim.claimText);
  if (exactClean) {
    generatedQueries.push({
      kind: 'exact_claim',
      query: exactClean,
      rationale: 'Direct verbatim proposition search to discover exact matches, circular titles, or fact-check debunkings.',
    });
  }

  // 2. STRATEGY 2: Main Entities + Action
  // Matches institutional announcements regarding operations or directives
  // e.g. "SRM official notice college closed"
  if (primaryEntity && primaryAction) {
    const actionQuery = `${primaryEntity} official notice ${primaryAction}`;
    generatedQueries.push({
      kind: 'entities_action',
      query: actionQuery,
      rationale: 'Official operational action query targeting registrar notices, circulars, or administrative directives.',
    });

    if (claim.entities.length > 1) {
      const multiEntityQuery = `${claim.entities.slice(0, 2).join(' ')} ${primaryAction}`;
      generatedQueries.push({
        kind: 'entities_action',
        query: multiEntityQuery,
        rationale: 'Entity-action co-occurrence query cross-referencing named institutions and operational verbs.',
      });
    }
  } else if (primaryEntity) {
    generatedQueries.push({
      kind: 'entities_action',
      query: `${primaryEntity} official announcement notice`,
      rationale: 'Entity announcement query targeting official institutional broadcasts.',
    });
  }

  // 3. STRATEGY 3: Entity + Event / Reason
  // Correlates external conditions (e.g. heavy rain, cyclone, holiday) with the institution
  // e.g. "SRM heavy rain closure"
  if (primaryEntity && primaryReason) {
    const eventQuery = `${primaryEntity} ${primaryReason} ${primaryAction || 'closure'}`;
    generatedQueries.push({
      kind: 'entity_event',
      query: eventQuery,
      rationale: 'Environmental/trigger event query matching institutional response to external factors.',
    });
  } else if (primaryReason) {
    generatedQueries.push({
      kind: 'entity_event',
      query: `${primaryEntity || ''} ${primaryReason} holiday notice`,
      rationale: 'Causal event query targeting meteorological or administrative announcements.',
    });
  }

  // 4. STRATEGY 4: Entity + Time Reference
  // Targets temporal specificity (e.g. tomorrow, monday, date)
  // e.g. "SRM College closed tomorrow"
  if (primaryEntity && primaryTime) {
    const timeQuery = `${primaryEntity} ${primaryAction || 'closed'} ${primaryTime}`;
    generatedQueries.push({
      kind: 'entity_time',
      query: timeQuery,
      rationale: 'Temporally scoped query isolating announcements applicable to the specified date/window.',
    });
  }

  // 5. STRATEGY 5: Important Keywords & Official Targeting
  // High-density keyword query + targeted institutional domain query
  // e.g. "SRM university announcement"
  if (keywords.length > 0) {
    const keywordSlice = keywords.slice(0, 5).join(' ');
    generatedQueries.push({
      kind: 'keywords',
      query: keywordSlice,
      rationale: 'High-signal keyword query capturing key semantic tokens across public web and news portals.',
    });
  }

  // Official Institutional Targeted Query
  if (primaryEntity) {
    const institutionalQuery = `${primaryEntity} university announcement`;
    generatedQueries.push({
      kind: 'official_target',
      query: institutionalQuery,
      rationale: 'Institutional authority query targeted at primary registrar notices and circulars.',
    });
  }

  const finalQueries = deduplicateQueries(generatedQueries);

  return {
    claimId: claim.id,
    claimText: claim.claimText,
    queries: finalQueries,
    generatedAt: new Date().toISOString(),
  };
}
