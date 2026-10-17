import { Schema, model, Document, Types } from 'mongoose';

export interface ISession {
  _id: Types.ObjectId;
  id?: string;
  userId: Types.ObjectId;
  tokenHash: string;
  tokenFamily: string;
  isRevoked: boolean;
  revokedAt?: Date | null;
  revocationReason?: string | null;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocument = Document<Types.ObjectId, Record<string, unknown>, ISession> & ISession;

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenFamily: {
      type: String,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id ?? '');
        ret.userId = String(ret.userId ?? '');
        delete ret.__v;
        delete ret.tokenHash; // Never expose token hash
        return ret;
      },
    },
  }
);

// TTL index automatically purges expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1, isRevoked: 1 });

export const SessionModel = model<ISession>('Session', SessionSchema);
