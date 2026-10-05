/**
 * EchoTrace Phase 12: Investigation Storage Adapter Interface
 * 
 * Formal Architecture:
 * Backend API → Storage Adapter → Persistent Storage
 * 
 * Defines the contract for persistent investigation storage.
 * In development, backed by FileInvestigationStorage (.data/investigations.json).
 * In production, backed by a relational/document database adapter (e.g., PostgreSQL / MongoDB).
 */

import { InvestigationRecord, InvestigationSummary } from '../../types/investigationRecord.ts';

export interface InvestigationStorageAdapter {
  readonly name: string;
  readonly isPersistent: boolean;

  /**
   * Retrieve all investigations, ordered by createdAt descending.
   */
  getAll(): Promise<InvestigationRecord[]>;

  /**
   * Retrieve lightweight summaries of all investigations.
   */
  getSummaries(): Promise<InvestigationSummary[]>;

  /**
   * Retrieve an investigation record by its unique ID.
   */
  getById(id: string): Promise<InvestigationRecord | null>;

  /**
   * Save (create or update) an investigation record.
   */
  save(record: InvestigationRecord): Promise<InvestigationRecord>;

  /**
   * Delete an investigation record by ID.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Clear all records (useful in test suites).
   */
  clear?(): Promise<void>;
}
