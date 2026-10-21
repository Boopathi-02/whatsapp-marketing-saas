import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandlerMiddleware } from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';
import { notFoundHandlerMiddleware } from './middleware/notFoundHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { workspaceRouter, invitationRouter } from './modules/workspaces/workspace.routes.js';
import { whatsAppRouter } from './modules/whatsapp/whatsapp.routes.js';
import { webhookRouter } from './modules/webhooks/webhook.routes.js';
import { contactRouter } from './modules/contacts/contact.routes.js';
import { templateRouter } from './modules/templates/template.routes.js';
import { campaignRouter } from './modules/campaigns/campaign.routes.js';
import { conversationRouter } from './modules/conversations/conversation.routes.js';
import { quickReplyRouter } from './modules/quick-replies/quick-reply.routes.js';
import { billingRouter, paymentWebhookRouter } from './modules/billing/index.js';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy when behind reverse proxy/load balancer, ngrok tunnel, or cloud provider
  app.set('trust proxy', 1);

  // 2. Correlation ID Middleware (generates or propagates X-Request-Id)
  app.use(requestIdMiddleware);

  // 3. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // 4. CORS Configuration restricted to configured web origin
  const allowedOrigins = env.WEB_ORIGIN.split(',').map(o => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not permitted by CORS policy`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Workspace-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86400, // 24 hours
    })
  );

  // 5. Body & Cookie Parsing with sensible payload limits
  // Preserving raw request buffer for HMAC-SHA256 webhook signature verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // 6. HTTP Request Logging with Pino (Redaction configured in logger)
  app.use(
    pinoHttp({
      logger,
      genReqId: req => (req as unknown as { id: string }).id || 'unknown',
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: {
        ignore: req => req.url?.includes('/health') ?? false,
      },
    })
  );

  // 7. Health & Readiness Endpoints (accessible at root /health and /api/v1/health)
  app.use('/', healthRouter);
  app.use(env.API_PREFIX, healthRouter);

  // 8. Authentication & Multi-Tenant Workspace Routes
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/workspaces`, workspaceRouter);
  app.use(`${env.API_PREFIX}/workspaces/:workspaceId/whatsapp-accounts`, whatsAppRouter);
  app.use(`${env.API_PREFIX}/workspaces/:workspaceId/contacts`, contactRouter);
  app.use(`${env.API_PREFIX}/workspaces/:workspaceId/templates`, templateRouter);
  app.use(`${env.API_PREFIX}/workspaces/:workspaceId/campaigns`, campaignRouter);
  app.use(`${env.API_PREFIX}/workspaces/:workspaceId/conversations`, conversationRouter);
  app.use(`${env.API_PREFIX}/workspaces/:workspaceId/quick-replies`, quickReplyRouter);
  app.use(`${env.API_PREFIX}/workspaces/:workspaceId/billing`, billingRouter);
  app.use(`${env.API_PREFIX}/invitations`, invitationRouter);

  // 9. Public Webhooks (server-to-server; each authenticated by its own signature scheme)
  app.use(`${env.API_PREFIX}/webhooks/payments`, paymentWebhookRouter);
  app.use(`${env.API_PREFIX}/webhooks`, webhookRouter);

  // 10. 404 Handler for undefined routes
  app.use(notFoundHandlerMiddleware);

  // 11. Centralized Error Handler (must be last middleware)
  app.use(errorHandlerMiddleware);

  return app;
}
