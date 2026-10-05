/**
 * EchoTrace Phase 12: Client Investigation Persistence Service
 * 
 * Formal Architecture:
 * Frontend UI → Client Investigation Service → Backend API (/api/investigations) → Storage Adapter
 * 
 * Seamless bidirectional bridging between `ClaimAnalysis` (UI state) and `InvestigationRecord` (Persistent schema).
 * Provides robust fallback to browser localStorage if the backend API server is offline or unreachable.
 */

import {
  InvestigationRecord,
  CreateInvestigationInput,
  InvestigationSummary,
  InvestigationApiResponse,
} from '../types/investigationRecord.ts';
import { ClaimAnalysis, VariantNode, GraphEdge, Source } from '../types/claim.ts';
import { Verdict } from '../types/verdict.ts';
import { verdictEngine } from './verdictEngine.ts';
import { claimExtractor } from './claimExtractor.ts';

const LOCAL_STORAGE_KEY = 'echotrace_persisted_investigations_v1';

export interface StorageStatus {
  backend: 'api' | 'local_storage';
  serverReachable: boolean;
  message: string;
}

class InvestigationService {
  private lastKnownBackend: 'api' | 'local_storage' = 'api';

  /**
   * Test backend API connectivity.
   */
  async getStorageStatus(): Promise<StorageStatus> {
    try {
      const res = await fetch('/api/investigations?summary=true', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        this.lastKnownBackend = 'api';
        return {
          backend: 'api',
          serverReachable: true,
          message: 'Connected to EchoTrace Backend API (Persistent Disk Storage)',
        };
      }
    } catch {
      // API unreachable
    }

    this.lastKnownBackend = 'local_storage';
    return {
      backend: 'local_storage',
      serverReachable: false,
      message: 'Local Cache Active (Browser Storage)',
    };
  }

  /**
   * Retrieve all persisted investigations.
   */
  async getInvestigations(): Promise<InvestigationRecord[]> {
    try {
      const res = await fetch('/api/investigations', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const json: InvestigationApiResponse<InvestigationRecord[]> = await res.json();
        if (json.success && Array.isArray(json.data)) {
          this.lastKnownBackend = 'api';
          // Also sync to local storage as client cache
          this.syncToLocalStorage(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[EchoTrace:InvestigationService] Failed to fetch from /api/investigations, falling back to local storage:', err);
    }

    // Fallback: browser local storage
    this.lastKnownBackend = 'local_storage';
    return this.getFromLocalStorage();
  }

  /**
   * Retrieve single investigation by ID.
   */
  async getInvestigationById(id: string): Promise<InvestigationRecord | null> {
    try {
      const res = await fetch(`/api/investigations/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const json: InvestigationApiResponse<InvestigationRecord> = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn(`[EchoTrace:InvestigationService] Failed to fetch /api/investigations/${id}:`, err);
    }

    // Fallback to local storage lookup
    const list = this.getFromLocalStorage();
    return list.find((item) => item.id === id) || null;
  }

  /**
   * Persist a complete investigation record.
   */
  async saveInvestigation(
    recordOrAnalysis: InvestigationRecord | CreateInvestigationInput | ClaimAnalysis
  ): Promise<InvestigationRecord> {
    let payload: InvestigationRecord;

    if ('claim' in recordOrAnalysis && 'input' in recordOrAnalysis && 'verdict' in recordOrAnalysis) {
      payload = recordOrAnalysis as InvestigationRecord;
    } else {
      payload = this.analysisToInvestigationRecord(recordOrAnalysis as ClaimAnalysis);
    }

    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json: InvestigationApiResponse<InvestigationRecord> = await res.json();
        if (json.success && json.data) {
          this.lastKnownBackend = 'api';
          this.saveToLocalStorage(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[EchoTrace:InvestigationService] Backend API save failed, saving to local storage:', err);
    }

    // Fallback save to local storage
    this.lastKnownBackend = 'local_storage';
    return this.saveToLocalStorage(payload);
  }

  /**
   * Delete an investigation by ID.
   */
  async deleteInvestigation(id: string): Promise<boolean> {
    let apiSuccess = false;
    try {
      const res = await fetch(`/api/investigations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json: InvestigationApiResponse<any> = await res.json();
        apiSuccess = json.success;
      }
    } catch (err) {
      console.warn(`[EchoTrace:InvestigationService] Failed to delete on /api/investigations/${id}:`, err);
    }

    // Always delete from local storage cache as well
    const localSuccess = this.deleteFromLocalStorage(id);
    return apiSuccess || localSuccess;
  }

  // ==========================================
  // Schema Conversion Helpers
  // ==========================================

  /**
   * Converts a ClaimAnalysis (UI presentation object) into a complete InvestigationRecord.
   */
  analysisToInvestigationRecord(analysis: ClaimAnalysis, explicitVerdict?: Verdict): InvestigationRecord {
    const now = new Date().toISOString();
    const id = analysis.id || `inv-${Date.now()}`;

    // Ensure extracted claim is populated
    const extracted =
      analysis.extractedClaim ||
      claimExtractor.extract(analysis.inputClaim || analysis.text, id).primaryClaim;

    // Ensure verdict is evaluated
    const verdict =
      explicitVerdict ||
      analysis.verdict ||
      verdictEngine.evaluateClaimAnalysis(analysis);

    return {
      id,
      input: analysis.investigationInput || {
        id: `input-${id}`,
        inputType: 'text',
        rawInput: analysis.inputClaim || analysis.text,
        submittedAt: now,
        metadata: {
          charCount: (analysis.inputClaim || analysis.text).length,
          wordCount: (analysis.inputClaim || analysis.text).split(/\s+/).filter(Boolean).length,
          isDemo: analysis.isDemo,
        },
      },
      claim: extracted,
      sources: analysis.sources || [],
      evidence: analysis.evidenceItems || [],
      assessments: analysis.evidenceAssessments || [],
      comparison: analysis.sourceComparison || {
        supportingEvidence: [],
        contradictingEvidence: [],
        neutralEvidence: [],
        independentSupportCount: 0,
        independentContradictionCount: 0,
        conflicts: [],
        overallConsistency: 'insufficient',
        comparedAt: now,
      },
      graph: {
        nodes: analysis.nodes || [],
        edges: analysis.edges || [],
      },
      verdict,
      createdAt: analysis.analysisDate || now,
      updatedAt: now,
    };
  }

  /**
   * Converts an InvestigationRecord (persistent entity) back into a ClaimAnalysis
   * so it can be seamlessly loaded and navigated in Dashboard.tsx.
   */
  investigationRecordToAnalysis(record: InvestigationRecord): ClaimAnalysis {
    const isUnverified = record.verdict?.status === 'unverified';
    const scoreVal = isUnverified
      ? 0
      : record.verdict?.status === 'supported'
      ? Math.round(75 + record.verdict.confidence * 25)
      : record.verdict?.status === 'contradicted'
      ? Math.round(10 + (1 - record.verdict.confidence) * 20)
      : record.verdict?.status === 'mixed'
      ? 50
      : 25;

    const statusVal: ClaimAnalysis['status'] =
      isUnverified
        ? 'Unverified'
        : scoreVal < 30
        ? 'Low credibility'
        : scoreVal < 60
        ? 'Needs review'
        : 'High credibility';

    // Derive factor cards
    const factors: ClaimAnalysis['factors'] = record.verdict?.keyFactors?.length
      ? record.verdict.keyFactors.map((kf) => ({
          name: kf.name,
          score: kf.impact === 'positive' ? 85 : kf.impact === 'negative' ? 20 : 50,
          explanation: kf.explanation,
          impact: kf.impact,
        }))
      : [
          {
            name: 'Documentary Provenance',
            score: record.sources.some((s) => s.reliability === 'high') ? 85 : 40,
            explanation: 'Based on cataloged sources and domain authorities.',
            impact: 'positive',
          },
          {
            name: 'Corroboration Consistency',
            score: record.verdict?.status === 'supported' ? 90 : 25,
            explanation: record.verdict?.explanation || 'Cross-source alignment.',
            impact: record.verdict?.status === 'supported' ? 'positive' : 'negative',
          },
        ];

    return {
      id: record.id,
      text: record.claim.claimText,
      inputClaim: record.input.rawInput,
      score: scoreVal,
      status: statusVal,
      timestamp: new Date(record.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      analysisDate: record.createdAt,
      isDemo: record.input.metadata?.isDemo || false,
      coreClaim: record.claim.claimText,
      summaryReasoning: record.verdict.explanation,
      detailedReasoning: [
        `Epistemic Status: ${record.verdict.status.replace('_', ' ').toUpperCase()}`,
        `Evidence Confidence: ${Math.round(record.verdict.confidence * 100)}% based on available sources`,
        `Supporting Evidence Items: ${record.verdict.supportingEvidenceIds.length}`,
        `Contradicting Evidence Items: ${record.verdict.contradictingEvidenceIds.length}`,
        ...record.verdict.limitations.map((lim) => `Boundary: ${lim}`),
      ],
      factors,
      nodes: record.graph?.nodes || [],
      edges: record.graph?.edges || [],
      sources: record.sources || [],
      recommendation:
        record.verdict.status === 'contradicted'
          ? 'Official primary evidence refutes this statement. Mark as unsubstantiated rumor.'
          : record.verdict.status === 'supported'
          ? 'Supported by verified primary documentation.'
          : 'Exercise caution; corroborated consensus not yet established.',
      investigationInput: record.input,
      extractedClaim: record.claim,
      evidenceItems: record.evidence,
      evidenceAssessments: record.assessments,
      sourceComparison: record.comparison,
      verdict: record.verdict,
      forensicSummary: {
        originChannel: record.input.platform || 'Direct Submission',
        driftSeverity: record.graph.nodes.length > 2 ? 'Moderate' : 'None',
        contradictionDetected: record.verdict.contradictingEvidenceIds.length > 0,
        officialConfirmationState:
          record.verdict.status === 'supported'
            ? 'Supports claim'
            : record.verdict.status === 'contradicted'
            ? 'Contradicts claim'
            : 'Unverified / Pending',
        estimatedSpread: 'Monitored across index',
      },
    };
  }

  // ==========================================
  // LocalStorage Fallback Methods
  // ==========================================

  private getFromLocalStorage(): InvestigationRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      }
    } catch {
      // Local storage unavailable
    }
    return [];
  }

  private saveToLocalStorage(record: InvestigationRecord): InvestigationRecord {
    try {
      const list = this.getFromLocalStorage();
      const existingIdx = list.findIndex((item) => item.id === record.id);
      if (existingIdx >= 0) {
        list[existingIdx] = record;
      } else {
        list.unshift(record);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[EchoTrace:InvestigationService] Failed to write to localStorage:', err);
    }
    return record;
  }

  private deleteFromLocalStorage(id: string): boolean {
    try {
      const list = this.getFromLocalStorage();
      const filtered = list.filter((item) => item.id !== id);
      if (filtered.length !== list.length) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        return true;
      }
    } catch {
      // Local storage unavailable
    }
    return false;
  }

  private syncToLocalStorage(records: InvestigationRecord[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Ignored
    }
  }
}

export const investigationService = new InvestigationService();
