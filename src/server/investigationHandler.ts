/**
 * EchoTrace Phase 12: Server Investigation Handler
 * 
 * Business logic for persisting and retrieving complete investigation records.
 * Sanitizes payloads to prevent storing unnecessary PII or private credentials.
 */

import { getInvestigationStorage } from './storage/index.ts';
import {
  InvestigationRecord,
  CreateInvestigationInput,
  InvestigationApiResponse,
  InvestigationSummary,
} from '../types/investigationRecord.ts';

/**
 * Strips any potential accidental secrets or sensitive tokens from stored records.
 */
function sanitizeInvestigationPayload(raw: any): Partial<InvestigationRecord> {
  if (!raw || typeof raw !== 'object') return {};

  const clone = JSON.parse(JSON.stringify(raw));

  // Remove potential authorization / API key fields
  delete clone.apiKey;
  delete clone.token;
  delete clone.secret;
  delete clone.authorization;

  if (clone.input?.metadata) {
    delete clone.input.metadata.token;
    delete clone.input.metadata.apiKey;
  }

  return clone;
}

/**
 * GET /api/investigations
 */
export async function listInvestigations(
  summaryOnly = false
): Promise<InvestigationApiResponse<InvestigationRecord[] | InvestigationSummary[]>> {
  try {
    const storage = getInvestigationStorage();
    if (summaryOnly) {
      const summaries = await storage.getSummaries();
      return {
        success: true,
        data: summaries,
        storageBackend: storage.name === 'FileStorageAdapter' ? 'file_storage' : 'memory',
      };
    } else {
      const records = await storage.getAll();
      return {
        success: true,
        data: records,
        storageBackend: storage.name === 'FileStorageAdapter' ? 'file_storage' : 'memory',
      };
    }
  } catch (err: any) {
    console.error('[EchoTrace:InvestigationHandler] Error listing investigations:', err);
    return {
      success: false,
      error: err.message || 'Failed to list investigations',
    };
  }
}

/**
 * GET /api/investigations/:id
 */
export async function getInvestigationById(
  id: string
): Promise<InvestigationApiResponse<InvestigationRecord>> {
  if (!id || typeof id !== 'string') {
    return {
      success: false,
      error: 'Invalid or missing investigation ID',
    };
  }

  try {
    const storage = getInvestigationStorage();
    const record = await storage.getById(id);

    if (!record) {
      return {
        success: false,
        error: `Investigation with ID "${id}" not found`,
      };
    }

    return {
      success: true,
      data: record,
      storageBackend: storage.name === 'FileStorageAdapter' ? 'file_storage' : 'memory',
    };
  } catch (err: any) {
    console.error(`[EchoTrace:InvestigationHandler] Error getting investigation ${id}:`, err);
    return {
      success: false,
      error: err.message || 'Failed to retrieve investigation',
    };
  }
}

/**
 * POST /api/investigations
 */
export async function createInvestigation(
  rawPayload: any
): Promise<InvestigationApiResponse<InvestigationRecord>> {
  const sanitized = sanitizeInvestigationPayload(rawPayload);

  // Validate required fields
  const claimText = sanitized.claim?.claimText || sanitized.input?.rawInput;
  if (!claimText) {
    return {
      success: false,
      error: 'Missing required field: investigation must contain a valid claim or input statement.',
    };
  }

  const now = new Date().toISOString();
  const id = sanitized.id || `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Construct complete standardized record
  const record: InvestigationRecord = {
    id,
    input: sanitized.input || {
      id: `in-${id}`,
      inputType: 'text',
      rawInput: claimText,
      submittedAt: now,
      metadata: {
        charCount: claimText.length,
        wordCount: claimText.split(/\s+/).filter(Boolean).length,
      },
    },
    claim: sanitized.claim || {
      id: `claim-${id}`,
      originalInput: claimText,
      claimText,
      subject: claimText.split(' ')[0] || 'Claim',
      action: '',
      entities: [],
      keywords: claimText.split(/\s+/).filter((w: string) => w.length > 3),
      extractedAt: now,
      modality: 'assertive',
      isAmbiguous: false,
      verificationStatus: 'unverified',
      confidence: 0.8,
    },
    sources: Array.isArray(sanitized.sources) ? sanitized.sources : [],
    evidence: Array.isArray(sanitized.evidence) ? sanitized.evidence : [],
    assessments: Array.isArray(sanitized.assessments) ? sanitized.assessments : [],
    comparison: sanitized.comparison || {
      supportingEvidence: [],
      contradictingEvidence: [],
      neutralEvidence: [],
      independentSupportCount: 0,
      independentContradictionCount: 0,
      conflicts: [],
      overallConsistency: 'insufficient',
      comparedAt: now,
    },
    graph: sanitized.graph || {
      nodes: [],
      edges: [],
    },
    verdict: sanitized.verdict || {
      status: 'unverified',
      confidence: 0.1,
      explanation: 'Investigation record created pending evidence synthesis.',
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
      keyFactors: [],
      limitations: ['Preliminary saved dossier.'],
      generatedAt: now,
    },
    createdAt: sanitized.createdAt || now,
    updatedAt: now,
  };

  try {
    const storage = getInvestigationStorage();
    const saved = await storage.save(record);
    return {
      success: true,
      data: saved,
      storageBackend: storage.name === 'FileStorageAdapter' ? 'file_storage' : 'memory',
    };
  } catch (err: any) {
    console.error('[EchoTrace:InvestigationHandler] Error saving investigation:', err);
    return {
      success: false,
      error: err.message || 'Failed to save investigation record',
    };
  }
}

/**
 * DELETE /api/investigations/:id
 */
export async function deleteInvestigation(
  id: string
): Promise<InvestigationApiResponse<{ id: string; deleted: boolean }>> {
  if (!id || typeof id !== 'string') {
    return {
      success: false,
      error: 'Invalid or missing investigation ID',
    };
  }

  try {
    const storage = getInvestigationStorage();
    const deleted = await storage.delete(id);

    if (!deleted) {
      return {
        success: false,
        error: `Investigation with ID "${id}" was not found`,
      };
    }

    return {
      success: true,
      data: { id, deleted: true },
      message: `Investigation "${id}" deleted successfully`,
      storageBackend: storage.name === 'FileStorageAdapter' ? 'file_storage' : 'memory',
    };
  } catch (err: any) {
    console.error(`[EchoTrace:InvestigationHandler] Error deleting investigation ${id}:`, err);
    return {
      success: false,
      error: err.message || 'Failed to delete investigation',
    };
  }
}
