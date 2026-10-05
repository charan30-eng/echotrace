/**
 * EchoTrace Phase 3: Server Search Middleware
 * 
 * Attaches `/api/search` endpoint to Vite dev server or standalone Express server.
 * Ensures client NEVER receives or bundles secret search API keys.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { executeServerEvidenceSearch, getServerSearchConfig, hasConfiguredSearchProvider } from './searchHandler.ts';
import { ExtractedClaim } from '../types/claimExtraction.ts';

export function createSearchMiddleware() {
  return async function searchMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    const url = req.url || '';

    // Handle health/status check: GET /api/search or /api/search/status
    if (req.method === 'GET' && (url === '' || url === '/' || url === '/status')) {
      const config = getServerSearchConfig();
      const availableProviders: string[] = [];
      if (config.tavilyApiKey) availableProviders.push('Tavily');
      if (config.serperApiKey) availableProviders.push('Serper');
      if (config.googleSearchApiKey && config.googleSearchCx) availableProviders.push('GoogleCustomSearch');
      if (config.geminiApiKey) availableProviders.push('GeminiGrounding');

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          status: 'ok',
          providerConfigured: hasConfiguredSearchProvider(),
          availableProviders,
          environment: process.env.NODE_ENV || 'development',
        })
      );
      return;
    }

    // Handle search query: POST /api/search
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          let claim: ExtractedClaim = parsed.claim;
          const options = parsed.options || {};

          // If raw queries array was sent (e.g. from provider.search directly), wrap into claim
          if (!claim && Array.isArray(parsed.queries) && parsed.queries.length > 0) {
            const primaryQuery = parsed.queries[0];
            claim = {
              id: `claim-${Date.now()}`,
              originalInput: primaryQuery,
              claimText: primaryQuery,
              subject: primaryQuery.split(' ')[0] || '',
              action: '',
              entities: [],
              keywords: primaryQuery.split(/\s+/).filter((w: string) => w.length > 3),
              extractedAt: new Date().toISOString(),
              modality: 'assertive',
              isAmbiguous: false,
              verificationStatus: 'unverified',
              confidence: 0.8,
            };
          }

          if (!claim || !claim.claimText) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                error: 'Invalid request: "claim" object with "claimText" or "queries" array is required.',
              })
            );
            return;
          }

          const searchResponse = await executeServerEvidenceSearch(claim, options);

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(searchResponse));
        } catch (err: any) {
          console.error('[EchoTrace:SearchMiddleware] Error handling search request:', err);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              status: 'error',
              error: err.message || 'Internal server error during search execution',
              results: [],
            })
          );
        }
      });

      return;
    }

    // Not handled by this middleware
    next();
  };
}
