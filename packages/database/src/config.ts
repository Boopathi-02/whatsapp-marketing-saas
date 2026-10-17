import { z } from 'zod';

export const DatabaseConfigSchema = z.object({
  uri: z.string().min(1, 'MongoDB URI is required'),
  maxPoolSize: z.number().int().positive().default(10),
  minPoolSize: z.number().int().nonnegative().default(2),
  serverSelectionTimeoutMS: z.number().int().positive().default(5000),
  socketTimeoutMS: z.number().int().positive().default(45000),
  connectTimeoutMS: z.number().int().positive().default(10000),
  autoIndex: z.boolean().default(false),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type DatabaseConfigInput = z.input<typeof DatabaseConfigSchema>;

/**
 * Redacts username and password from MongoDB connection string to ensure
 * logs never expose sensitive credentials.
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    const url = new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    const isSrv = uri.startsWith('mongodb+srv://');
    const protocol = isSrv ? 'mongodb+srv://' : 'mongodb://';
    
    if (url.username || url.password) {
      return `${protocol}***:***@${url.host}${url.pathname}${url.search}`;
    }
    return uri;
  } catch {
    // If URL parsing fails, perform regex masking of credentials
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  }
}
