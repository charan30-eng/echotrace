<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# EchoTrace: Forensic Misinformation & Claim Tracing Engine

This repository contains the full multi-phase EchoTrace verification system.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Architectural Phases

- **Phase 1**: Normalized Investigation Input & Historical Scenarios
- **Phase 2**: Structured Propositional Claim Deconstruction
- **Phase 3**: Real Evidence Search & Multi-Angle Query Formulation
- **Phase 4**: Source Collection & Provenance Normalization
- **Phase 5**: Safe Source Content Fetching & Passage Evidence Extraction
  - **Endpoint**: `/api/fetch` (Node.js security gateway)
  - **Respects**: `robots.txt`, domain rate limits (600ms pacing), timeouts (7s), paywalls, and auth walls (HTTP 401/403)
  - **Guarantees**: Zero fake text; extracts 1-2 sentence excerpts alongside enclosing paragraph context to prevent out-of-context cherry-picking
  - **Model**: Standardized `Evidence` record (`id`, `sourceId`, `title`, `url`, `publisher`, `publishedAt`, `retrievedAt`, `excerpt`, `context`, `relevanceScore`, `evidenceType`, `extractionMethod`)
- **Phase 6**: Semantic Stance Analysis (Claim + Evidence → Support / Contradiction / Neutral)
  - **Service**: `src/services/evidenceAnalyzer.ts`
  - **Categories**: `supports` (full or partial), `contradicts`, `neutral`, `insufficient`
  - **Credibility Independence**: Source authority is audited separately from semantic stance (e.g. credible gov page can contradict; social rumor can support)
  - **Modality & Negation**: `"may be closed"` != `"is closed"`; `"not closed"` == contradiction to `"is closed"`
  - **Partial Support**: Identifies when core action is supported (e.g. classes suspended) but underlying cause (e.g. heavy rain) is unestablished

- **Phase 7**: Source Credibility & Reliability Scorer (Source + Provenance + Metadata → Reliability)
  - **Service**: `src/services/credibilityScorer.ts`
  - **Model**: `CredibilityAssessment` (`sourceId`, `reliability`, `score`, `reasons`, `limitations`, `breakdown`, `flags`)
  - **Tiers**: `high` (75–100), `medium` (50–74), `low` (20–49), `unverified` (0–19)
  - **Epistemic Separation**: Reliability is NOT truth. A source can be highly reliable while contradicting a claim; an unreliable source can contain statements that happen to be correct.
  - **10 Forensic Factors**:
    1. Official domain authority (`.edu.in`, `.ac.in`, `.edu`)
    2. Sovereign government domain (`.gov.in`, `.nic.in`)
    3. Institutional ownership verification
    4. Publisher identity & accredited journalistic registry
    5. Primary documentary status (signed circulars, office orders, PDFs) vs. secondary wire reporting
    6. Author identification & formal administrative office detection (Registrar, Collector, etc.)
    7. Publication date & timestamp authentication
    8. Source provenance audit trail
    9. Direct attributability & administrative reference citation numbers
    10. Independent verifiability via public canonical URLs
  - **Safeguards**:
    - Anti-spoofing defense: penalizes (-30 pts) and flags `SPOOFED_OFFICIAL_CLAIM_ON_OPEN_HOST` when open hosts (Telegram, Reddit, Blogspot) claim "official circular" status.
    - Anti-popularity safeguard: flags `VIRAL_UNVERIFIED_AMPLIFICATION` to enforce that audience reach does not equal credibility.
    - Mandatory contextual limitations generated for every source.
  - **Verdict Boundary**: Strictly isolates source reliability without jumping to an early claim verdict.
- **Phase 8**: Cross-Source Comparison & Multi-Evidence Synthesis (Claim + Multiple Evidence → Cross-Source Comparison)
  - **Service**: `src/services/sourceComparator.ts`
  - **Model**: `SourceComparison` (`supportingEvidence`, `contradictingEvidence`, `neutralEvidence`, `independentSupportCount`, `independentContradictionCount`, `conflicts`, `overallConsistency`, `clusters`, `independentVoices`)
  - **Deduplication of Reporting**: 10 news sites copying 1 official circular are treated as:
    `1 primary source + 9 secondary confirmations` (never 10 independent confirmations).
  - **Consolidation**: Merges repeated URLs under the same publisher/domain into 1 independent voice.
  - **Pairwise Conflict Mapping**: Detects direct contradictions, scope discrepancies (e.g. primary school holiday vs collegiate normal schedule), credibility asymmetries, and modality clashes.
  - **Overall Consistency**: `consistent` | `mixed` | `contradictory` | `insufficient`.
  - **Verdict Boundary**: Strictly performs cross-source comparative synthesis without prematurely producing the final claim verdict.

- **Phase 9**: Evidence Graph & Claim Lineage Integration (Claim + Sources + Evidence + Relationships → Evidence Graph)
  - **Service**: `src/services/evidenceGraphBuilder.ts`
  - **Topology**: Connects the real evidence pipeline (Phases 3–8) directly to EchoTrace's lineage graph (`EvolutionGraph.tsx`).
  - **Graph Nodes**:
    1. **Original Claim Node**: Root investigated claim proposition (`type: 'original'`).
    2. **Supporting Evidence Nodes**: Real authenticated excerpts affirming claim elements (`type: 'evidence'`, `evidenceRelationship: 'supports'`).
    3. **Contradicting Evidence Nodes**: Official notices and verified records denying claim propositions (`type: 'conflicting'`, `evidenceRelationship: 'contradicts'`).
    4. **Source Authority Nodes**: Institutional entities, registrars, and government bodies (`relationship: 'publishing_authority'`).
    5. **Related Claim / Variant Nodes**: Peer-to-peer forwarded rumor drift preserved from lineage history (`type: 'modified'`).
  - **Graph Edges**:
    - `supports`: Directed link from claim to supporting proof.
    - `contradicts` / `refuted by`: Directed link from claim to contradicting proof or authoritative refutation.
    - `published by`: Directed link from evidence excerpt to its publishing institution.
    - `corroborates`: Directed link from secondary news items to primary circulars.
    - `derived from` / `mutated`: Directed link from claim to lateral social variants.
  - **Metadata Retention Guarantee**: Every evidence node strictly retains `sourceId`, `url`, `excerpt`, `timestamp`, `evidenceRelationship`, `reliability`, and `whyItMatters`.
  - **Strict Non-Fabrication**: Zero fake or hallucinated nodes; only real pipeline evidence is rendered.
  - **UI Integration (`EvolutionGraph.tsx`)**:
    - Multi-column DAG network layout (Col 0: Claim & Lineage, Col 1: Real Evidence, Col 2: Sources).
    - Preserves zoom, node selection, network/timeline views, and design system.
    - Interactive inspection displaying source, clickable URL, excerpt blockquote, support/contradiction badge, reliability grade, and forensic significance.

## Verification & Tests

```bash
npm run test:phase3  # Phase 3 Real Evidence Search
npm run test:phase4  # Phase 4 Source Collection & Normalization
npm run test:phase5  # Phase 5 Safe Content Fetching & Evidence Extraction
npm run test:phase6  # Phase 6 Semantic Stance Analysis (Support / Contradict / Neutral)
npm run test:phase7  # Phase 7 Source Credibility & Reliability Scoring
npm run test:phase8  # Phase 8 Cross-Source Comparison & Synthesis
npm run test:phase9  # Phase 9 Evidence Graph Construction & Lineage Integration
npm run lint         # TypeScript Compilation Check
npm run build        # Production Bundle Build
```