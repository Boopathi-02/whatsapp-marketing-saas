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
