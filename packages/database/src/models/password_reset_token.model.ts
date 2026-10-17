import { Schema, model, Document, Types } from 'mongoose';

export interface IPasswordResetToken {
  _id: Types.ObjectId;
  id?: string;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PasswordResetTokenDocument = Document<Types.ObjectId, Record<string, unknown>, IPasswordResetToken> & IPasswordResetToken;

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
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

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
PasswordResetTokenSchema.index({ userId: 1, usedAt: 1 });

export const PasswordResetTokenModel = model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
