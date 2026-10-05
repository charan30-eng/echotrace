/**
 * EchoTrace Phase 3, 4, 5 & 6: Evidence Search, Extraction & Semantic Assessment Card
 * 
 * Formal Architecture:
 * Phase 3: EXTRACTED CLAIM → REAL EVIDENCE SEARCH → SEARCH RESULTS
 * Phase 4: SEARCH RESULTS → SOURCE COLLECTION → NORMALIZED SOURCES
 * Phase 5: SOURCES → FETCH SOURCE CONTENT → EXTRACT RELEVANT EVIDENCE
 * Phase 6: CLAIM + EVIDENCE → SUPPORT / CONTRADICTION / NEUTRAL
 * 
 * Strict Guarantees:
 * 1. For every Evidence object, determines its semantic relationship to the ExtractedClaim:
 *    - 'supports' (full or partial)
 *    - 'contradicts'
 *    - 'neutral'
 *    - 'insufficient'
 * 2. Independence of Source Credibility:
 *    - Source credibility is NOT confused with propositional relationship.
 *    - A high-credibility government page can contradict the claim.
 *    - An unreliable social post can support the claim while remaining low reliability.
 * 3. Considers: subject, action, object, time, location, conditions, negation, uncertainty, wording.
 * 4. Modality Discrimination: "may be closed" is strictly NOT interpreted as "is closed".
 * 5. Negation Detection: "not closed" is interpreted as contradiction to "is closed".
 * 6. Partial Support Distinction:
 *    - e.g., Supports closure, but does NOT establish heavy rain as the cause.
 * 7. Strictly does NOT calculate the overall final truth verdict yet (Phase 7).
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ExtractedClaim } from '../types/claimExtraction';
import {
  EvidenceSearchResponse,
  SearchResult,
  SearchQueryPlan,
} from '../types/evidenceSearch';
import { evidenceSearch } from '../services/evidenceSearch';
import { collectSources } from '../services/sourceCollector';
import { NormalizedSource } from '../types/sourceCollection';
import { Evidence, FetchStatus } from '../types/evidence';
import {
  EvidenceAssessment,
  EvidenceRelationship,
} from '../types/evidenceAnalysis';
import { fetchBatchSources } from '../services/sourceFetcher';
import { extractAllEvidence } from '../services/evidenceExtractor';
import { evidenceAnalyzer } from '../services/evidenceAnalyzer';
import { credibilityScorer } from '../services/credibilityScorer';
import { CredibilityAssessment } from '../types/credibility';
import { sourceComparator } from '../services/sourceComparator';
import { SourceComparison } from '../types/sourceComparison';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  CheckCircle2,
  FileText,
  Building2,
  Globe,
  Radio,
  SlidersHorizontal,
  Shield,
  Quote,
  Lock,
  Eye,
  FileWarning,
  CheckCircle,
  FileSearch,
  CheckSquare,
  XCircle,
  HelpCircle,
  Scale,
  GitCompare,
  Users,
  Network,
} from 'lucide-react';

interface EvidenceSearchResultsCardProps {
  claim?: ExtractedClaim;
  initialResponse?: EvidenceSearchResponse;
  initialEvidence?: Evidence[];
  isDemo?: boolean;
  onEvidenceUpdated?: (
    evidence: Evidence[],
    assessments: EvidenceAssessment[],
    sources: NormalizedSource[]
  ) => void;
}

export const EvidenceSearchResultsCard: React.FC<EvidenceSearchResultsCardProps> = ({
  claim,
  initialResponse,
  initialEvidence,
  isDemo = false,
  onEvidenceUpdated,
}) => {
  const [searchResponse, setSearchResponse] = useState<EvidenceSearchResponse | null>(
    initialResponse || null
  );
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [showQueryPlan, setShowQueryPlan] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('WebSearchProvider');
  const [activeTab, setActiveTab] = useState<'evidence' | 'normalized' | 'comparison' | 'raw'>('evidence');
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});

  // Extracted Evidence state
  const [evidenceList, setEvidenceList] = useState<Evidence[]>(() => {
    if (initialEvidence && initialEvidence.length > 0) {
      return initialEvidence;
    }
    // If demo scenario, initialize rich Phase 5/6 evidence items demonstrating all stances & partial support
    if (isDemo && claim) {
      return [
        {
          id: 'demo-evi-1',
          sourceId: 'src-srm-reg',
          title: 'SRMIST Office of the Registrar: Operational Advisory on Academic Schedule',
          url: 'https://srmist.edu.in/announcements/circular-operations.pdf',
          publisher: 'SRM Institute of Science and Technology',
          publishedAt: '2026-10-04T18:00:00Z',
          retrievedAt: new Date().toISOString(),
          excerpt:
            'All academic activities, scheduled laboratory sessions, and semester examinations across Kattankulathur campus will function normally as per the regular timetable.',
          context:
            'Reference No: SRM-ADM-2026-R4. In view of localized weather forecasts and heavy rain rumors circulating on messaging apps, students and faculty are hereby advised that all academic activities, scheduled laboratory sessions, and semester examinations across Kattankulathur campus will function normally as per the regular timetable. Any official circular will be published exclusively on the institutional registrar portal.',
          relevanceScore: 0.94,
          evidenceType: 'official',
          extractionMethod: 'semantic-passage-search',
          fetchStatus: 'accessible',
          matchedKeywords: ['srmist', 'kattankulathur', 'classes', 'circular', 'normal'],
        },
        {
          id: 'demo-evi-2',
          sourceId: 'src-tnsdma-gov',
          title: 'TNSDMA Weather Warning: Coastal District Holiday Advisory',
          url: 'https://tnsdma.tn.gov.in/press-release-weather-oct.html',
          publisher: 'Tamil Nadu State Disaster Management Authority',
          publishedAt: '2026-10-04T20:30:00Z',
          retrievedAt: new Date().toISOString(),
          excerpt:
            'District collectors have declared precautionary holiday for primary and secondary schools in Chennai and Tiruvallur districts; higher educational institutions remain subject to autonomous discretion and all colleges will function normally.',
          context:
            'Press Release: TNSDMA/2026/OCT-05. Moderate to heavy rainfall is anticipated along the coastal belt. District collectors have declared precautionary holiday for primary and secondary schools in Chennai and Tiruvallur districts; higher educational institutions remain subject to autonomous discretion and all colleges will function normally. No blanket state-wide college closure has been mandated by the government.',
          relevanceScore: 0.88,
          evidenceType: 'government',
          extractionMethod: 'semantic-passage-search',
          fetchStatus: 'accessible',
          matchedKeywords: ['rain', 'holiday', 'schools', 'district collector', 'disaster management'],
        },
        {
          id: 'demo-evi-3',
          sourceId: 'src-student-forward',
          title: 'Student WhatsApp Forwarded Circular',
          url: 'https://t.me/srm_community_updates/8812',
          publisher: 'Telegram Student Channel',
          publishedAt: '2026-10-05T02:15:00Z',
          retrievedAt: new Date().toISOString(),
          excerpt:
            'Classes are suspended tomorrow across Kattankulathur campus.',
          context:
            'Forwarded from batch rep: Urgent notice — Classes are suspended tomorrow across Kattankulathur campus. Stay safe in hostels.',
          relevanceScore: 0.82,
          evidenceType: 'social',
          extractionMethod: 'semantic-passage-search',
          fetchStatus: 'accessible',
          matchedKeywords: ['classes', 'suspended', 'tomorrow', 'kattankulathur'],
        },
        {
          id: 'demo-evi-4',
          sourceId: 'src-imd-bulletin',
          title: 'IMD Coastal District Meteorological Bulletin',
          url: 'https://imd.gov.in/press/bulletin-chennai-rain.html',
          publisher: 'India Meteorological Department (IMD)',
          publishedAt: '2026-10-04T22:00:00Z',
          retrievedAt: new Date().toISOString(),
          excerpt:
            'The India Meteorological Department issued a red alert warning for heavy rainfall across Chengalpattu and Chennai districts.',
          context:
            'Weather Bulletin: Active low pressure system over Bay of Bengal. The India Meteorological Department issued a red alert warning for heavy rainfall across Chengalpattu and Chennai districts over the next 24 to 36 hours. Fishermen are advised not to venture into deep sea areas.',
          relevanceScore: 0.65,
          evidenceType: 'government',
          extractionMethod: 'semantic-passage-search',
          fetchStatus: 'accessible',
          matchedKeywords: ['heavy rain', 'red alert', 'chengalpattu'],
        },
        {
          id: 'demo-evi-5',
          sourceId: 'src-student-blog',
          title: 'Campus Life Blog: Rain Discussion Thread',
          url: 'https://campusrumors.blog/oct5-forecast',
          publisher: 'Campus Rumors Blog',
          publishedAt: '2026-10-04T23:30:00Z',
          retrievedAt: new Date().toISOString(),
          excerpt:
            'Students speculate that SRM may be closed tomorrow if heavy rain continues into the night.',
          context:
            'Looking at the dark clouds gathering over Potheri, students speculate that SRM may be closed tomorrow if heavy rain continues into the night. No administrative confirmation has been issued yet.',
          relevanceScore: 0.55,
          evidenceType: 'secondary',
          extractionMethod: 'semantic-passage-search',
          fetchStatus: 'accessible',
          matchedKeywords: ['srm', 'rain', 'tomorrow'],
        },
        {
          id: 'demo-evi-6',
          sourceId: 'src-paywall-press',
          title: 'Regional Education Insider: Detailed Institutional Infrastructure Review',
          url: 'https://education-insider-premium.com/chennai-campus-updates',
          publisher: 'Education Insider Premium',
          retrievedAt: new Date().toISOString(),
          excerpt: '',
          context: undefined,
          relevanceScore: 0.0,
          evidenceType: 'secondary',
          extractionMethod: 'inaccessible-source-preserved',
          fetchStatus: 'inaccessible',
          inaccessibleReason:
            'Inaccessible: Authentication or subscription wall required (HTTP 403). EchoTrace strictly honors publisher access restrictions and never fabricates inaccessible content.',
          matchedKeywords: [],
        },
      ];
    }
    return [];
  });

  const toggleContext = (id: string) => {
    setExpandedContexts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Phase 6 Semantic Assessments (Element-by-Element Propositional Audit)
  const assessmentsMap = useMemo(() => {
    if (!claim || evidenceList.length === 0) return new Map<string, EvidenceAssessment>();
    const batch = evidenceAnalyzer.analyzeAllEvidence(claim, evidenceList);
    const map = new Map<string, EvidenceAssessment>();
    for (const a of batch.assessments) {
      map.set(a.evidenceId, a);
    }
    return map;
  }, [claim, evidenceList]);

  const batchStats = useMemo(() => {
    if (!claim || evidenceList.length === 0) return null;
    return evidenceAnalyzer.analyzeAllEvidence(claim, evidenceList);
  }, [claim, evidenceList]);

  // Results and Normalized Sources
  const results = searchResponse?.results || [];

  const demoSources: NormalizedSource[] = useMemo(() => {
    if (!isDemo || !claim) return [];
    return [
      {
        id: 'src-srm-reg',
        url: 'https://srmist.edu.in/announcements/circular-operations.pdf',
        domain: 'srmist.edu.in',
        name: 'SRMIST Office of the Registrar',
        type: 'Official notice',
        platform: 'web',
        reliability: 'high',
        status: 'Verified source',
        timestamp: '2026-10-04T18:00:00Z',
        authorHandle: 'Office of the Registrar',
        reach: 'Institutional (50,000+ students & staff)',
        publisher: 'SRM Institute of Science and Technology',
        publishedAt: '2026-10-04T18:00:00Z',
        retrievalTimestamp: new Date().toISOString(),
        reliabilityExplanation:
          'Published directly on authenticated institutional .edu.in academic domain under official executive authority.',
        contentFetchStatus: 'fetched',
        provenance: {
          originalQuery: 'SRMIST Chennai official circular holiday tomorrow',
          canonicalUrl: 'https://srmist.edu.in/announcements/circular-operations.pdf',
          searchProvider: 'WebSearchProvider',
          sourceTypeRank: 1,
          collectedAt: new Date().toISOString(),
        },
      },
      {
        id: 'src-tnsdma-gov',
        url: 'https://tnsdma.tn.gov.in/press-release-weather-oct.html',
        domain: 'tnsdma.tn.gov.in',
        name: 'Tamil Nadu State Disaster Management Authority',
        type: 'Government source',
        platform: 'web',
        reliability: 'high',
        status: 'Verified source',
        timestamp: '2026-10-04T20:30:00Z',
        authorHandle: 'TNSDMA Press Information Wing',
        reach: 'State-wide public reach',
        publisher: 'Tamil Nadu State Disaster Management Authority',
        publishedAt: '2026-10-04T20:30:00Z',
        retrievalTimestamp: new Date().toISOString(),
        reliabilityExplanation:
          'Official state sovereign government domain (.tn.gov.in) with statutory authority over disaster alerts.',
        contentFetchStatus: 'fetched',
        provenance: {
          originalQuery: 'TNSDMA coastal district rain holiday advisory',
          canonicalUrl: 'https://tnsdma.tn.gov.in/press-release-weather-oct.html',
          searchProvider: 'WebSearchProvider',
          sourceTypeRank: 2,
          collectedAt: new Date().toISOString(),
        },
      },
      {
        id: 'src-student-forward',
        url: 'https://t.me/srm_community_updates/8812',
        domain: 't.me',
        name: 'Student WhatsApp Forwarded Circular',
        type: 'Forwarded chat',
        platform: 'telegram',
        reliability: 'low',
        status: 'Unverified',
        timestamp: '2026-10-05T02:15:00Z',
        authorHandle: 'batch-rep-unverified',
        reach: '2,400 members',
        publisher: 'Telegram Student Channel',
        publishedAt: '2026-10-05T02:15:00Z',
        retrievalTimestamp: new Date().toISOString(),
        notes: 'Forwarded urgently without registrar stamp or signed authority.',
        reliabilityExplanation:
          'Unverified student message forward lacking institutional signature, cryptographic hash, or official domain hosting.',
        contentFetchStatus: 'fetched',
        provenance: {
          originalQuery: 'SRM holiday news student circular telegram',
          canonicalUrl: 'https://t.me/srm_community_updates/8812',
          searchProvider: 'WebSearchProvider',
          sourceTypeRank: 5,
          collectedAt: new Date().toISOString(),
        },
      },
      {
        id: 'src-imd-bulletin',
        url: 'https://imd.gov.in/press/bulletin-chennai-rain.html',
        domain: 'imd.gov.in',
        name: 'India Meteorological Department (IMD)',
        type: 'Government source',
        platform: 'web',
        reliability: 'high',
        status: 'Verified source',
        timestamp: '2026-10-04T22:00:00Z',
        authorHandle: 'Regional Meteorological Centre Chennai',
        reach: 'National public reach',
        publisher: 'India Meteorological Department (IMD)',
        publishedAt: '2026-10-04T22:00:00Z',
        retrievalTimestamp: new Date().toISOString(),
        reliabilityExplanation:
          'Sovereign Union Government scientific department (.gov.in) with official statutory weather forecasting jurisdiction.',
        contentFetchStatus: 'fetched',
        provenance: {
          originalQuery: 'IMD Chennai heavy rain bulletin October 5',
          canonicalUrl: 'https://imd.gov.in/press/bulletin-chennai-rain.html',
          searchProvider: 'WebSearchProvider',
          sourceTypeRank: 3,
          collectedAt: new Date().toISOString(),
        },
      },
      {
        id: 'src-student-blog',
        url: 'https://campusrumors.blog/oct5-forecast',
        domain: 'campusrumors.blog',
        name: 'Campus Rumors Blog',
        type: 'Blog',
        platform: 'web',
        reliability: 'unverified',
        status: 'Unverified',
        timestamp: '2026-10-04T23:30:00Z',
        authorHandle: 'anonymous-blogger',
        reach: '350 views',
        publisher: 'Campus Rumors Blog',
        publishedAt: '2026-10-04T23:30:00Z',
        retrievalTimestamp: new Date().toISOString(),
        notes: 'Speculative blog post discussing weather and potential closures.',
        reliabilityExplanation:
          'Personal blog post on generic open domain with no editorial oversight or verified administrative identity.',
        contentFetchStatus: 'fetched',
        provenance: {
          originalQuery: 'SRM classes suspended blog rumors',
          canonicalUrl: 'https://campusrumors.blog/oct5-forecast',
          searchProvider: 'WebSearchProvider',
          sourceTypeRank: 6,
          collectedAt: new Date().toISOString(),
        },
      },
      {
        id: 'src-paywall-press',
        url: 'https://education-insider-premium.com/chennai-campus-updates',
        domain: 'education-insider-premium.com',
        name: 'Education Insider Premium',
        type: 'News outlet',
        platform: 'web',
        reliability: 'medium',
        status: 'Needs verification',
        timestamp: '2026-10-04T19:00:00Z',
        reach: 'Subscription newsroom',
        publisher: 'Education Insider Premium',
        publishedAt: '2026-10-04T19:00:00Z',
        retrievalTimestamp: new Date().toISOString(),
        reliabilityExplanation:
          'Secondary commercial news outlet behind paywall; editorial staff exists but requires independent verification.',
        contentFetchStatus: 'unsupported',
        provenance: {
          originalQuery: 'SRM university weather holiday news Chennai',
          canonicalUrl: 'https://education-insider-premium.com/chennai-campus-updates',
          searchProvider: 'WebSearchProvider',
          sourceTypeRank: 4,
          collectedAt: new Date().toISOString(),
        },
      },
    ];
  }, [isDemo, claim]);

  const normalizedSources = useMemo(() => {
    if (!results.length) return demoSources;
    return collectSources(results).sources;
  }, [results, demoSources]);

  // Phase 7 Source Credibility Assessment Map
  const credibilityMap = useMemo(() => {
    const map = new Map<string, CredibilityAssessment>();
    for (const src of normalizedSources) {
      map.set(src.id, credibilityScorer.assessCredibility(src));
    }
    return map;
  }, [normalizedSources]);

  // Phase 8 Cross-Source Comparison & Multi-Evidence Synthesis
  const sourceComparison: SourceComparison | null = useMemo(() => {
    if (!claim || evidenceList.length === 0 || !batchStats) return null;
    const credList = Array.from(credibilityMap.values());
    return sourceComparator.compareSources(
      claim,
      evidenceList,
      batchStats.assessments,
      normalizedSources,
      credList
    );
  }, [claim, evidenceList, batchStats, normalizedSources, credibilityMap]);

  // Phase 9: Synchronize real extracted evidence and assessments with parent graph
  useEffect(() => {
    if (onEvidenceUpdated && evidenceList.length > 0 && batchStats?.assessments) {
      onEvidenceUpdated(evidenceList, batchStats.assessments, normalizedSources);
    }
  }, [evidenceList, batchStats, normalizedSources, onEvidenceUpdated]);

  // If no response yet but claim is available, generate the query plan for preview
  const queryPlan: SearchQueryPlan | null =
    searchResponse?.queryPlan || (claim ? evidenceSearch.generateQueryPlan(claim) : null);

  // Execute Search + Ingestion Pipeline
  const handleRunSearchAndExtraction = async () => {
    if (!claim) return;
    setIsLoadingSearch(true);
    try {
      // Step 1: Phase 3 Real Evidence Search
      const searchResp = await evidenceSearch.searchEvidence(claim, {
        providerOverride: selectedProvider,
      });
      setSearchResponse(searchResp);

      if (searchResp.results && searchResp.results.length > 0) {
        setIsFetchingContent(true);
        // Step 2: Phase 4 Source Normalization
        const normSources = collectSources(searchResp.results).sources;

        // Step 3: Phase 5 Safe Content Fetching & Passage Extraction
        const fetchedMap = await fetchBatchSources(normSources, {
          timeoutMs: 6000,
          concurrency: 3,
        });

        const batchResult = extractAllEvidence(claim, normSources, fetchedMap);
        setEvidenceList(batchResult.evidenceList);
        setActiveTab('evidence');
      }
    } catch (err: any) {
      console.error('Failed to execute search and evidence extraction:', err);
    } finally {
      setIsLoadingSearch(false);
      setIsFetchingContent(false);
    }
  };

  const getSourceTypeBadge = (sourceType: string, rank?: number) => {
    switch (sourceType) {
      case 'official':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
            <Building2 className="h-3 w-3" />
            RANK 1: OFFICIAL
          </span>
        );
      case 'government':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/70 text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
            <ShieldCheck className="h-3 w-3" />
            RANK 2: GOVERNMENT
          </span>
        );
      case 'primary':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/70 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300">
            <FileText className="h-3 w-3" />
            RANK 3: PRIMARY CIRCULAR
          </span>
        );
      case 'news':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/70 text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
            <Globe className="h-3 w-3" />
            RANK 4: NEWS
          </span>
        );
      case 'social_verified':
      case 'social':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/70 text-[11px] font-mono font-bold text-sky-700 dark:text-sky-300">
            <Radio className="h-3 w-3" />
            SOCIAL POST
          </span>
        );
      case 'secondary':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/70 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300">
            <Layers className="h-3 w-3" />
            SECONDARY SOURCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300">
            <Globe className="h-3 w-3" />
            {rank ? `RANK ${rank}: UNKNOWN` : 'UNKNOWN'}
          </span>
        );
    }
  };

  const getFetchStatusBadge = (status?: FetchStatus) => {
    switch (status) {
      case 'accessible':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle className="h-3 w-3" />
            ACCESSIBLE
          </span>
        );
      case 'partially_accessible':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
            <Info className="h-3 w-3" />
            PARTIALLY ACCESSIBLE
          </span>
        );
      case 'inaccessible':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <Lock className="h-3 w-3" />
            AUTH / PAYWALL RESTRICTED
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            <FileWarning className="h-3 w-3" />
            FETCH FAILED
          </span>
        );
    }
  };

  // Phase 6 Relationship Badge
  const getRelationshipBadge = (assessment?: EvidenceAssessment) => {
    if (!assessment) return null;

    switch (assessment.relationship) {
      case 'supports':
        return assessment.supportType === 'partial' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300">
            <CheckCircle2 className="h-3 w-3 text-cyan-600" />
            SUPPORTS (PARTIAL)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="h-3 w-3 text-emerald-600" />
            SUPPORTS CLAIM (FULL)
          </span>
        );
      case 'contradicts':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300">
            <ShieldAlert className="h-3 w-3 text-rose-600" />
            CONTRADICTS CLAIM
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
            <Info className="h-3 w-3 text-gray-500" />
            NEUTRAL / SPECULATIVE
          </span>
        );
      case 'insufficient':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
            <Lock className="h-3 w-3 text-amber-600" />
            INSUFFICIENT EVIDENCE
          </span>
        );
    }
  };

  const filteredEvidence = evidenceList.filter((e) => {
    const assessment = assessmentsMap.get(e.id);
    if (activeFilter === 'all') return true;
    if (activeFilter === 'supports') return assessment?.relationship === 'supports';
    if (activeFilter === 'contradicts') return assessment?.relationship === 'contradicts';
    if (activeFilter === 'neutral') return assessment?.relationship === 'neutral';
    if (activeFilter === 'insufficient') return assessment?.relationship === 'insufficient';
    if (activeFilter === 'official') return e.evidenceType === 'official';
    if (activeFilter === 'government') return e.evidenceType === 'government';
    if (activeFilter === 'news') return e.evidenceType === 'news';
    return true;
  });

  const filteredResults =
    activeFilter === 'all'
      ? results
      : results.filter((r) => r.sourceType === activeFilter);

  const filteredNormalizedSources =
    activeFilter === 'all'
      ? normalizedSources
      : normalizedSources.filter((s) => {
          if (activeFilter === 'official') return s.type === 'Official notice';
          if (activeFilter === 'government') return s.type === 'Government source';
          if (activeFilter === 'news') return s.type === 'News outlet';
          return true;
        });

  const status = searchResponse?.status || (isDemo ? 'demo_preserved' : 'uninitiated');

  return (
    <div className="rounded-2xl border-2 border-indigo-500/30 bg-white dark:bg-[#111622] p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.08)] transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
              Phase 3–8 Forensic Pipeline
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
              CROSS-SOURCE SYNTHESIS ACTIVE
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-[#111827] dark:text-white mt-1">
            Claim Evidence & Cross-Source Synthesis
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Independent voice deduplication, syndication clustering, conflict mapping, and multi-source consistency evaluation.
          </p>
        </div>

        {/* Action buttons & provider switch */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
            >
              <option value="WebSearchProvider" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                WebSearchProvider
              </option>
              <option value="OfficialSourceProvider" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                OfficialSourceProvider
              </option>
            </select>
          </div>

          {claim && (
            <button
              onClick={handleRunSearchAndExtraction}
              disabled={isLoadingSearch || isFetchingContent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSearch || isFetchingContent ? 'animate-spin' : ''}`} />
              <span>
                {isLoadingSearch
                  ? 'Searching Web...'
                  : isFetchingContent
                  ? 'Analyzing Stance...'
                  : searchResponse
                  ? 'Re-run Pipeline'
                  : 'Execute Live Pipeline'}
              </span>
            </button>
          )}

          {queryPlan && (
            <button
              onClick={() => setShowQueryPlan((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#4F46E5] dark:text-indigo-400" />
              <span>{showQueryPlan ? 'Hide Queries' : 'Inspect Queries (5)'}</span>
              {showQueryPlan ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Query Strategy Inspector Accordion */}
      {showQueryPlan && queryPlan && (
        <div className="mt-5 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              5-Angle Query Strategy (Formulated from Extracted Claim)
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              Claim ID: #{queryPlan.claimId}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {queryPlan.queries.map((q, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] uppercase text-[#4F46E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                    Strategy {idx + 1}: {q.kind.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="font-mono font-bold text-gray-900 dark:text-white pt-1">
                  “{q.query}”
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                  {q.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 6 Batch Assessment Summary Bar */}
      {batchStats && (
        <div className="mt-5 p-4 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-indigo-100 dark:border-indigo-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400 shrink-0" />
            <span className="font-bold text-gray-700 dark:text-gray-300">
              Phase 6 Stance Distribution ({batchStats.assessments.length} audited items):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
              Supports: {batchStats.supportsCount} ({batchStats.partialSupportsCount} partial)
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
              Contradicts: {batchStats.contradictsCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-300 font-bold border border-gray-300 dark:border-gray-700">
              Neutral / Speculative: {batchStats.neutralCount}
            </span>
            {batchStats.insufficientCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                Insufficient: {batchStats.insufficientCount}
              </span>
            )}
            {sourceComparison && (
              <span
                className={`px-2 py-0.5 rounded font-bold border ${
                  sourceComparison.overallConsistency === 'consistent'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : sourceComparison.overallConsistency === 'contradictory'
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    : sourceComparison.overallConsistency === 'mixed'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}
              >
                Consistency: {sourceComparison.overallConsistency.toUpperCase()} ({sourceComparison.independentSupportCount} indep. supp vs {sourceComparison.independentContradictionCount} indep. cont)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Multi-Phase Tab Navigation */}
      {(evidenceList.length > 0 || results.length > 0) && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            {/* 3 Pipeline Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-xs font-mono">
              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'evidence'
                    ? 'bg-white dark:bg-[#111622] text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                <span>Phase 6: Stance Assessments ({evidenceList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('normalized')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'normalized'
                    ? 'bg-white dark:bg-[#111622] text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Phase 4 & 7: Source Credibility ({normalizedSources.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'comparison'
                    ? 'bg-white dark:bg-[#111622] text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>Phase 8: Comparison ({sourceComparison?.independentVoices?.length || 0} Voices)</span>
              </button>

              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'raw'
                    ? 'bg-white dark:bg-[#111622] text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Phase 3: Raw Results ({results.length})</span>
              </button>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-gray-400">Filter:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'supports', label: 'Supports' },
                { id: 'contradicts', label: 'Contradicts' },
                { id: 'neutral', label: 'Neutral' },
                { id: 'insufficient', label: 'Insufficient' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                    activeFilter === f.id
                      ? 'bg-[#4F46E5] text-white font-bold'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: PHASE 6 EXTRACTED EVIDENCE & SEMANTIC STANCE ASSESSMENTS */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {filteredEvidence.map((evi) => {
                const assessment = assessmentsMap.get(evi.id);
                const isExpanded = Boolean(expandedContexts[evi.id]);
                const isAccessible =
                  evi.fetchStatus === 'accessible' || evi.fetchStatus === 'partially_accessible';

                return (
                  <div
                    key={evi.id}
                    className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3.5 shadow-2xs"
                  >
                    {/* Header Badges & Source Link */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Phase 6 Prominent Stance Badge */}
                        {getRelationshipBadge(assessment)}

                        {getSourceTypeBadge(evi.evidenceType)}
                        {getFetchStatusBadge(evi.fetchStatus)}

                        {evi.relevanceScore > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[#4F46E5] dark:text-indigo-300">
                            <Sparkles className="h-3 w-3" />
                            {Math.round(evi.relevanceScore * 100)}% RELEVANCE
                          </span>
                        )}

                        {evi.publisher && (
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 font-semibold">
                            Publisher: <strong>{evi.publisher}</strong>
                          </span>
                        )}
                      </div>

                      {evi.url && (
                        <a
                          href={evi.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          <span>Visit Document</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Source Document Title */}
                    <h4 className="text-sm font-bold text-[#111827] dark:text-white leading-snug">
                      {evi.title}
                    </h4>

                    {/* Excerpt Box (When accessible) */}
                    {isAccessible && evi.excerpt && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-[#4F46E5] dark:text-indigo-400">
                          <Quote className="h-3.5 w-3.5" />
                          <span>Extracted Passage (Directly from Fetched Page Content):</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-gray-900 dark:text-gray-100 font-medium leading-relaxed font-sans pl-1">
                          “{evi.excerpt}”
                        </p>
                      </div>
                    )}

                    {/* Phase 6 Semantic Assessment & Element Audit Box */}
                    {assessment && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs space-y-2 font-sans ${
                          assessment.relationship === 'supports'
                            ? assessment.supportType === 'partial'
                              ? 'bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900'
                              : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                            : assessment.relationship === 'contradicts'
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                            : assessment.relationship === 'neutral'
                            ? 'bg-gray-50/90 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800'
                            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-gray-600 dark:text-gray-300">
                            <Scale className="h-3.5 w-3.5 text-[#4F46E5] dark:text-indigo-400" />
                            <span>Phase 6 Propositional Audit Rationale:</span>
                          </div>

                          {assessment.supportType === 'partial' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-200/80 dark:bg-cyan-900/80 text-cyan-950 dark:text-cyan-200">
                              CAUSALITY NOT ESTABLISHED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-sans font-medium">
                          {assessment.explanation}
                        </p>

                        {/* Matched Claim Elements Pills */}
                        {assessment.matchedClaimElements.length > 0 && (
                          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            <span className="text-gray-500 font-semibold">Matched Elements:</span>
                            {assessment.matchedClaimElements.map((elem, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold"
                              >
                                {elem}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Surrounding Context Accordion (Critical Anti-Deception Feature) */}
                    {evi.context && evi.context !== evi.excerpt && (
                      <div className="pt-1">
                        <button
                          onClick={() => toggleContext(evi.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-600 dark:text-gray-400 hover:text-[#4F46E5] dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isExpanded
                              ? 'Hide Surrounding Context'
                              : 'Inspect Surrounding Paragraph Context (Prevents Out-Of-Context Deception)'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-1.5 animate-fadeIn">
                            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Enclosing Paragraph Context (Full Authenticity Audit):
                            </span>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans italic bg-white dark:bg-[#111622] p-2.5 rounded border border-gray-100 dark:border-gray-800">
                              {evi.context}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Provenance & Extraction Audit Footer */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800 gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          Method:{' '}
                          <strong className="text-gray-600 dark:text-gray-300">
                            {evi.extractionMethod}
                          </strong>
                        </span>
                        {evi.matchedKeywords && evi.matchedKeywords.length > 0 && (
                          <span>
                            | Matched: [{evi.matchedKeywords.slice(0, 4).join(', ')}]
                          </span>
                        )}
                      </div>
                      <span>
                        Retrieved:{' '}
                        {new Date(evi.retrievedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: PHASE 4 & 7 SOURCE CREDIBILITY ASSESSMENTS */}
          {activeTab === 'normalized' && (
            <div className="space-y-4">
              {/* Epistemic Principle Callout */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-mono font-bold uppercase tracking-wider text-[11px] block text-amber-800 dark:text-amber-300">
                    Epistemic Principle: Source Reliability ≠ Claim Truth
                  </span>
                  <p className="leading-relaxed text-[11px]">
                    Reliability measures institutional authority, publisher identity, primary provenance, and independent verifiability. A high-reliability source can contradict a claim, while a low-reliability anonymous post might happen to be true. No overall claim verdict is computed here.
                  </p>
                </div>
              </div>

              {filteredNormalizedSources.map((src) => {
                const cred = credibilityMap.get(src.id) || credibilityScorer.assessCredibility(src);
                const hasSpoofingFlag = cred.flags?.includes('SPOOFED_OFFICIAL_CLAIM_ON_OPEN_HOST');
                const hasViralFlag = cred.flags?.includes('VIRAL_UNVERIFIED_AMPLIFICATION');

                return (
                  <div
                    key={src.id}
                    className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3.5 shadow-2xs"
                  >
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Reliability Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                            cred.reliability === 'high'
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                              : cred.reliability === 'medium'
                              ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                              : cred.reliability === 'low'
                              ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                              : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {cred.reliability === 'high' && <ShieldCheck className="h-3.5 w-3.5" />}
                          {cred.reliability === 'medium' && <Shield className="h-3.5 w-3.5" />}
                          {cred.reliability === 'low' && <AlertTriangle className="h-3.5 w-3.5" />}
                          {cred.reliability === 'unverified' && <HelpCircle className="h-3.5 w-3.5" />}
                          RELIABILITY: {cred.reliability.toUpperCase()} ({cred.score}/100)
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-[11px] font-mono font-bold text-[#4F46E5] dark:text-indigo-400">
                          {src.type.toUpperCase()}
                        </span>

                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 font-semibold">
                          Domain: <strong>{src.domain}</strong>
                        </span>
                      </div>

                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <span>Inspect Origin</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Source Title & Score Meter */}
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-[#111827] dark:text-white leading-snug">
                        {src.name}
                      </h4>
                      {/* Score Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              cred.score >= 75
                                ? 'bg-emerald-500'
                                : cred.score >= 50
                                ? 'bg-amber-500'
                                : cred.score >= 20
                                ? 'bg-rose-500'
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${cred.score}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300 shrink-0">
                          {cred.score}/100 pts
                        </span>
                      </div>
                    </div>

                    {/* Anti-Spoofing Alert */}
                    {hasSpoofingFlag && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300 font-mono">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>
                          <strong>Anti-Spoofing Defense:</strong> Document claims 'official' circular status, but host is an unverified user platform lacking institutional domain control (-30 penalty).
                        </span>
                      </div>
                    )}

                    {/* Anti-Popularity Alert */}
                    {hasViralFlag && (
                      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-mono">
                        <Info className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          <strong>Anti-Popularity Safeguard:</strong> Viral audience reach detected ({src.reach}). Large reach does NOT substitute for verifiable institutional provenance.
                        </span>
                      </div>
                    )}

                    {/* 10-Factor Explainable Reasons */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-[#4F46E5] dark:text-indigo-400">
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>Transparent Credibility Assessment Audit ({cred.reasons.length} Factors):</span>
                      </div>
                      <ul className="space-y-1 pl-1 font-sans text-gray-700 dark:text-gray-300">
                        {cred.reasons.map((reason, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1.5 leading-relaxed text-xs">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Limitations Callout Box */}
                    {cred.limitations.length > 0 && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">
                          <Info className="h-3.5 w-3.5 text-slate-500" />
                          <span>Auditing Limitations & Disclaimers ({cred.limitations.length}):</span>
                        </div>
                        <ul className="space-y-1 pl-1 font-sans text-slate-600 dark:text-slate-300">
                          {cred.limitations.map((lim, lIdx) => (
                            <li key={lIdx} className="flex items-start gap-1.5 leading-relaxed text-[11px] italic">
                              <span className="text-slate-400 mt-0.5">•</span>
                              <span>{lim}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Original Snippet if present */}
                    {src.snippet && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans italic bg-white dark:bg-[#111622] p-2.5 rounded border border-gray-100 dark:border-gray-800">
                        “{src.snippet}”
                      </p>
                    )}

                    {/* Provenance Footer */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
                      <span className="truncate max-w-sm">
                        Query: <em>“{src.provenance?.originalQuery || 'N/A'}”</em>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                          Phase 5: {src.contentFetchStatus?.toUpperCase()} INGESTION
                        </span>
                        <span>{src.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: PHASE 8 CROSS-SOURCE COMPARISON & MULTI-EVIDENCE SYNTHESIS */}
          {activeTab === 'comparison' && sourceComparison && (
            <div className="space-y-4">
              {/* Overall Epistemic Consistency Banner */}
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70 dark:from-[#111622] dark:via-[#161f30] dark:to-[#111622] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Cross-Source Synthesis Consistency:
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                      sourceComparison.overallConsistency === 'consistent'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                        : sourceComparison.overallConsistency === 'contradictory'
                        ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                        : sourceComparison.overallConsistency === 'mixed'
                        ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    OVERALL CONSISTENCY: {sourceComparison.overallConsistency.toUpperCase()}
                  </span>
                </div>

                {/* 4 Key Forensic Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 text-center space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block">
                      Indep. Support
                    </span>
                    <span className="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {sourceComparison.independentSupportCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 text-center space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block">
                      Indep. Contradict
                    </span>
                    <span className="text-lg font-mono font-extrabold text-rose-600 dark:text-rose-400">
                      {sourceComparison.independentContradictionCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 text-center space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block">
                      Primary Sources
                    </span>
                    <span className="text-lg font-mono font-extrabold text-[#4F46E5] dark:text-indigo-400">
                      {sourceComparison.primaryConfirmationCount || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 text-center space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block">
                      Syndicated Echoes
                    </span>
                    <span className="text-lg font-mono font-extrabold text-amber-600 dark:text-amber-400">
                      {sourceComparison.secondaryConfirmationCount || 0}
                    </span>
                  </div>
                </div>

                {/* Synthesis Rationale */}
                {sourceComparison.synthesisRationale && (
                  <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-1">
                    {sourceComparison.synthesisRationale.map((note, nIdx) => (
                      <p key={nIdx} className="text-xs text-gray-600 dark:text-gray-300 font-sans leading-relaxed">
                        • {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Anti-Echo-Chamber Syndication Safeguard Callout */}
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                <Layers className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-mono font-bold uppercase tracking-wider text-[11px] block text-[#4F46E5] dark:text-indigo-300">
                    Syndication Safeguard: 1 Primary Document + Secondary Confirmations
                  </span>
                  <p className="leading-relaxed text-[11px]">
                    EchoTrace identifies when multiple news outlets or social posts repeat the same circular or wire dispatch. 10 news sites copying 1 official statement are treated as 1 primary source + 9 secondary confirmations — never 10 independent confirmations.
                  </p>
                </div>
              </div>

              {/* Shared Origin Clusters */}
              {sourceComparison.clusters && sourceComparison.clusters.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    <Network className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400" />
                    <span>Deduplicated Shared-Origin Clusters ({sourceComparison.clusters.length}):</span>
                  </div>

                  {sourceComparison.clusters.map((cluster) => (
                    <div
                      key={cluster.clusterId}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-300 font-mono font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                          {cluster.clusterType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">
                          {cluster.evidenceIds.length} Linked Documents Consolidated
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-gray-300 font-sans leading-relaxed">
                        {cluster.explanation}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-gray-500">
                        <span className="font-bold text-gray-600 dark:text-gray-400">Participating Outlets:</span>
                        {cluster.publishers.map((pub, pIdx) => (
                          <span key={pIdx} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {pub}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pairwise Cross-Source Conflicts */}
              {sourceComparison.conflicts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Detected Cross-Source Conflicts ({sourceComparison.conflicts.length}):</span>
                  </div>

                  {sourceComparison.conflicts.map((conflict, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                          <span>{conflict.sourceA}</span>
                          <span className="text-rose-400">⚡ vs ⚡</span>
                          <span>{conflict.sourceB}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 font-bold text-[10px] uppercase">
                          Conflict #{cIdx + 1}
                        </span>
                      </div>

                      <p className="text-xs text-rose-900/90 dark:text-rose-200/90 font-sans leading-relaxed">
                        {conflict.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Temporal Timeline Evolution */}
              {sourceComparison.temporalEvolution?.timelineNote && (
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center gap-2.5 text-xs font-mono text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400 shrink-0" />
                  <span>{sourceComparison.temporalEvolution.timelineNote}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PHASE 3 RAW PROVIDER RESULTS */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              {filteredResults.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getSourceTypeBadge(item.sourceType, item.priorityRank)}
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {item.publisher}
                      </span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <span>Visit Source</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <h4 className="text-sm font-bold text-[#111827] dark:text-white leading-snug">
                    {item.title}
                  </h4>

                  {item.snippet && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 font-sans">
                      “{item.snippet}”
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 dark:text-gray-500 pt-1">
                    <span className="truncate max-w-sm">
                      Matched Query: <em>“{item.query}”</em>
                    </span>
                    <span>Retrieved: {new Date(item.retrievedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
