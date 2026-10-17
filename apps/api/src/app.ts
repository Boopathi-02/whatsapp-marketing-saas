import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandlerMiddleware } from './middleware/errorHandler.js';
import { notFoundHandlerMiddleware } from './middleware/notFoundHandler.js';
import { healthRouter } from './routes/health.routes.js';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy in production if behind reverse proxy/load balancer
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

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

  // 5. Body Parsing with sensible payload limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

  // 8. 404 Handler for undefined routes
  app.use(notFoundHandlerMiddleware);

  // 9. Centralized Error Handler (must be last middleware)
  app.use(errorHandlerMiddleware);

  return app;
}
