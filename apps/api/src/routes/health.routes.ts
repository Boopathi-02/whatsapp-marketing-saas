import { Router, Request, Response } from 'express';
import {
  ApiSuccessResponse,
  HealthResponse,
  ReadinessResponse,
} from '@whatsapp-saas/contracts';
import { pingDatabase, getDatabaseState } from '@whatsapp-saas/database';

const router = Router();
const START_TIME = Date.now();
const APP_VERSION = '1.0.0';

/**
 * GET /health (and /api/v1/health)
 * Liveness Probe: Verifies the Express server process is running and accepting HTTP requests.
 */
router.get('/health', (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  const data: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'development',
  };

  const response: ApiSuccessResponse<HealthResponse> = {
    success: true,
    data,
    requestId: String(req.id || 'unknown'),
  };

  res.status(200).json(response);
});

/**
 * GET /health/ready (and /api/v1/health/ready)
 * Readiness Probe: Verifies external dependencies (MongoDB) are actually connected and responsive.
 * Never reports healthy unless verified by active ping.
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  const dbPing = await pingDatabase();
  const dbState = getDatabaseState();

  const isDatabaseReady = dbPing.ok;
  const overallReady = isDatabaseReady;

  const data: ReadinessResponse = {
    status: overallReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: isDatabaseReady ? 'connected' : dbState === 'connecting' ? 'connecting' : 'disconnected',
        latencyMs: dbPing.latencyMs,
        message: dbPing.error,
      },
    },
  };

  const response: ApiSuccessResponse<ReadinessResponse> = {
    success: true,
    data,
    requestId: String(req.id || 'unknown'),
  };

  const statusCode = overallReady ? 200 : 503;
  res.status(statusCode).json(response);
});

export const healthRouter = router;
