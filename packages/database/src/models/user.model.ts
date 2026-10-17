import { Schema, model, Types, HydratedDocument } from 'mongoose';

export type AccountStatus = 'active' | 'suspended' | 'pending_verification';

export interface IUser {
  _id: Types.ObjectId;
  id?: string;
  email: string;
  passwordHash: string;
  displayName: string;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'active',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id ?? '');
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Explicit indexes

export const UserModel = model<IUser>('User', UserSchema);
