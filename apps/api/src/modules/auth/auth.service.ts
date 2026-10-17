import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { SecurityUtil } from '../../utils/security.js';
import { JwtUtil } from '../../utils/jwt.js';
import { emailService } from '../../utils/email.js';
import { AppError } from '../../utils/errors.js';
import {
  UserRepository,
  WorkspaceRepository,
  SessionRepository,
  TokenRepository,
  IUser,
} from '@whatsapp-saas/database';
import {
  RegisterRequest,
  LoginRequest,
  ResetPasswordRequest,
  ErrorCode,
  AuthUserDto,
} from '@whatsapp-saas/contracts';
import { logger } from '../../utils/logger.js';

export class AuthService {
  /**
   * Helper to format User model to AuthUserDto.
   */
  private static toUserDto(user: IUser): AuthUserDto {
    const id = user._id.toString();
    return {
      id,
      email: user.email,
      displayName: user.displayName,
      status: user.accountStatus,
      accountStatus: user.accountStatus,
      isEmailVerified: user.emailVerified,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Helper to generate a unique URL slug from a name.
   */
  private static generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base || 'workspace'}-${suffix}`;
  }

  /**
   * User Registration.
   */
  static async register(
    data: RegisterRequest,
    meta?: { userAgent?: string; ipAddress?: string }
  ) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await UserRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError(
        'An account with this email address already exists.',
        409,
        ErrorCode.EMAIL_ALREADY_EXISTS
      );
    }

    const passwordHash = await SecurityUtil.hashPassword(data.password);
    const user = await UserRepository.create({
      email: normalizedEmail,
      passwordHash,
      displayName: data.displayName.trim(),
      accountStatus: 'active',
      emailVerified: false,
    });

    const userId = user._id.toString();

    // Generate email verification token (valid for 24h)
    const rawVerifyToken = SecurityUtil.generateRandomToken(32);
    const verifyTokenHash = SecurityUtil.hashToken(rawVerifyToken);
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await TokenRepository.createEmailVerificationToken(userId, verifyTokenHash, verifyExpiresAt);
    await emailService.sendVerificationEmail(user.email, rawVerifyToken, user.displayName);

    // Automatically provision initial default workspace
    const workspaceName = `${user.displayName}'s Workspace`;
    const workspaceSlug = this.generateSlug(user.displayName);
    const workspace = await WorkspaceRepository.create({
      name: workspaceName,
      slug: workspaceSlug,
      ownerId: userId,
    });

    // Create session & refresh token
    const rawRefreshToken = SecurityUtil.generateRandomToken(40);
    const refreshTokenHash = SecurityUtil.hashToken(rawRefreshToken);
    const tokenFamily = SecurityUtil.generateTokenFamily();
    const sessionExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    await SessionRepository.create({
      userId,
      tokenHash: refreshTokenHash,
      tokenFamily,
      expiresAt: sessionExpiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });

    const accessToken = JwtUtil.signAccessToken({
      sub: userId,
      email: user.email,
      displayName: user.displayName,
    });

    return {
      user: this.toUserDto(user),
      accessToken,
      refreshToken: rawRefreshToken,
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
        role: 'owner',
      },
    };
  }

  /**
   * User Login.
   */
  static async login(
    data: LoginRequest,
    meta?: { userAgent?: string; ipAddress?: string }
  ) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const user = await UserRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new AppError('Invalid email or password.', 401, ErrorCode.INVALID_CREDENTIALS);
    }

    const isValidPassword = await SecurityUtil.verifyPassword(user.passwordHash, data.password);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password.', 401, ErrorCode.INVALID_CREDENTIALS);
    }

    if (user.accountStatus === 'suspended') {
      throw new AppError('Your account has been suspended. Please contact support.', 403, ErrorCode.FORBIDDEN);
    }

    const userId = user._id.toString();
    await UserRepository.updateLastLogin(userId);

    // Create session & refresh token
    const rawRefreshToken = SecurityUtil.generateRandomToken(40);
    const refreshTokenHash = SecurityUtil.hashToken(rawRefreshToken);
    const tokenFamily = SecurityUtil.generateTokenFamily();
    const sessionExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    await SessionRepository.create({
      userId,
      tokenHash: refreshTokenHash,
      tokenFamily,
      expiresAt: sessionExpiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });

    const accessToken = JwtUtil.signAccessToken({
      sub: userId,
      email: user.email,
      displayName: user.displayName,
    });

    return {
      user: this.toUserDto(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Token Refresh with Token Family Rotation and Reuse Detection.
   */
  static async refresh(
    rawRefreshToken: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new AppError('Refresh token is required.', 401, ErrorCode.UNAUTHORIZED);
    }

    const tokenHash = SecurityUtil.hashToken(rawRefreshToken);
    const session = await SessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new AppError('Invalid refresh token.', 401, ErrorCode.UNAUTHORIZED);
    }

    // Reuse detection: if a revoked refresh token is presented, someone may have compromised it!
    if (session.isRevoked) {
      logger.warn(
        {
          userId: session.userId.toString(),
          tokenFamily: session.tokenFamily,
          revocationReason: session.revocationReason,
        },
        'SECURITY ALERT: Revoked refresh token presented. Revoking entire token family.'
      );

      await SessionRepository.revokeTokenFamily(session.tokenFamily, 'reuse_detected');
      throw new AppError(
        'Session security violation: token reuse detected. All sessions in this chain have been terminated.',
        401,
        ErrorCode.TOKEN_REVOKED
      );
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      throw new AppError('Refresh token has expired. Please log in again.', 401, ErrorCode.TOKEN_EXPIRED);
    }

    const userId = session.userId.toString();
    const user = await UserRepository.findById(userId);

    if (!user || user.accountStatus === 'suspended') {
      throw new AppError('User account is invalid or suspended.', 401, ErrorCode.UNAUTHORIZED);
    }

    // Rotate refresh token
    const newRawRefreshToken = SecurityUtil.generateRandomToken(40);
    const newTokenHash = SecurityUtil.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    await SessionRepository.rotate(tokenHash, newTokenHash, newExpiresAt, meta);

    const accessToken = JwtUtil.signAccessToken({
      sub: userId,
      email: user.email,
      displayName: user.displayName,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: this.toUserDto(user),
    };
  }

  /**
   * Logout.
   */
  static async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = SecurityUtil.hashToken(rawRefreshToken);
      await SessionRepository.revokeSession(tokenHash, 'user_logout');
    }
  }

  /**
   * Get Current User Profile.
   */
  static async getMe(userId: string): Promise<AuthUserDto> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
    }
    return this.toUserDto(user);
  }

  /**
   * Email Verification.
   */
  static async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token || typeof token !== 'string') {
      throw new AppError('Verification token is required.', 400, ErrorCode.BAD_REQUEST);
    }

    const tokenHash = SecurityUtil.hashToken(token);
    const userId = await TokenRepository.consumeEmailVerificationToken(tokenHash);

    if (!userId) {
      throw new AppError(
        'Invalid or expired verification token.',
        400,
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    await UserRepository.markEmailVerified(userId);
    return { message: 'Your email address has been successfully verified.' };
  }

  /**
   * Forgot Password.
   * Returns a generic response to prevent account enumeration.
   */
  static async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserRepository.findByEmail(normalizedEmail);

    if (user && user.accountStatus !== 'suspended') {
      const userId = user._id.toString();
      const rawToken = SecurityUtil.generateRandomToken(32);
      const tokenHash = SecurityUtil.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await TokenRepository.createPasswordResetToken(userId, tokenHash, expiresAt);
      await emailService.sendPasswordResetEmail(user.email, rawToken, user.displayName);
    }

    return {
      message:
        'If an account exists with the provided email address, a password reset link has been dispatched.',
    };
  }

  /**
   * Reset Password.
   */
  static async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const tokenHash = SecurityUtil.hashToken(data.token);
    const userId = await TokenRepository.consumePasswordResetToken(tokenHash);

    if (!userId) {
      throw new AppError(
        'Invalid or expired password reset token.',
        400,
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    const newPasswordHash = await SecurityUtil.hashPassword(data.newPassword);
    await UserRepository.updatePassword(userId, newPasswordHash);

    // Revoke all existing sessions for this user upon password reset
    await SessionRepository.revokeAllForUser(userId, 'password_reset');

    return {
      message: 'Your password has been successfully reset. Please log in with your new credentials.',
    };
  }
}
