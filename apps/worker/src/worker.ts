import { pino } from 'pino';
import { workerEnv } from './config.js';
import { REGISTERED_QUEUES } from './queues.js';
import { connectDatabase, disconnectDatabase } from '@whatsapp-saas/database';

const logger = pino({
  level: workerEnv.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    workerEnv.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

async function startWorker(): Promise<void> {
  logger.info('====================================================');
  logger.info('Starting Pingza Background Worker');
  logger.info(`Environment: ${workerEnv.NODE_ENV}`);
  logger.info('====================================================');

  // 1. Establish database connection (if configured)
  try {
    logger.info('Connecting worker to MongoDB...');
    await connectDatabase({ uri: workerEnv.MONGODB_URI }, logger);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.warn({
      msg: 'MongoDB unavailable at worker boot. Will operate in queue-ready mode.',
      error: msg,
    });
  }

  // 2. Log registered queue topologies
  logger.info('Documented BullMQ Queue Topology for upcoming phases:');
  for (const q of REGISTERED_QUEUES) {
    logger.info(`  • Queue [${q.name}]: concurrency=${q.concurrency} - ${q.description}`);
  }

  logger.info('Worker runtime initialized and idling. (No active workloads queued in Phase 1)');

  // 3. Graceful shutdown handler
  let isShuttingDown = false;
  async function handleShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}. Shutting down worker gracefully...`);

    const timeout = setTimeout(() => {
      logger.error('Worker shutdown timeout exceeded. Forcing exit.');
      process.exit(1);
    }, 10000);
    timeout.unref();

    try {
      await disconnectDatabase(logger);
      logger.info('Worker database connection closed.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: msg }, 'Error during worker shutdown');
    }

    logger.info('Worker process exited cleanly.');
    process.exit(0);
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

startWorker().catch(err => {
  logger.fatal({ err }, 'Worker process encountered fatal unhandled exception');
  process.exit(1);
});
