import { Types } from 'mongoose';
import { UserModel, IUser, AccountStatus } from '../models/user.model.js';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
  accountStatus?: AccountStatus;
  emailVerified?: boolean;
}

export class UserRepository {
  static async create(data: CreateUserData): Promise<IUser> {
    const user = new UserModel({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      displayName: data.displayName.trim(),
      accountStatus: data.accountStatus || 'active',
      emailVerified: data.emailVerified ?? false,
    });
    await user.save();
    return user.toJSON() as IUser;
  }

  static async findByEmail(email: string): Promise<(IUser & { passwordHash: string }) | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) return null;
    return {
      ...(user.toJSON() as IUser),
      passwordHash: user.passwordHash, // Explicitly included for auth verification
    };
  }

  static async findById(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const user = await UserModel.findById(id);
    return user ? (user.toJSON() as IUser) : null;
  }

  static async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const user = await UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    return user ? (user.toJSON() as IUser) : null;
  }

  static async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await UserModel.updateOne({ _id: new Types.ObjectId(id) }, { $set: { passwordHash } });
    return result.modifiedCount > 0;
  }

  static async markEmailVerified(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await UserModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { emailVerified: true, emailVerifiedAt: new Date(), accountStatus: 'active' } }
    );
    return result.modifiedCount > 0;
  }

  static async updateLastLogin(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await UserModel.updateOne({ _id: new Types.ObjectId(id) }, { $set: { lastLoginAt: new Date() } });
  }
}
