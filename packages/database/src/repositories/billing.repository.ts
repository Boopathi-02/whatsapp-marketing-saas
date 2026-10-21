import { Types } from 'mongoose';
import { PlanVersionModel, IPlanVersion } from '../models/plan_version.model.js';
import {
  SubscriptionModel,
  ISubscription,
  SubscriptionStatusValue,
} from '../models/subscription.model.js';
import {
  PaymentTransactionModel,
  IPaymentTransaction,
} from '../models/payment_transaction.model.js';
import { AuditEventModel } from '../models/audit_event.model.js';

function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

export class PlanRepository {
  static async latestActive(planKey: string): Promise<IPlanVersion | null> {
    return PlanVersionModel.findOne({ planKey, status: 'active' }).sort({ version: -1 });
  }

  static async findVersion(planKey: string, version: number): Promise<IPlanVersion | null> {
    return PlanVersionModel.findOne({ planKey, version });
  }

  /** Creates version 1 of a plan if it does not exist yet (race-safe via the unique index). */
  static async ensureVersionOne(
    data: Pick<IPlanVersion, 'planKey' | 'name' | 'entitlements'>
  ): Promise<IPlanVersion> {
    const found = await PlanVersionModel.findOne({ planKey: data.planKey, version: 1 });
    if (found) return found;
    try {
      return await PlanVersionModel.create({ ...data, version: 1, prices: [] });
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      return (await PlanVersionModel.findOne({ planKey: data.planKey, version: 1 }))!;
    }
  }

  /** Active plans, latest version of each. */
  static async listLatestActive(): Promise<IPlanVersion[]> {
    const all = await PlanVersionModel.find({ status: 'active' }).sort({ planKey: 1, version: -1 });
    const seen = new Set<string>();
    return all.filter(p => (seen.has(p.planKey) ? false : (seen.add(p.planKey), true)));
  }
}

export class SubscriptionRepository {
  static async findByWorkspace(workspaceId: string): Promise<ISubscription | null> {
    return SubscriptionModel.findOne({ workspaceId: new Types.ObjectId(workspaceId) });
  }

  /** Idempotent: a second call returns the existing subscription and never restarts the trial. */
  static async createTrialIfAbsent(data: {
    workspaceId: string;
    planKey: string;
    planVersion: number;
    trialStartedAt: Date;
    trialEndsAt: Date;
  }): Promise<ISubscription> {
    const ws = new Types.ObjectId(data.workspaceId);
    return (await SubscriptionModel.findOneAndUpdate(
      { workspaceId: ws },
      {
        $setOnInsert: {
          workspaceId: ws,
          status: 'trialing',
          planKey: data.planKey,
          planVersion: data.planVersion,
          trialStartedAt: data.trialStartedAt,
          trialEndsAt: data.trialEndsAt,
        },
      },
      { upsert: true, new: true }
    ))!;
  }

  /** Conditional transition: applies only if the subscription is still in one of `from`. */
  static async transition(
    workspaceId: string,
    from: SubscriptionStatusValue[],
    to: SubscriptionStatusValue,
    extra: Record<string, unknown> = {}
  ): Promise<ISubscription | null> {
    return SubscriptionModel.findOneAndUpdate(
      { workspaceId: new Types.ObjectId(workspaceId), status: { $in: from } },
      { $set: { status: to, ...extra } },
      { new: true }
    );
  }

  /** Persists `expired` for due trials; safe to run repeatedly and concurrently. */
  static async expireDueTrials(now: Date): Promise<number> {
    const r = await SubscriptionModel.updateMany(
      { status: 'trialing', trialEndsAt: { $lte: now } },
      { $set: { status: 'expired', expiredAt: now } }
    );
    return r.modifiedCount;
  }
}

export class PaymentRepository {
  static async create(data: {
    workspaceId: string;
    walletId: string;
    provider: string;
    providerReference: string;
    amountMinor: number;
    currency: string;
    initiatedBy: string;
  }): Promise<IPaymentTransaction> {
    return PaymentTransactionModel.create({
      ...data,
      workspaceId: new Types.ObjectId(data.workspaceId),
      walletId: new Types.ObjectId(data.walletId),
      initiatedBy: new Types.ObjectId(data.initiatedBy),
    });
  }

  static async findForWorkspace(workspaceId: string, id: string): Promise<IPaymentTransaction | null> {
    return PaymentTransactionModel.findOne({
      _id: new Types.ObjectId(id),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  static async findByProviderReference(provider: string, ref: string): Promise<IPaymentTransaction | null> {
    return PaymentTransactionModel.findOne({ provider, providerReference: ref });
  }

  static async list(workspaceId: string, limit: number): Promise<IPaymentTransaction[]> {
    return PaymentTransactionModel.find({ workspaceId: new Types.ObjectId(workspaceId) })
      .sort({ _id: -1 })
      .limit(limit);
  }

  /** pending -> final, exactly once. Returns null if another delivery already completed it. */
  static async complete(
    id: Types.ObjectId,
    status: 'succeeded' | 'failed',
    providerEventId: string,
    ledgerEntryId?: Types.ObjectId
  ): Promise<IPaymentTransaction | null> {
    return PaymentTransactionModel.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status,
          lastProviderEventId: providerEventId,
          completedAt: new Date(),
          ...(ledgerEntryId ? { ledgerEntryId } : {}),
        },
      },
      { new: true }
    );
  }
}

export class AuditRepository {
  static async record(data: {
    workspaceId: string;
    actorUserId?: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await AuditEventModel.create({
      ...data,
      workspaceId: new Types.ObjectId(data.workspaceId),
      actorUserId: data.actorUserId ? new Types.ObjectId(data.actorUserId) : null,
    });
  }

  static async list(workspaceId: string, limit: number) {
    return AuditEventModel.find({ workspaceId: new Types.ObjectId(workspaceId) })
      .sort({ _id: -1 })
      .limit(limit);
  }
}
