import { Schema, model, Document, Types } from 'mongoose';

export interface IWalletAccount extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  currency: string;
  /** Sum of posted ledger movements (credits - debits), integer minor units. */
  postedMinor: number;
  /** Sum of active reservations. available = postedMinor - reservedMinor. */
  reservedMinor: number;
  lowBalanceThresholdMinor: number;
  createdAt: Date;
  updatedAt: Date;
}

const nonNegInt = { type: Number, required: true, default: 0, min: 0, validate: Number.isSafeInteger };

const WalletAccountSchema = new Schema<IWalletAccount>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    postedMinor: nonNegInt,
    reservedMinor: nonNegInt,
    lowBalanceThresholdMinor: nonNegInt,
  },
  { timestamps: true }
);

// One wallet per tenant per currency.
WalletAccountSchema.index({ workspaceId: 1, currency: 1 }, { unique: true });

export const WalletAccountModel = model<IWalletAccount>('WalletAccount', WalletAccountSchema);
