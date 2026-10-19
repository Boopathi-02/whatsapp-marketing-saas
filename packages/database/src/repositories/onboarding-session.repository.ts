import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { OnboardingSessionModel, IOnboardingSession } from '../models/onboarding_session.model.js';

export class OnboardingSessionRepository {
  /**
   * Create a new cryptographically secure onboarding session for a workspace and user.
   */
  static async createSession(
    workspaceId: string,
    userId: string,
    ttlMinutes = 15
  ): Promise<IOnboardingSession> {
    const stateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    return OnboardingSessionModel.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
      stateToken,
      status: 'pending',
      expiresAt,
    });
  }

  /**
   * Find and validate that an onboarding session exists, belongs to the workspace, is pending, and has not expired.
   */
  static async findAndValidateSession(
    workspaceId: string,
    stateToken: string
  ): Promise<IOnboardingSession | null> {
    if (!stateToken || typeof stateToken !== 'string') return null;

    const session = await OnboardingSessionModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      stateToken: stateToken.trim(),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    return session;
  }

  /**
   * Mark session as exchanging to prevent concurrent re-use / replay attacks.
   */
  static async markExchanging(sessionId: string): Promise<boolean> {
    const res = await OnboardingSessionModel.updateOne(
      {
        _id: new Types.ObjectId(sessionId),
        status: 'pending',
      },
      {
        $set: { status: 'exchanging' },
      }
    );
    return res.modifiedCount > 0;
  }

  /**
   * Mark session as completed with confirmed WABA and Phone IDs.
   */
  static async markCompleted(
    sessionId: string,
    wabaId?: string,
    phoneNumberId?: string
  ): Promise<void> {
    await OnboardingSessionModel.updateOne(
      { _id: new Types.ObjectId(sessionId) },
      {
        $set: {
          status: 'completed',
          wabaId,
          phoneNumberId,
        },
      }
    );
  }
}
