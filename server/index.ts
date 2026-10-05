/**
 * EchoTrace Standalone Server
 * 
 * Production Express server exposing `/api/search` and serving static build files.
 * Protects search provider API keys strictly within server process.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSearchMiddleware } from '../src/server/searchMiddleware.ts';
import { createContentFetchMiddleware } from '../src/server/contentFetchMiddleware.ts';
import { createInvestigationMiddleware } from '../src/server/investigationMiddleware.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Attach EchoTrace Evidence Search, Content Fetching & Investigation Persistence APIs
app.use('/api/search', createSearchMiddleware());
app.use('/api/fetch', createContentFetchMiddleware());
app.use('/api/investigations', createInvestigationMiddleware());

// Serve static frontend build if dist exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[EchoTrace] Evidence Search Server running on http://localhost:${PORT}`);
});
