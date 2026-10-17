import { z } from 'zod';

export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  timestamp: z.string().datetime(),
  uptimeSeconds: z.number().nonnegative(),
  version: z.string(),
  environment: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const DependencyStatusSchema = z.enum(['connected', 'disconnected', 'connecting', 'error', 'disabled']);
export type DependencyStatus = z.infer<typeof DependencyStatusSchema>;

export const ReadinessCheckSchema = z.object({
  status: DependencyStatusSchema,
  latencyMs: z.number().optional(),
  message: z.string().optional(),
});
export type ReadinessCheck = z.infer<typeof ReadinessCheckSchema>;

export const ReadinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  timestamp: z.string().datetime(),
  services: z.object({
    database: ReadinessCheckSchema,
    redis: ReadinessCheckSchema.optional(),
  }),
});
export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;
