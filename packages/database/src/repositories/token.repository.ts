import { Types } from 'mongoose';
import { EmailVerificationTokenModel } from '../models/email_verification_token.model.js';
import { PasswordResetTokenModel } from '../models/password_reset_token.model.js';

export class TokenRepository {
  /**
   * Creates an email verification token.
   */
  static async createEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await EmailVerificationTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash,
      expiresAt,
    });
  }

  /**
   * Validates and atomically consumes an email verification token (single-use).
   */
  static async consumeEmailVerificationToken(tokenHash: string): Promise<string | null> {
    const token = await EmailVerificationTokenModel.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!token) return null;

    token.usedAt = new Date();
    await token.save();

    return token.userId.toString();
  }

  /**
   * Creates a password reset token.
   */
  static async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await PasswordResetTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash,
      expiresAt,
    });
  }

  /**
   * Validates and atomically consumes a password reset token (single-use).
   */
  static async consumePasswordResetToken(tokenHash: string): Promise<string | null> {
    const token = await PasswordResetTokenModel.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!token) return null;

    token.usedAt = new Date();
    await token.save();

    return token.userId.toString();
  }
}
