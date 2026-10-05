/**
 * EchoTrace Phase 12: Server Investigation API Middleware
 * 
 * Attaches the `/api/investigations` endpoint to Vite dev server and production Express server.
 * Implements:
 * - POST   /api/investigations
 * - GET    /api/investigations
 * - GET    /api/investigations/:id
 * - DELETE /api/investigations/:id
 */

import { IncomingMessage, ServerResponse } from 'http';
import {
  listInvestigations,
  getInvestigationById,
  createInvestigation,
  deleteInvestigation,
} from './investigationHandler.ts';

export function createInvestigationMiddleware() {
  return async function investigationMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    const rawUrl = req.url || '';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const pathname = parsedUrl.pathname.replace(/^\/api\/investigations\/?/, '');
    const segments = pathname.split('/').filter(Boolean);
    const method = req.method?.toUpperCase();

    // Helper to send JSON responses
    const sendJson = (statusCode: number, payload: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = statusCode;
      res.end(JSON.stringify(payload));
    };

    try {
      // 1. GET /api/investigations or GET /api/investigations/:id
      if (method === 'GET') {
        if (segments.length === 0) {
          // GET /api/investigations
          const summaryOnly = parsedUrl.searchParams.get('summary') === 'true';
          const result = await listInvestigations(summaryOnly);
          return sendJson(result.success ? 200 : 500, result);
        } else if (segments.length === 1) {
          // GET /api/investigations/:id
          const id = decodeURIComponent(segments[0]);
          const result = await getInvestigationById(id);
          return sendJson(result.success ? 200 : 404, result);
        }
      }

      // 2. POST /api/investigations
      if (method === 'POST' && segments.length === 0) {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const result = await createInvestigation(parsed);
            return sendJson(result.success ? 201 : 400, result);
          } catch (err: any) {
            return sendJson(400, {
              success: false,
              error: `Invalid JSON payload: ${err.message}`,
            });
          }
        });
        return;
      }

      // 3. DELETE /api/investigations/:id
      if (method === 'DELETE' && segments.length === 1) {
        const id = decodeURIComponent(segments[0]);
        const result = await deleteInvestigation(id);
        return sendJson(result.success ? 200 : 404, result);
      }

      // Unknown route or method
      next();
    } catch (err: any) {
      console.error('[EchoTrace:InvestigationMiddleware] Unhandled error:', err);
      sendJson(500, {
        success: false,
        error: err.message || 'Internal server error processing investigation request',
      });
    }
  };
}
