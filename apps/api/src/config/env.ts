import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1024).max(65535))
    .default('4000'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/whatsapp_saas_dev'),
  MONGODB_MAX_POOL_SIZE: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('10'),
  MONGODB_MIN_POOL_SIZE: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .default('2'),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('5000'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-jwt-access-secret-32-chars-long-min!!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('7'),
  COOKIE_DOMAIN: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@whatsapp-saas.local'),
  META_GRAPH_API_VERSION: z.string().default('v26.0'),
  META_APP_ID: z.string().default('1113739574734996'),
  META_APP_SECRET: z.string().default('219cc8bca8a0ea1bb2f3c7c34d44bc32'),
  META_CONFIG_ID: z.string().default('1627798868778973'),
  META_WEBHOOK_VERIFY_TOKEN: z.string().default('12345678'),
  CREDENTIAL_ENCRYPTION_KEY: z
    .string()
    .refine(
      val => /^[0-9a-fA-F]{64}$/.test(val) || Buffer.byteLength(val, 'utf8') === 32,
      {
        message: 'CREDENTIAL_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters or 32-byte UTF-8 string)',
      }
    )
    .default('a7d2e947cf8e3c1a89b0d3e5271a4f89c02b5e7d91a348f6c1e95b7a32d1840e'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadAndValidateEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const formattedErrors = result.error.errors.map(err => {
      return `  - ${err.path.join('.')}: ${err.message}`;
    });
    const errorMessage = [
      'Invalid environment configuration:',
      ...formattedErrors,
      'Please check your .env file against .env.example',
    ].join('\n');

    throw new Error(errorMessage);
  }
  return result.data;
}

export const env = loadAndValidateEnv();
