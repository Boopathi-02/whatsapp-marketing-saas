import {
  PlanRepository,
  SubscriptionRepository,
  WorkspaceRepository,
  AuditRepository,
  ISubscription,
  IPlanVersion,
} from '@whatsapp-saas/database';
import {
  computeTrialWindow,
  effectiveStatus,
  evaluateDispatchAccess,
  resolveEntitlements,
  Entitlements,
  SubscriptionStatus,
} from '@whatsapp-saas/billing';
import { ErrorCode, SubscriptionDto, PlanDto } from '@whatsapp-saas/contracts';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export const TRIAL_PLAN_KEY = 'trial';

function trialEntitlements(): Entitlements {
  return {
    monthlyMessageLimit: env.TRIAL_MONTHLY_MESSAGE_LIMIT,
    contactLimit: env.TRIAL_CONTACT_LIMIT,
    userLimit: env.TRIAL_USER_LIMIT,
    whatsappAccountLimit: env.TRIAL_WHATSAPP_ACCOUNT_LIMIT,
  };
}

function toPlanDto(p: IPlanVersion): PlanDto {
  return {
    planKey: p.planKey,
    version: p.version,
    name: p.name,
    entitlements: { ...p.entitlements },
    prices: p.prices.map(x => ({ interval: x.interval, currency: x.currency, amountMinor: x.amountMinor })),
    purchasable: p.prices.length > 0 && env.PAYMENT_PROVIDER !== 'none',
  };
}

export class BillingService {
  /**
   * Starts the 7-day (configurable) trial. Idempotent: calling again never resets the trial.
   * The activation event is workspace creation; pre-existing workspaces start theirs lazily
   * on first billing access.
   */
  static async ensureSubscription(workspaceId: string, now: Date = new Date()): Promise<ISubscription> {
    const existing = await SubscriptionRepository.findByWorkspace(workspaceId);
    if (existing) return existing;

    const plan = await PlanRepository.ensureVersionOne({
      planKey: TRIAL_PLAN_KEY,
      name: 'Free trial',
      entitlements: trialEntitlements(),
    });
    const window = computeTrialWindow(now, env.TRIAL_DURATION_DAYS);
    return SubscriptionRepository.createTrialIfAbsent({
      workspaceId,
      planKey: plan.planKey,
      planVersion: plan.version,
      ...window,
    });
  }

  /** Best-effort trial start for flows that must not fail if billing is unavailable. */
  static async startTrialSafely(workspaceId: string): Promise<void> {
    try {
      await this.ensureSubscription(workspaceId);
    } catch (err) {
      logger.error({ err: String(err), workspaceId }, 'Failed to start trial; will retry lazily');
    }
  }

  private static async loadEntitlements(sub: ISubscription): Promise<Entitlements> {
    const plan = await PlanRepository.findVersion(sub.planKey, sub.planVersion);
    const base: Entitlements = plan ? { ...plan.entitlements } : trialEntitlements();
    return resolveEntitlements(base, sub.entitlementOverrides ?? null);
  }

  /** Persists `expired` when a trial is due (idempotent); access is derived from timestamps regardless. */
  private static async syncExpiry(sub: ISubscription, now: Date): Promise<ISubscription> {
    if (effectiveStatus(sub, now) === 'expired' && sub.status === 'trialing') {
      const updated = await SubscriptionRepository.transition(
        sub.workspaceId.toString(),
        ['trialing'],
        'expired',
        { expiredAt: now }
      );
      return updated ?? (await SubscriptionRepository.findByWorkspace(sub.workspaceId.toString())) ?? sub;
    }
    return sub;
  }

  static async getSubscription(workspaceId: string, now: Date = new Date()): Promise<SubscriptionDto> {
    const sub = await this.syncExpiry(await this.ensureSubscription(workspaceId, now), now);
    const workspace = await WorkspaceRepository.findById(workspaceId);
    const access = evaluateDispatchAccess(sub, workspace?.status ?? 'active', now);
    return {
      workspaceId,
      status: effectiveStatus(sub, now),
      storedStatus: sub.status,
      planKey: sub.planKey,
      planVersion: sub.planVersion,
      trialStartedAt: sub.trialStartedAt.toISOString(),
      trialEndsAt: sub.trialEndsAt.toISOString(),
      trialSecondsRemaining:
        sub.status === 'trialing' ? Math.max(0, Math.floor((sub.trialEndsAt.getTime() - now.getTime()) / 1000)) : 0,
      currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
      canDispatch: access.allowed,
      denialReason: access.reason ?? null,
      entitlements: await this.loadEntitlements(sub),
    };
  }

  static async getEntitlements(workspaceId: string) {
    const s = await this.getSubscription(workspaceId);
    return { status: s.status, canDispatch: s.canDispatch, entitlements: s.entitlements };
  }

  /**
   * Enforcement point used by campaign launch and by dispatch, per message. Reads current
   * state each call; it does not trust cached flags or scheduled jobs.
   */
  static async assertDispatchAllowed(workspaceId: string, now: Date = new Date()): Promise<void> {
    const access = await this.checkDispatchAccess(workspaceId, now);
    if (!access.allowed) {
      throw new AppError(
        `Messaging is disabled for this workspace (${access.reason}). Upgrade or contact support.`,
        403,
        ErrorCode.SUBSCRIPTION_INACTIVE,
        [{ message: access.reason ?? 'SUBSCRIPTION_INACTIVE', code: access.reason }]
      );
    }
  }

  static async checkDispatchAccess(workspaceId: string, now: Date = new Date()) {
    const sub = await this.ensureSubscription(workspaceId, now);
    const workspace = await WorkspaceRepository.findById(workspaceId);
    return evaluateDispatchAccess(sub, workspace?.status ?? 'archived', now);
  }

  static async listPlans(): Promise<PlanDto[]> {
    return (await PlanRepository.listLatestActive()).map(toPlanDto);
  }

  static async cancel(workspaceId: string, actorUserId: string): Promise<SubscriptionDto> {
    await this.ensureSubscription(workspaceId);
    const from: SubscriptionStatus[] = ['trialing', 'active', 'past_due'];
    const updated = await SubscriptionRepository.transition(workspaceId, from, 'cancelled', {
      cancelledAt: new Date(),
    });
    // updated === null means already cancelled/expired/suspended: cancel is idempotent for cancelled.
    const current = updated ?? (await SubscriptionRepository.findByWorkspace(workspaceId));
    if (!updated && current && current.status !== 'cancelled') {
      throw new AppError(`Subscription in state "${current.status}" cannot be cancelled.`, 409, ErrorCode.CONFLICT);
    }
    if (updated) {
      await AuditRepository.record({
        workspaceId,
        actorUserId,
        action: 'subscription.cancelled',
        targetType: 'subscription',
        targetId: updated._id.toString(),
      });
    }
    return this.getSubscription(workspaceId);
  }

  static checkout(): never {
    // No payment provider or prices are configured; never pretend a checkout succeeded.
    throw new AppError(
      'Subscription checkout is not available: no payment provider and plan prices are configured.',
      503,
      ErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED
    );
  }
}
