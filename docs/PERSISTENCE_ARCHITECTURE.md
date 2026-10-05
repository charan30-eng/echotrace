# EchoTrace Phase 12: Persistent Investigation Architecture

## 1. Architectural Overview

EchoTrace uses a clean, multi-tiered persistence architecture separating presentation state (`ClaimAnalysis`), the transport layer, and the persistent storage contract (`InvestigationRecord`).

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND UI                            │
│  • Dashboard (Dossier View & Reopen)                            │
│  • HistoryView (Filter by verdict, search, inspect, delete)     │
│  • App (Auto-load on mount, auto-save on pipeline completion)    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLIENT INVESTIGATION SERVICE                  │
│                     (investigationService.ts)                   │
│  • Bidirectional conversion: ClaimAnalysis ⇄ InvestigationRecord│
│  • HTTP REST client (/api/investigations)                       │
│  • Offline / Static fallback (browser localStorage)             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTP / JSON
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND REST API                          │
│     (investigationMiddleware.ts & investigationHandler.ts)       │
│  • POST   /api/investigations     (Create & sanitize)           │
│  • GET    /api/investigations     (List full or summaries)      │
│  • GET    /api/investigations/:id (Get single dossier)          │
│  • DELETE /api/investigations/:id (Remove record)               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STORAGE ADAPTER CONTRACT                      │
│                  (InvestigationStorageAdapter)                  │
├───────────────────────────────┬─────────────────────────────────┤
│    DEVELOPMENT ADAPTER        │      PRODUCTION ADAPTER         │
│  FileInvestigationStorage     │  PostgreSQL / Document DB       │
│  (Persists to .data/          │  (Prisma / TypeORM / Supabase / │
│   investigations.json)        │   MongoDB / DynamoDB)           │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## 2. Canonical Data Model

Every persisted investigation stores the complete, audited state across all 11 prior forensic pipeline stages:

```typescript
type InvestigationRecord = {
  id: string;                     // Unique UUID/cuid
  input: InvestigationInput;       // Phase 1 Normalized Intake
  claim: ExtractedClaim;           // Phase 2 Structured Proposition
  sources: Source[];               // Phases 3-4 Cataloged Provenance
  evidence: Evidence[];            // Phase 5 Retrieved Passages
  assessments: EvidenceAssessment[]; // Phase 6 Semantic Stance Breakdown
  comparison: SourceComparison;    // Phase 8 Cross-Source Conflict Matrix
  graph: {
    nodes: VariantNode[];          // Phase 9 Lineage & Provenance Nodes
    edges: GraphEdge[];            // Phase 9 Corroboration & Mutation Edges
  };
  verdict: Verdict;                // Phase 10 Multi-Evidence Final Verdict
  createdAt: string;               // ISO 8601 creation timestamp
  updatedAt: string;               // ISO 8601 update timestamp
};
```

---

## 3. Storage Adapters

1. **Development Adapter (`FileInvestigationStorage`)**:
   - Location: `.data/investigations.json`
   - Zero configuration required out of the box.
   - Atomic file replacement (`tempPath -> rename`) prevents corrupted files during concurrent writes.
   - Synchronous in-memory caching provides microsecond lookups.

2. **Memory Adapter (`MemoryInvestigationStorage`)**:
   - In-memory `Map<string, InvestigationRecord>` used during automated test suites (`npm run test:phase12`).

3. **Browser Fallback (`localStorage`)**:
   - If the EchoTrace frontend is run in an offline environment or served without a Node backend, `investigationService.ts` transparently persists records to `localStorage`.

---

## 4. Production Database Configuration (What Remains for Production)

To transition from the local file adapter to a production-grade relational database, execute the following steps:

### A. Environment Variables
Add the following configuration to your production environment:
```bash
# Storage Engine Selector ('postgres' | 'file' | 'memory')
INVESTIGATION_STORAGE_TYPE=postgres

# PostgreSQL Connection Pool URI
DATABASE_URL="postgresql://echotrace_user:secure_password@db.production.internal:5432/echotrace_prod?sslmode=require&pgbouncer=true"

# Data Retention Policy (days)
INVESTIGATION_RETENTION_DAYS=180
```

### B. PostgreSQL Production DDL Schema

```sql
-- Create investigations table with JSONB document columns and relational indices
CREATE TABLE IF NOT EXISTS investigations (
    id VARCHAR(64) PRIMARY KEY,
    claim_text TEXT NOT NULL,
    input_type VARCHAR(32) NOT NULL,
    platform VARCHAR(64),
    verdict_status VARCHAR(32) NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    
    -- Complete forensic payload stored as indexed JSONB
    input JSONB NOT NULL,
    claim JSONB NOT NULL,
    sources JSONB NOT NULL,
    evidence JSONB NOT NULL,
    assessments JSONB NOT NULL,
    comparison JSONB NOT NULL,
    graph JSONB NOT NULL,
    verdict JSONB NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search and filter indexes
CREATE INDEX idx_investigations_created_at ON investigations (created_at DESC);
CREATE INDEX idx_investigations_verdict_status ON investigations (verdict_status);
CREATE INDEX idx_investigations_input_type ON investigations (input_type);
CREATE INDEX idx_investigations_claim_text_trgm ON investigations USING gin (claim_text gin_trgm_ops);
```

### C. Prisma ORM Model (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Investigation {
  id            String   @id @default(cuid())
  claimText     String   @map("claim_text")
  inputType     String   @map("input_type")
  platform      String?
  verdictStatus String   @map("verdict_status")
  confidence    Float
  input         Json
  claim         Json
  sources       Json
  evidence      Json
  assessments   Json
  comparison    Json
  graph         Json
  verdict       Json
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([createdAt(sort: Desc)])
  @@index([verdictStatus])
  @@map("investigations")
}
```

### D. Production Adapter Implementation Template
Implement `InvestigationStorageAdapter` in `src/server/storage/postgresStorage.ts`:
```typescript
import { InvestigationStorageAdapter } from './investigationStorage.ts';
import { InvestigationRecord, InvestigationSummary } from '../../types/investigationRecord.ts';
import { Pool } from 'pg';

export class PostgresInvestigationStorage implements InvestigationStorageAdapter {
  readonly name = 'PostgresStorageAdapter';
  readonly isPersistent = true;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 20 });
  }

  async getAll(): Promise<InvestigationRecord[]> {
    const res = await this.pool.query('SELECT * FROM investigations ORDER BY created_at DESC LIMIT 100');
    return res.rows.map(rowToRecord);
  }

  async getById(id: string): Promise<InvestigationRecord | null> {
    const res = await this.pool.query('SELECT * FROM investigations WHERE id = $1', [id]);
    return res.rows[0] ? rowToRecord(res.rows[0]) : null;
  }

  async save(record: InvestigationRecord): Promise<InvestigationRecord> {
    const query = `
      INSERT INTO investigations (id, claim_text, input_type, platform, verdict_status, confidence, input, claim, sources, evidence, assessments, comparison, graph, verdict, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        verdict_status = EXCLUDED.verdict_status,
        confidence = EXCLUDED.confidence,
        input = EXCLUDED.input,
        claim = EXCLUDED.claim,
        sources = EXCLUDED.sources,
        evidence = EXCLUDED.evidence,
        assessments = EXCLUDED.assessments,
        comparison = EXCLUDED.comparison,
        graph = EXCLUDED.graph,
        verdict = EXCLUDED.verdict,
        updated_at = NOW()
      RETURNING *;
    `;
    // Bind parameters and return saved record
    ...
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM investigations WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }
}
```

---

## 5. Security & Sensitive Information Controls

1. **Secret Stripping**:
   - `sanitizeInvestigationPayload` in [`src/server/investigationHandler.ts`](file:///e:/echotrace/src/server/investigationHandler.ts) automatically strips any `apiKey`, `token`, `secret`, or `authorization` fields before persistence.
2. **PII Minimization**:
   - Raw user submissions only preserve the public claim proposition, hostnames, and timestamps.
   - Author identifiers from social feeds are normalized into public handles only where relevant to domain reach.
3. **No Secrets in Bundles**:
   - Client bundle never stores database connection strings or crawler API secrets.
