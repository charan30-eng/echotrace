/**
 * EchoTrace Phase 12: Persistent Investigation Storage Unit Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { MemoryInvestigationStorage } from '../server/storage/memoryStorage.ts';
import { FileInvestigationStorage } from '../server/storage/fileStorage.ts';
import {
  createInvestigation,
  listInvestigations,
  getInvestigationById,
  deleteInvestigation,
} from '../server/investigationHandler.ts';
import { setInvestigationStorage } from '../server/storage/index.ts';
import { investigationService } from './investigationService.ts';
import { InvestigationRecord } from '../types/investigationRecord.ts';
import { DEMO_SCENARIOS } from '../data/demoScenarios.ts';

describe('Phase 12: Persistent Investigation Storage & API Handler', () => {
  const testDataDir = path.resolve(process.cwd(), '.test-data');
  const testFilePath = path.join(testDataDir, 'test-investigations.json');

  before(async () => {
    await fs.promises.mkdir(testDataDir, { recursive: true });
  });

  after(async () => {
    try {
      if (fs.existsSync(testFilePath)) {
        await fs.promises.unlink(testFilePath);
      }
      if (fs.existsSync(testDataDir)) {
        await fs.promises.rm(testDataDir, { recursive: true, force: true });
      }
    } catch {
      // Cleanup best effort
    }
  });

  it('1. MemoryInvestigationStorage handles CRUD operations and summaries', async () => {
    const memory = new MemoryInvestigationStorage();

    const mockRecord: InvestigationRecord = {
      id: 'inv-test-1',
      input: {
        id: 'in-test-1',
        inputType: 'text',
        rawInput: 'Test claim statement for verification',
        submittedAt: new Date().toISOString(),
      },
      claim: {
        id: 'claim-test-1',
        originalInput: 'Test claim statement for verification',
        claimText: 'Test claim statement for verification',
        subject: 'Test',
        action: 'statement',
        entities: [],
        keywords: ['test', 'verification'],
        extractedAt: new Date().toISOString(),
        modality: 'assertive',
        isAmbiguous: false,
        verificationStatus: 'unverified',
        confidence: 0.8,
      },
      sources: [
        {
          id: 'src-1',
          name: 'Official Registrar',
          type: 'Official notice',
          platform: 'srmist.edu.in',
          reliability: 'high',
          status: 'Verified source',
          timestamp: '2026-10-05T10:00:00Z',
        },
      ],
      evidence: [],
      assessments: [],
      comparison: {
        supportingEvidence: [],
        contradictingEvidence: [],
        neutralEvidence: [],
        independentSupportCount: 0,
        independentContradictionCount: 1,
        conflicts: [],
        overallConsistency: 'contradictory',
        comparedAt: new Date().toISOString(),
      },
      graph: {
        nodes: [],
        edges: [],
      },
      verdict: {
        status: 'contradicted',
        confidence: 0.92,
        explanation: 'Contradicted by authoritative registrar notice.',
        supportingEvidenceIds: [],
        contradictingEvidenceIds: ['ev-1'],
        keyFactors: [],
        limitations: ['Limited crawl window'],
        generatedAt: new Date().toISOString(),
      },
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:05:00Z',
    };

    // Save
    const saved = await memory.save(mockRecord);
    assert.strictEqual(saved.id, 'inv-test-1');

    // Get by ID
    const retrieved = await memory.getById('inv-test-1');
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.verdict.status, 'contradicted');

    // Summaries
    const summaries = await memory.getSummaries();
    assert.strictEqual(summaries.length, 1);
    assert.strictEqual(summaries[0].verdictStatus, 'contradicted');
    assert.strictEqual(summaries[0].sourcesCount, 1);

    // Delete
    const deleted = await memory.delete('inv-test-1');
    assert.strictEqual(deleted, true);
    const afterDelete = await memory.getById('inv-test-1');
    assert.strictEqual(afterDelete, null);
  });

  it('2. FileInvestigationStorage safely writes and reads from disk', async () => {
    const fileStorage = new FileInvestigationStorage(testFilePath);

    const record: InvestigationRecord = {
      id: 'inv-file-test-1',
      input: {
        id: 'in-file-1',
        inputType: 'url',
        rawInput: 'https://example.com/circular',
        submittedAt: new Date().toISOString(),
      },
      claim: {
        id: 'claim-file-1',
        originalInput: 'College is closed',
        claimText: 'College is closed',
        subject: 'College',
        action: 'closed',
        entities: [],
        keywords: ['college', 'closed'],
        extractedAt: new Date().toISOString(),
        modality: 'assertive',
        isAmbiguous: false,
        verificationStatus: 'unverified',
        confidence: 0.75,
      },
      sources: [],
      evidence: [],
      assessments: [],
      comparison: {
        supportingEvidence: [],
        contradictingEvidence: [],
        neutralEvidence: [],
        independentSupportCount: 0,
        independentContradictionCount: 0,
        conflicts: [],
        overallConsistency: 'insufficient',
        comparedAt: new Date().toISOString(),
      },
      graph: { nodes: [], edges: [] },
      verdict: {
        status: 'unverified',
        confidence: 0.1,
        explanation: 'Pending verification',
        supportingEvidenceIds: [],
        contradictingEvidenceIds: [],
        keyFactors: [],
        limitations: [],
        generatedAt: new Date().toISOString(),
      },
      createdAt: '2026-10-05T12:00:00Z',
      updatedAt: '2026-10-05T12:00:00Z',
    };

    // Save to disk
    await fileStorage.save(record);
    assert.ok(fs.existsSync(testFilePath));

    // Read back through fresh instance pointing to same file
    const secondInstance = new FileInvestigationStorage(testFilePath);
    const loaded = await secondInstance.getById('inv-file-test-1');
    assert.ok(loaded);
    assert.strictEqual(loaded?.claim.claimText, 'College is closed');

    // Delete
    await secondInstance.delete('inv-file-test-1');
    const afterDel = await secondInstance.getById('inv-file-test-1');
    assert.strictEqual(afterDel, null);
  });

  it('3. investigationHandler strips API keys and manages records', async () => {
    const memory = new MemoryInvestigationStorage();
    setInvestigationStorage(memory);

    // Payload with accidental secret
    const payloadWithSecret = {
      claim: {
        claimText: 'Campus holiday declared tomorrow',
      },
      apiKey: 'sk-secret-12345-leak',
      token: 'jwt-auth-token-xyz',
      input: {
        rawInput: 'Campus holiday declared tomorrow',
        metadata: {
          apiKey: 'internal-secret-token',
        },
      },
    };

    const createRes = await createInvestigation(payloadWithSecret);
    assert.strictEqual(createRes.success, true);
    assert.ok(createRes.data);
    assert.strictEqual((createRes.data as any).apiKey, undefined);
    assert.strictEqual((createRes.data as any).token, undefined);
    assert.strictEqual(createRes.data?.input.metadata?.['apiKey' as keyof typeof createRes.data.input.metadata], undefined);

    const savedId = createRes.data!.id;

    // List
    const listRes = await listInvestigations();
    assert.strictEqual(listRes.success, true);
    assert.ok(Array.isArray(listRes.data));
    assert.strictEqual(listRes.data!.length, 1);

    // Get
    const getRes = await getInvestigationById(savedId);
    assert.strictEqual(getRes.success, true);
    assert.strictEqual(getRes.data?.claim.claimText, 'Campus holiday declared tomorrow');

    // Delete
    const delRes = await deleteInvestigation(savedId);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(delRes.data?.deleted, true);

    // Verify 404 after delete
    const notFoundRes = await getInvestigationById(savedId);
    assert.strictEqual(notFoundRes.success, false);
  });

  it('4. investigationService bidirectional conversion faithfully preserves all 10 dossier elements', () => {
    const scenarioAnalysis = DEMO_SCENARIOS[0].analysis;

    // Convert ClaimAnalysis -> InvestigationRecord
    const record = investigationService.analysisToInvestigationRecord(scenarioAnalysis);
    assert.ok(record.id);
    assert.ok(record.input);
    assert.ok(record.claim);
    assert.ok(record.sources.length > 0);
    assert.ok(record.verdict);
    assert.strictEqual(record.verdict.status, 'contradicted');
    assert.ok(record.verdict.confidence > 0.8);
    assert.ok(record.verdict.explanation.length > 10);
    assert.ok(record.graph.nodes.length > 0);

    // Convert back InvestigationRecord -> ClaimAnalysis
    const reconstructed = investigationService.investigationRecordToAnalysis(record);
    assert.strictEqual(reconstructed.id, record.id);
    assert.strictEqual(reconstructed.text, record.claim.claimText);
    assert.strictEqual(reconstructed.verdict?.status, 'contradicted');
    assert.strictEqual(reconstructed.nodes.length, record.graph.nodes.length);
    assert.strictEqual(reconstructed.sources.length, record.sources.length);
  });
});
