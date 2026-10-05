/**
 * EchoTrace Phase 5: Server Content Fetch Middleware
 * 
 * Attaches `/api/fetch` endpoint to Vite dev server or standalone Express server.
 * Ensures external page fetching occurs strictly on the server side respecting:
 * - robots.txt
 * - domain rate limits
 * - access control walls
 * - timeouts and size limits
 */

import { IncomingMessage, ServerResponse } from 'http';
import { executeServerFetchSourceContent } from './contentFetchHandler.ts';

export function createContentFetchMiddleware() {
  return async function fetchMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    const url = req.url || '';

    // Handle health check: GET /api/fetch or /api/fetch/status
    if (req.method === 'GET' && (url === '' || url === '/' || url === '/status')) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'EchoTrace Content Fetcher',
          version: '1.0.0',
        })
      );
      return;
    }

    // Handle content fetch request: POST /api/fetch
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const targetUrl = parsed.url;
          const sourceId = parsed.sourceId || '';
          const timeoutMs = parsed.timeoutMs || 7000;

          if (!targetUrl || typeof targetUrl !== 'string') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                error: 'Invalid request: "url" string is required.',
              })
            );
            return;
          }

          const fetchResult = await executeServerFetchSourceContent(
            targetUrl,
            sourceId,
            timeoutMs
          );

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(fetchResult));
        } catch (err: any) {
          console.error('[EchoTrace:ContentFetchMiddleware] Error handling fetch request:', err);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              status: 'failed',
              error: err.message || 'Internal server error during content fetch',
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
