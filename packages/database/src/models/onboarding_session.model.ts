import { Schema, model, Document, Types } from 'mongoose';

export interface IOnboardingSession extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  stateToken: string;
  status: 'pending' | 'exchanging' | 'completed' | 'expired';
  wabaId?: string;
  phoneNumberId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingSessionSchema = new Schema<IOnboardingSession>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stateToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'exchanging', 'completed', 'expired'],
      default: 'pending',
      index: true,
    },
    wabaId: {
      type: String,
      trim: true,
    },
    phoneNumberId: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatic TTL cleanup after expiration
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id ?? '');
        ret.workspaceId = String(ret.workspaceId ?? '');
        ret.userId = String(ret.userId ?? '');
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const OnboardingSessionModel = model<IOnboardingSession>(
  'OnboardingSession',
  OnboardingSessionSchema
);
