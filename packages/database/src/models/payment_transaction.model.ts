import { Schema, model, Document, Types } from 'mongoose';

export interface IPaymentTransaction extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  walletId: Types.ObjectId;
  provider: string;
  /** Provider-side payment reference; the callback correlates on this, never on a tenant id. */
  providerReference: string;
  amountMinor: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  initiatedBy: Types.ObjectId;
  ledgerEntryId?: Types.ObjectId | null;
  lastProviderEventId?: string | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'WalletAccount', required: true },
    provider: { type: String, required: true },
    providerReference: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    currency: { type: String, required: true },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ledgerEntryId: { type: Schema.Types.ObjectId, default: null },
    lastProviderEventId: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PaymentTransactionSchema.index({ provider: 1, providerReference: 1 }, { unique: true });
PaymentTransactionSchema.index({ workspaceId: 1, createdAt: -1 });

export const PaymentTransactionModel = model<IPaymentTransaction>(
  'PaymentTransaction',
  PaymentTransactionSchema
);
