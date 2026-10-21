import { Schema, model, Document, Types } from 'mongoose';

export interface IPlanPrice {
  interval: 'month' | 'year';
  currency: string;
  amountMinor: number;
}

export interface IPlanVersion extends Document {
  _id: Types.ObjectId;
  planKey: string;
  version: number;
  name: string;
  status: 'active' | 'retired';
  entitlements: {
    monthlyMessageLimit: number;
    contactLimit: number;
    userLimit: number;
    whatsappAccountLimit: number;
  };
  /** Prices are configured by the business; none are seeded. */
  prices: IPlanPrice[];
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlanPriceSchema = new Schema<IPlanPrice>(
  {
    interval: { type: String, enum: ['month', 'year'], required: true },
    currency: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  },
  { _id: false }
);

const PlanVersionSchema = new Schema<IPlanVersion>(
  {
    planKey: { type: String, required: true, trim: true },
    version: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'retired'], default: 'active' },
    entitlements: {
      monthlyMessageLimit: { type: Number, required: true, min: 0 },
      contactLimit: { type: Number, required: true, min: 0 },
      userLimit: { type: Number, required: true, min: 0 },
      whatsappAccountLimit: { type: Number, required: true, min: 0 },
    },
    prices: { type: [PlanPriceSchema], default: [] },
    effectiveFrom: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

PlanVersionSchema.index({ planKey: 1, version: 1 }, { unique: true });

export const PlanVersionModel = model<IPlanVersion>('PlanVersion', PlanVersionSchema);
