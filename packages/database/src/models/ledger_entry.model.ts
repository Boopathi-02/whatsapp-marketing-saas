import { Schema, model, Document, Types } from 'mongoose';

export interface ILedgerLine {
  account: string;
  direction: 'debit' | 'credit';
  amountMinor: number;
}

export type LedgerEntryTypeValue =
  | 'top_up'
  | 'usage_charge'
  | 'refund'
  | 'adjustment_credit'
  | 'adjustment_debit'
  | 'reversal';

export interface ILedgerEntry extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  walletId: Types.ObjectId;
  type: LedgerEntryTypeValue;
  currency: string;
  lines: ILedgerLine[];
  /** Signed effect on the wallet (credit - debit). */
  walletDeltaMinor: number;
  balanceAfterMinor: number;
  idempotencyKey: string;
  reference?: { kind: string; id: string } | null;
  reversesEntryId?: Types.ObjectId | null;
  memo?: string;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
}

const LineSchema = new Schema<ILedgerLine>(
  {
    account: { type: String, required: true },
    direction: { type: String, enum: ['debit', 'credit'], required: true },
    amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  },
  { _id: false }
);

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'WalletAccount', required: true },
    type: {
      type: String,
      enum: ['top_up', 'usage_charge', 'refund', 'adjustment_credit', 'adjustment_debit', 'reversal'],
      required: true,
    },
    currency: { type: String, required: true },
    lines: { type: [LineSchema], required: true },
    walletDeltaMinor: { type: Number, required: true, validate: Number.isSafeInteger },
    balanceAfterMinor: { type: Number, required: true, validate: Number.isSafeInteger },
    idempotencyKey: { type: String, required: true },
    reference: { type: new Schema({ kind: String, id: String }, { _id: false }), default: null },
    reversesEntryId: { type: Schema.Types.ObjectId, default: null },
    memo: { type: String, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LedgerEntrySchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });
LedgerEntrySchema.index({ workspaceId: 1, createdAt: -1, _id: -1 });

// Ledger entries are immutable: corrections are compensating entries.
const IMMUTABLE_MSG = 'Ledger entries are immutable; post a compensating entry instead.';
const BLOCKED_OPS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const;
for (const op of BLOCKED_OPS) {
  LedgerEntrySchema.pre(op, function () {
    throw new Error(IMMUTABLE_MSG);
  });
}
LedgerEntrySchema.pre('save', function () {
  if (!this.isNew) throw new Error(IMMUTABLE_MSG);
});

export const LedgerEntryModel = model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
