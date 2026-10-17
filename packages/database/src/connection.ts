import mongoose, { Connection } from 'mongoose';
import { DatabaseConfigInput, DatabaseConfigSchema, sanitizeMongoUri } from './config.js';

export interface DatabaseLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug?: (message: string, meta?: Record<string, unknown>) => void;
}

const defaultLogger: DatabaseLogger = {
  info: (msg, meta) => console.info(`[DB INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg, meta) => console.error(`[DB ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg, meta) => console.warn(`[DB WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

let connectionInstance: Connection | null = null;
let isConnecting = false;

export async function connectDatabase(
  rawConfig: DatabaseConfigInput,
  logger: DatabaseLogger = defaultLogger
): Promise<Connection> {
  const config = DatabaseConfigSchema.parse(rawConfig);
  const sanitizedUri = sanitizeMongoUri(config.uri);

  if (connectionInstance && connectionInstance.readyState === 1) {
    logger.info('Reusing existing active database connection', { uri: sanitizedUri });
    return connectionInstance;
  }

  if (isConnecting) {
    logger.warn('Connection attempt already in progress, awaiting resolution');
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (connectionInstance && connectionInstance.readyState === 1) {
      return connectionInstance;
    }
  }

  try {
    isConnecting = true;
    logger.info('Connecting to MongoDB...', { uri: sanitizedUri });

    // Set mongoose global options
    mongoose.set('strictQuery', true);

    // Register lifecycle event listeners once on connection
    const conn = mongoose.connection;
    conn.removeAllListeners();

    conn.on('connected', () => {
      logger.info('MongoDB connection established successfully', { uri: sanitizedUri });
    });

    conn.on('disconnected', () => {
      logger.warn('MongoDB connection lost / disconnected');
    });

    conn.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    conn.on('error', err => {
      logger.error('MongoDB connection runtime error', {
        errorMessage: err.message,
      });
    });

    await mongoose.connect(config.uri, {
      maxPoolSize: config.maxPoolSize,
      minPoolSize: config.minPoolSize,
      serverSelectionTimeoutMS: config.serverSelectionTimeoutMS,
      socketTimeoutMS: config.socketTimeoutMS,
      connectTimeoutMS: config.connectTimeoutMS,
      autoIndex: config.autoIndex,
    });

    connectionInstance = mongoose.connection;
    return connectionInstance;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    logger.error('Failed to establish MongoDB connection', {
      uri: sanitizedUri,
      error: message,
    });
    throw error;
  } finally {
    isConnecting = false;
  }
}

export async function disconnectDatabase(logger: DatabaseLogger = defaultLogger): Promise<void> {
  if (!connectionInstance || connectionInstance.readyState === 0) {
    return;
  }

  try {
    logger.info('Closing MongoDB connection...');
    await mongoose.disconnect();
    connectionInstance = null;
    logger.info('MongoDB connection closed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown disconnection error';
    logger.error('Error closing MongoDB connection', { error: message });
    throw error;
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDatabaseState(): 'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    case 0:
    default:
      return 'disconnected';
  }
}

/**
 * Actively pings the database with a command to test real responsiveness.
 * Never returns true if the connection is dead.
 */
export async function pingDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  if (!isDatabaseConnected() || !mongoose.connection.db) {
    return { ok: false, error: 'Database is not connected' };
  }

  const startTime = Date.now();
  try {
    const admin = mongoose.connection.db.admin();
    await admin.ping();
    return { ok: true, latencyMs: Date.now() - startTime };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ping command failed';
    return { ok: false, latencyMs: Date.now() - startTime, error: msg };
  }
}
