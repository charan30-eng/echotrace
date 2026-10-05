/**
 * EchoTrace Phase 12: File-Based Investigation Storage Adapter
 * 
 * Persistent development storage adapter writing JSON records to `.data/investigations.json`.
 * Ensures investigations persist across server restarts without external database dependencies.
 */

import fs from 'fs';
import path from 'path';
import { InvestigationStorageAdapter } from './investigationStorage.ts';
import { InvestigationRecord, InvestigationSummary } from '../../types/investigationRecord.ts';

export class FileInvestigationStorage implements InvestigationStorageAdapter {
  readonly name = 'FileStorageAdapter';
  readonly isPersistent = true;

  private filePath: string;
  private cache: Map<string, InvestigationRecord> = new Map();
  private initialized = false;
  private writeLock = Promise.resolve();

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const dataDir = path.resolve(process.cwd(), '.data');
      this.filePath = path.join(dataDir, 'investigations.json');
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const dir = path.dirname(this.filePath);
      await fs.promises.mkdir(dir, { recursive: true });

      if (fs.existsSync(this.filePath)) {
        const raw = await fs.promises.readFile(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw || '[]');
        if (Array.isArray(parsed)) {
          this.cache.clear();
          for (const item of parsed) {
            if (item && item.id) {
              this.cache.set(item.id, item);
            }
          }
        }
      } else {
        // File does not exist yet; create empty file
        await fs.promises.writeFile(this.filePath, '[]', 'utf-8');
      }
    } catch (err) {
      console.warn(`[EchoTrace:FileStorage] Warning initializing storage at ${this.filePath}:`, err);
    } finally {
      this.initialized = true;
    }
  }

  private async flushToFile(): Promise<void> {
    this.writeLock = this.writeLock.then(async () => {
      try {
        const records = Array.from(this.cache.values());
        const tempPath = `${this.filePath}.tmp.${Date.now()}`;
        const serialized = JSON.stringify(records, null, 2);
        await fs.promises.writeFile(tempPath, serialized, 'utf-8');
        await fs.promises.rename(tempPath, this.filePath);
      } catch (err) {
        console.error('[EchoTrace:FileStorage] Failed to flush records to file:', err);
      }
    });
    return this.writeLock;
  }

  async getAll(): Promise<InvestigationRecord[]> {
    await this.ensureInitialized();
    const records = Array.from(this.cache.values());
    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    await this.ensureInitialized();
    return this.cache.get(id) || null;
  }

  async save(record: InvestigationRecord): Promise<InvestigationRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const cleanedRecord: InvestigationRecord = {
      ...record,
      id: record.id || `inv-${Date.now()}`,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };

    this.cache.set(cleanedRecord.id, cleanedRecord);
    await this.flushToFile();
    return cleanedRecord;
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (this.cache.has(id)) {
      this.cache.delete(id);
      await this.flushToFile();
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.cache.clear();
    await this.flushToFile();
  }
}
