import { Schema, model, Document, Types } from 'mongoose';

export interface IEmailVerificationToken {
  _id: Types.ObjectId;
  id?: string;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailVerificationTokenDocument = Document<Types.ObjectId, Record<string, unknown>, IEmailVerificationToken> & IEmailVerificationToken;

const EmailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
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
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id ?? '');
        ret.userId = String(ret.userId ?? '');
        delete ret.__v;
        delete ret.tokenHash;
        return ret;
      },
    },
  }
);

EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EmailVerificationTokenSchema.index({ userId: 1, usedAt: 1 });

export const EmailVerificationTokenModel = model<IEmailVerificationToken>('EmailVerificationToken', EmailVerificationTokenSchema);
