import { Schema, model, Document, Types } from 'mongoose';

export interface IWalletReservation extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  walletId: Types.ObjectId;
  amountMinor: number;
  status: 'active' | 'settled' | 'released';
  idempotencyKey: string;
  reference?: { kind: string; id: string } | null;
  settledMinor: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletReservationSchema = new Schema<IWalletReservation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'WalletAccount', required: true },
    amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    status: { type: String, enum: ['active', 'settled', 'released'], default: 'active' },
    idempotencyKey: { type: String, required: true },
    reference: { type: new Schema({ kind: String, id: String }, { _id: false }), default: null },
    settledMinor: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

WalletReservationSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });
WalletReservationSchema.index({ workspaceId: 1, status: 1 });

export const WalletReservationModel = model<IWalletReservation>(
  'WalletReservation',
  WalletReservationSchema
);
