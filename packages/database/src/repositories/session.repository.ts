import { Types } from 'mongoose';
import { SessionModel, ISession } from '../models/session.model.js';

export interface CreateSessionData {
  userId: string;
  tokenHash: string;
  tokenFamily: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class SessionRepository {
  static async create(data: CreateSessionData): Promise<ISession> {
    const session = new SessionModel({
      userId: new Types.ObjectId(data.userId),
      tokenHash: data.tokenHash,
      tokenFamily: data.tokenFamily,
      expiresAt: data.expiresAt,
      userAgent: data.userAgent || '',
      ipAddress: data.ipAddress || '',
      lastUsedAt: new Date(),
    });
    await session.save();
    return session.toJSON() as ISession;
  }

  static async findByTokenHash(tokenHash: string): Promise<ISession | null> {
    const session = await SessionModel.findOne({ tokenHash });
    return session ? (session.toJSON() as ISession) : null;
  }

  /**
   * Rotates a session:
   * Marks old token as revoked ('rotated') and creates a new session in the same tokenFamily.
   */
  static async rotate(
    oldTokenHash: string,
    newTokenHash: string,
    newExpiresAt: Date,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<ISession | null> {
    const oldSession = await SessionModel.findOne({ tokenHash: oldTokenHash });
    if (!oldSession) return null;

    // Mark old token revoked due to normal rotation
    oldSession.isRevoked = true;
    oldSession.revokedAt = new Date();
    oldSession.revocationReason = 'rotated';
    await oldSession.save();

    // Create successor session in the same family
    const newSession = new SessionModel({
      userId: oldSession.userId,
      tokenHash: newTokenHash,
      tokenFamily: oldSession.tokenFamily,
      expiresAt: newExpiresAt,
      userAgent: metadata?.userAgent || oldSession.userAgent,
      ipAddress: metadata?.ipAddress || oldSession.ipAddress,
      lastUsedAt: new Date(),
    });
    await newSession.save();

    return newSession.toJSON() as ISession;
  }

  /**
   * Revokes an entire token family upon detecting reuse of a revoked token.
   */
  static async revokeTokenFamily(tokenFamily: string, reason = 'reuse_detected'): Promise<number> {
    const result = await SessionModel.updateMany(
      { tokenFamily, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date(), revocationReason: reason } }
    );
    return result.modifiedCount;
  }

  /**
   * Revokes a specific session by tokenHash.
   */
  static async revokeSession(tokenHash: string, reason = 'user_logout'): Promise<boolean> {
    const result = await SessionModel.updateOne(
      { tokenHash, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date(), revocationReason: reason } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Revokes all active sessions for a user (e.g. after password reset).
   */
  static async revokeAllForUser(userId: string, reason = 'security_reset'): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    const result = await SessionModel.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date(), revocationReason: reason } }
    );
    return result.modifiedCount;
  }
}
