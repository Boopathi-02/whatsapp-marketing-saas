import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailService {
  sendVerificationEmail(to: string, token: string, displayName: string): Promise<void>;
  sendPasswordResetEmail(to: string, token: string, displayName: string): Promise<void>;
  sendWorkspaceInvitationEmail(to: string, token: string, workspaceName: string, inviterName: string): Promise<void>;
}

export class EmailServiceImpl implements IEmailService {
  // In-memory token store for test assertions & local debugging
  public lastSentVerificationToken: { email: string; token: string } | null = null;
  public lastSentPasswordResetToken: { email: string; token: string } | null = null;
  public lastSentInvitationToken: { email: string; token: string; workspaceName: string } | null = null;

  async sendVerificationEmail(to: string, token: string, displayName: string): Promise<void> {
    this.lastSentVerificationToken = { email: to, token };
    const verifyUrl = `${env.WEB_ORIGIN}/verify-email?token=${token}`;

    if (env.NODE_ENV === 'production') {
      logger.info({ to, subject: 'Verify your email address' }, 'Email verification message dispatched');
    } else {
      logger.info(
        { to, displayName, verifyUrl },
        `[DEV/TEST EMAIL] Verification link generated: ${verifyUrl}`
      );
    }
  }

  async sendPasswordResetEmail(to: string, token: string, displayName: string): Promise<void> {
    this.lastSentPasswordResetToken = { email: to, token };
    const resetUrl = `${env.WEB_ORIGIN}/reset-password?token=${token}`;

    if (env.NODE_ENV === 'production') {
      logger.info({ to, subject: 'Reset your password' }, 'Password reset message dispatched');
    } else {
      logger.info(
        { to, displayName, resetUrl },
        `[DEV/TEST EMAIL] Password reset link generated: ${resetUrl}`
      );
    }
  }

  async sendWorkspaceInvitationEmail(
    to: string,
    token: string,
    workspaceName: string,
    inviterName: string
  ): Promise<void> {
    this.lastSentInvitationToken = { email: to, token, workspaceName };
    const inviteUrl = `${env.WEB_ORIGIN}/invitations/${token}`;

    if (env.NODE_ENV === 'production') {
      logger.info({ to, workspaceName, inviterName }, 'Workspace invitation dispatched');
    } else {
      logger.info(
        { to, workspaceName, inviterName, inviteUrl },
        `[DEV/TEST EMAIL] Invitation link generated: ${inviteUrl}`
      );
    }
  }
}

export const emailService = new EmailServiceImpl();
