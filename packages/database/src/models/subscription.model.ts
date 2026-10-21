import { Schema, model, Document, Types } from 'mongoose';

export type SubscriptionStatusValue =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  status: SubscriptionStatusValue;
  planKey: string;
  planVersion: number;
  trialStartedAt: Date;
  trialEndsAt: Date;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelledAt?: Date | null;
  suspendedAt?: Date | null;
  expiredAt?: Date | null;
  entitlementOverrides?: Record<string, number> | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    // One subscription per workspace; the unique index also makes lazy creation race-safe.
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired'],
      required: true,
    },
    planKey: { type: String, required: true },
    planVersion: { type: Number, required: true },
    trialStartedAt: { type: Date, required: true },
    trialEndsAt: { type: Date, required: true },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    entitlementOverrides: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Scan index for the trial-expiry job.
SubscriptionSchema.index({ status: 1, trialEndsAt: 1 });

export const SubscriptionModel = model<ISubscription>('Subscription', SubscriptionSchema);
