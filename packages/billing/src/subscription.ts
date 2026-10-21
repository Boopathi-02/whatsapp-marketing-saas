import { z } from 'zod';

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'suspended',
  'cancelled',
  'expired',
] as const;
export const SubscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const DEFAULT_TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Permitted persisted lifecycle transitions. Same-state transitions are idempotent no-ops. */
const TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  trialing: ['active', 'expired', 'cancelled', 'suspended'],
  active: ['past_due', 'cancelled', 'suspended'],
  past_due: ['active', 'suspended', 'cancelled'],
  suspended: ['active', 'cancelled'],
  cancelled: ['active'],
  expired: ['active'],
};

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export interface TrialWindow {
  trialStartedAt: Date;
  trialEndsAt: Date;
}

/** All instants are absolute (UTC); the trial is exactly N*24h from the activation instant. */
export function computeTrialWindow(startedAt: Date, trialDays = DEFAULT_TRIAL_DAYS): TrialWindow {
  if (!Number.isInteger(trialDays) || trialDays <= 0) {
    throw new RangeError('trialDays must be a positive integer');
  }
  return {
    trialStartedAt: new Date(startedAt.getTime()),
    trialEndsAt: new Date(startedAt.getTime() + trialDays * DAY_MS),
  };
}

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
}

/**
 * The status that must be used for access decisions. Derived from timestamps so that
 * enforcement never depends on a scheduled job having run.
 */
export function effectiveStatus(sub: SubscriptionSnapshot, now: Date = new Date()): SubscriptionStatus {
  if (sub.status === 'trialing' && sub.trialEndsAt && now.getTime() >= sub.trialEndsAt.getTime()) {
    return 'expired';
  }
  return sub.status;
}

export type DispatchDenialReason =
  | 'TRIAL_EXPIRED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'SUBSCRIPTION_SUSPENDED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'WORKSPACE_NOT_ACTIVE';

export interface DispatchAccess {
  allowed: boolean;
  status: SubscriptionStatus;
  reason?: DispatchDenialReason;
}

/**
 * Whether the tenant may launch or dispatch messages. `past_due` is denied by default
 * (configurable grace is a business decision, see decision register).
 */
export function evaluateDispatchAccess(
  sub: SubscriptionSnapshot,
  workspaceStatus: 'active' | 'suspended' | 'archived' = 'active',
  now: Date = new Date()
): DispatchAccess {
  const status = effectiveStatus(sub, now);
  if (workspaceStatus !== 'active') return { allowed: false, status, reason: 'WORKSPACE_NOT_ACTIVE' };
  switch (status) {
    case 'trialing':
    case 'active':
      return { allowed: true, status };
    case 'expired':
      return { allowed: false, status, reason: 'TRIAL_EXPIRED' };
    case 'past_due':
      return { allowed: false, status, reason: 'SUBSCRIPTION_PAST_DUE' };
    case 'suspended':
      return { allowed: false, status, reason: 'SUBSCRIPTION_SUSPENDED' };
    case 'cancelled':
      // A cancelled paid plan keeps access until the period it already paid for ends.
      if (sub.currentPeriodEnd && now.getTime() < sub.currentPeriodEnd.getTime()) {
        return { allowed: true, status };
      }
      return { allowed: false, status, reason: 'SUBSCRIPTION_CANCELLED' };
  }
}

export interface Entitlements {
  monthlyMessageLimit: number;
  contactLimit: number;
  userLimit: number;
  whatsappAccountLimit: number;
}

export type EntitlementOverrides = Partial<Entitlements>;

export function resolveEntitlements(base: Entitlements, overrides?: EntitlementOverrides | null): Entitlements {
  const merged: Entitlements = { ...base };
  if (overrides) {
    for (const key of Object.keys(base) as (keyof Entitlements)[]) {
      const v = overrides[key];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) merged[key] = v;
    }
  }
  return merged;
}

/** True when `used + requested` stays within the limit. */
export function withinLimit(limit: number, used: number, requested = 1): boolean {
  return used + requested <= limit;
}
