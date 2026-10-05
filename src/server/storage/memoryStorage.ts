/**
 * EchoTrace Phase 12: In-Memory Investigation Storage Adapter
 * 
 * Ephemeral memory adapter used for testing and fallback environments.
 */

import { InvestigationStorageAdapter } from './investigationStorage.ts';
import { InvestigationRecord, InvestigationSummary } from '../../types/investigationRecord.ts';

export class MemoryInvestigationStorage implements InvestigationStorageAdapter {
  readonly name = 'MemoryStorageAdapter';
  readonly isPersistent = false;

  private records = new Map<string, InvestigationRecord>();

  async getAll(): Promise<InvestigationRecord[]> {
    return Array.from(this.records.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSummaries(): Promise<InvestigationSummary[]> {
    const all = await this.getAll();
    return all.map((r) => ({
      id: r.id,
      claimText: r.claim?.claimText || r.input?.rawInput || 'Unknown Claim',
      subject: r.claim?.subject || '',
      inputType: r.input?.inputType || 'text',
      platform: r.input?.platform,
      verdictStatus: r.verdict?.status || 'unverified',
      confidence: r.verdict?.confidence || 0,
      sourcesCount: r.sources?.length || 0,
      evidenceCount: r.evidence?.length || 0,
      supportingCount: r.verdict?.supportingEvidenceIds?.length || 0,
      contradictingCount: r.verdict?.contradictingEvidenceIds?.length || 0,
      nodesCount: r.graph?.nodes?.length || 0,
      edgesCount: r.graph?.edges?.length || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      isDemo: r.input?.metadata?.isDemo || false,
    }));
  }

  async getById(id: string): Promise<InvestigationRecord | null> {
    return this.records.get(id) || null;
  }

  async save(record: InvestigationRecord): Promise<InvestigationRecord> {
    const now = new Date().toISOString();
    const cleaned: InvestigationRecord = {
      ...record,
      id: record.id || `inv-${Date.now()}`,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };
    this.records.set(cleaned.id, cleaned);
    return cleaned;
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}
