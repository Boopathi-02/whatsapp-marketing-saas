import { Schema, FilterQuery } from 'mongoose';

/**
 * Multi-Tenant Strategy Documentation:
 * 
 * In this SaaS architecture, logical tenant isolation is enforced at the data layer:
 * 1. Schema Level: Every tenant-owned entity MUST declare a `workspaceId` string field,
 *    indexed with high selectivity (typically compound index `{ workspaceId: 1, createdAt: -1 }`).
 * 2. Query Scoping: Application queries NEVER rely on client-supplied workspace parameters without
 *    validation. Instead, `workspaceId` is extracted from verified JWT claims/session context
 *    on the server side and injected into the query predicate.
 * 3. Pre-save & Query Plugins: Mongoose plugins enforce that workspaceId cannot be mutated
 *    or omitted on writes.
 */

export interface TenantScopedDocument {
  workspaceId: string;
}

/**
 * Applies a verified workspaceId constraint to a Mongoose query filter.
 * Prevents cross-tenant data leakage by ensuring all operations are bounded
 * to the caller's authorized workspace.
 */
export function scopeToWorkspace<T extends TenantScopedDocument>(
  filter: FilterQuery<T>,
  workspaceId: string
): FilterQuery<T> {
  if (!workspaceId || typeof workspaceId !== 'string') {
    throw new Error('Tenant security violation: An authorized workspaceId is required to scope query');
  }

  return {
    ...filter,
    workspaceId,
  };
}

/**
 * Mongoose plugin that injects and indexes the workspaceId field.
 */
export function multiTenantPlugin(schema: Schema): void {
  schema.add({
    workspaceId: {
      type: String,
      required: true,
      index: true,
      immutable: true, // Cannot be altered once document is persisted
    },
  });

  // Automatically enforce compound index for workspace scoping
  schema.index({ workspaceId: 1, createdAt: -1 });
}

/**
 * Checks whether an error indicates MongoDB transactions / replica set features
 * are unavailable on the current standalone deployment.
 */
export function isReplicaSetError(err: unknown): boolean {
  if (!err) return false;
  const errorObj = err as { message?: string; code?: number; codeName?: string };
  const msg = errorObj.message || String(err);
  return (
    msg.includes('replica set') ||
    msg.includes('Transaction numbers') ||
    msg.includes('retryable writes') ||
    errorObj.code === 20 ||
    errorObj.codeName === 'IllegalOperation'
  );
}

