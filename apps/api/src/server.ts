import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from '@whatsapp-saas/database';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  // 1. Database Connection Lifecycle
  try {
    logger.info(
      {
        maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
        minPoolSize: env.MONGODB_MIN_POOL_SIZE,
        serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      },
      'Initializing MongoDB connection...'
    );

    await connectDatabase(
      {
        uri: env.MONGODB_URI,
        maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
        minPoolSize: env.MONGODB_MIN_POOL_SIZE,
        serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      },
      logger
    );
  } catch (dbError) {
    const errorMsg = dbError instanceof Error ? dbError.message : 'Unknown database error';
    logger.warn({
      msg: 'MongoDB connection could not be established at startup',
      error: errorMsg,
      note: 'The server will continue in degraded mode. Readiness probe /health/ready will reflect database status accurately.',
    });
  }

  // 2. Start HTTP Listener
  server.listen(env.API_PORT, env.API_HOST, () => {
    logger.info(`WhatsApp Marketing SaaS API running at http://${env.API_HOST}:${env.API_PORT}`);
    logger.info(`Health check available at http://${env.API_HOST}:${env.API_PORT}${env.API_PREFIX}/health`);
    logger.info(`Readiness probe available at http://${env.API_HOST}:${env.API_PORT}${env.API_PREFIX}/health/ready`);
  });

  // 3. Graceful Shutdown Handler
  let isShuttingDown = false;
  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timed out after 10s. Forcing exit.');
      process.exit(1);
    }, 10000);
    shutdownTimeout.unref();

    server.close(async err => {
      if (err) {
        logger.error({ error: err.message }, 'Error closing HTTP server');
      } else {
        logger.info('HTTP server closed successfully.');
      }

      try {
        await disconnectDatabase(logger);
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : 'Unknown error';
        logger.error({ error: msg }, 'Error during database disconnection');
      }

      logger.info('Graceful shutdown complete.');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.fatal({ err }, 'Fatal error during application startup');
  process.exit(1);
});
