import {
  WhatsAppAccountRepository,
  OnboardingSessionRepository,
  WebhookEventModel,
  IWhatsAppAccount,
} from '@whatsapp-saas/database';
import {
  ConnectWhatsAppAccountRequest,
  WhatsAppAccountDto,
  SyncWhatsAppAccountResponse,
  EmbeddedSignupCompletionRequest,
  OnboardingSessionResponse,
  WhatsAppAccountHealthDto,
  BusinessProfileDto,
  UpdateBusinessProfileRequest,
} from '@whatsapp-saas/contracts';
import {
  MetaWhatsAppCloudAdapter,
  WhatsAppAdapter,
  MockWhatsAppAdapter,
} from '@whatsapp-saas/whatsapp-adapter';
import { QualityRating, WhatsAppAccountStatus } from '@whatsapp-saas/domain';
import { env } from '../../config/env.js';
import { encryptCredential, decryptCredential } from '../../utils/crypto.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';
import { logger } from '../../utils/logger.js';

export class WhatsAppService {
  private adapter: WhatsAppAdapter;

  constructor(customAdapter?: WhatsAppAdapter) {
    if (customAdapter) {
      this.adapter = customAdapter;
    } else if (env.NODE_ENV === 'test') {
      this.adapter = new MockWhatsAppAdapter();
    } else {
      this.adapter = new MetaWhatsAppCloudAdapter({
        graphApiVersion: env.META_GRAPH_API_VERSION,
      });
    }
  }

  /**
   * Connect a WhatsApp Business Account and associated phone number to a workspace.
   */
  async connectAccount(
    workspaceId: string,
    req: ConnectWhatsAppAccountRequest
  ): Promise<WhatsAppAccountDto> {
    const phoneNumberId = req.phoneNumberId.trim();
    const wabaId = req.wabaId.trim();
    const accessToken = req.accessToken.trim();

    // 0. Multi-Tenant Protection: Verify phoneNumberId is not already active in another workspace
    const existingGlobal = await WhatsAppAccountRepository.findByPhoneNumberId(phoneNumberId);
    if (
      existingGlobal &&
      existingGlobal.workspaceId.toString() !== workspaceId &&
      existingGlobal.status === WhatsAppAccountStatus.CONNECTED
    ) {
      throw new AppError(
        'This WhatsApp Phone Number ID is already connected to another workspace.',
        409,
        ErrorCode.CONFLICT
      );
    }

    // 1. Verify credentials and fetch phone details from Meta Graph API
    let displayPhoneNumber = req.displayPhoneNumber?.trim() || '';
    let displayName = req.displayName?.trim() || '';
    let qualityRating: QualityRating = QualityRating.UNKNOWN;
    const metadata: Record<string, unknown> = {};

    try {
      const phoneDetails = await this.adapter.fetchPhoneNumberDetails(phoneNumberId, accessToken);
      displayPhoneNumber = phoneDetails.displayPhoneNumber || displayPhoneNumber || 'Unknown Number';
      displayName = phoneDetails.verifiedName || displayName || 'WhatsApp Business Account';
      qualityRating = phoneDetails.qualityRating || QualityRating.UNKNOWN;
      metadata.phoneDetails = phoneDetails;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, phoneNumberId }, 'Failed to fetch phone number details during connect');
      // If user supplied explicit display name and phone number, allow degraded connection, else throw
      if (!displayPhoneNumber || !displayName) {
        throw new AppError(
          `Unable to verify phone number credentials with Meta: ${message}`,
          400,
          ErrorCode.BAD_REQUEST
        );
      }
    }

    // 2. Fetch WABA metadata if supported
    try {
      const wabaDetails = await this.adapter.fetchWabaDetails(wabaId, accessToken);
      metadata.wabaDetails = wabaDetails;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, wabaId }, 'Failed to fetch WABA details during connect');
    }

    // 3. Encrypt access token at rest using AES-256-GCM
    const accessTokenEncrypted = encryptCredential(accessToken);

    // 4. Save account in database scoped to the workspace
    const account = await WhatsAppAccountRepository.upsertAccount({
      workspaceId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      displayName,
      qualityRating,
      status: WhatsAppAccountStatus.CONNECTED,
      accessTokenEncrypted,
      metadata,
    });

    return this.toDto(account);
  }

  /**
   * Return public configuration parameters for Embedded Signup v4.
   */
  getEmbeddedSignupConfig(): { appId: string; configId: string; graphApiVersion: string } {
    return {
      appId: env.META_APP_ID,
      configId: env.META_CONFIG_ID,
      graphApiVersion: env.META_GRAPH_API_VERSION,
    };
  }

  /**
   * Generates a secure, cryptographically random onboarding session with CSRF state token.
   */
  async createOnboardingSession(
    workspaceId: string,
    userId: string
  ): Promise<OnboardingSessionResponse> {
    const session = await OnboardingSessionRepository.createSession(workspaceId, userId, 15);
    return {
      sessionId: session._id.toString(),
      stateToken: session.stateToken,
      appId: env.META_APP_ID,
      configId: env.META_CONFIG_ID,
      graphApiVersion: env.META_GRAPH_API_VERSION,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  /**
   * Complete Meta WhatsApp Embedded Signup v4 flow.
   * Validates CSRF stateToken if provided, exchanges code for token, verifies WABA and Phone permissions,
   * registers the phone number, subscribes webhooks, encrypts credentials, and saves the account.
   */
  async completeEmbeddedSignup(
    workspaceId: string,
    req: EmbeddedSignupCompletionRequest
  ): Promise<WhatsAppAccountDto> {
    const code = req.code.trim();

    // 0. CSRF & Replay Protection: Validate and lock onboarding session if stateToken provided
    let sessionId: string | undefined;
    if (req.stateToken) {
      const session = await OnboardingSessionRepository.findAndValidateSession(
        workspaceId,
        req.stateToken
      );
      if (!session) {
        throw new AppError(
          'Invalid, expired, or previously used onboarding session. Please restart WhatsApp connection.',
          400,
          ErrorCode.BAD_REQUEST
        );
      }
      sessionId = session._id.toString();
      const marked = await OnboardingSessionRepository.markExchanging(sessionId);
      if (!marked) {
        throw new AppError(
          'Onboarding session is already being processed or expired.',
          400,
          ErrorCode.BAD_REQUEST
        );
      }
    }

    // 1. Exchange authorization code for user access token
    let tokenResult;
    try {
      tokenResult = await this.adapter.exchangeCodeForToken(
        code,
        env.META_APP_ID,
        env.META_APP_SECRET
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, 'Failed to exchange Embedded Signup code for token');
      throw new AppError(
        `Failed to exchange authorization code with Meta: ${message}`,
        400,
        ErrorCode.BAD_REQUEST
      );
    }
    const accessToken = tokenResult.accessToken;

    // 2. Validate token validity with Meta debug_token endpoint
    const appAccessToken = `${env.META_APP_ID}|${env.META_APP_SECRET}`;
    let debugResult;
    try {
      debugResult = await this.adapter.debugToken(accessToken, appAccessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, 'Failed to debug token');
      throw new AppError(`Failed to inspect authorization token: ${message}`, 400, ErrorCode.BAD_REQUEST);
    }

    if (!debugResult.isValid) {
      throw new AppError(
        debugResult.error || 'The Meta authorization token is invalid or expired.',
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // Determine target WABA ID and Phone Number ID
    let wabaId = req.wabaId?.trim();
    const phoneNumberId = req.phoneNumberId?.trim();

    // If wabaId was not supplied by client event, extract from granular scopes if present
    if (!wabaId && debugResult.granularScopes) {
      for (const g of debugResult.granularScopes) {
        if (g.targetIds && g.targetIds.length > 0) {
          wabaId = g.targetIds[0];
          break;
        }
      }
    }

    if (!wabaId) {
      throw new AppError(
        'WhatsApp Business Account ID was not found or provided during signup.',
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    if (!phoneNumberId) {
      throw new AppError(
        'WhatsApp Phone Number ID is required to complete connection.',
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // 3. Multi-Tenant Protection: Verify phoneNumberId is not already active in another workspace
    const existingGlobal = await WhatsAppAccountRepository.findByPhoneNumberId(phoneNumberId);
    if (
      existingGlobal &&
      existingGlobal.workspaceId.toString() !== workspaceId &&
      existingGlobal.status === WhatsAppAccountStatus.CONNECTED
    ) {
      throw new AppError(
        'This WhatsApp Phone Number ID is already connected to another workspace.',
        409,
        ErrorCode.CONFLICT
      );
    }

    // 4. Server-side validation of WABA access
    let wabaDetails;
    try {
      wabaDetails = await this.adapter.fetchWabaDetails(wabaId, accessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, wabaId }, 'Failed to verify WABA ownership with Meta');
      throw new AppError(
        `Failed to verify WABA ownership with Meta: ${message}`,
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // 5. Server-side validation of Phone Number access
    let phoneDetails;
    try {
      phoneDetails = await this.adapter.fetchPhoneNumberDetails(phoneNumberId, accessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, phoneNumberId }, 'Failed to verify phone number ownership with Meta');
      throw new AppError(
        `Failed to verify Phone Number ownership with Meta: ${message}`,
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // 6. Automatically subscribe WABA to our webhook app
    try {
      await this.adapter.subscribeWabaWebhooks(wabaId, accessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, wabaId }, 'Warning: Failed to auto-subscribe WABA webhooks');
    }

    // 7. Register phone number on Meta Cloud API
    try {
      await this.adapter.registerPhoneNumber(phoneNumberId, accessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, phoneNumberId }, 'Notice: Phone number registration status');
    }

    // 8. Encrypt access token at rest using AES-256-GCM
    const accessTokenEncrypted = encryptCredential(accessToken);

    // 9. Persist account scoped to workspace
    const account = await WhatsAppAccountRepository.upsertAccount({
      workspaceId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber: phoneDetails.displayPhoneNumber || 'Unknown Number',
      displayName: phoneDetails.verifiedName || wabaDetails.name || 'WhatsApp Business Account',
      qualityRating: phoneDetails.qualityRating || QualityRating.UNKNOWN,
      status: WhatsAppAccountStatus.CONNECTED,
      accessTokenEncrypted,
      metadata: {
        signupMethod: 'embedded_signup_v4',
        wabaDetails,
        phoneDetails,
        tokenExpiresIn: tokenResult.expiresIn,
      },
    });

    if (sessionId) {
      await OnboardingSessionRepository.markCompleted(sessionId, wabaId, phoneNumberId);
    }

    return this.toDto(account);
  }

  /**
   * List all connected WhatsApp accounts for a workspace.
   */
  async listAccounts(workspaceId: string): Promise<WhatsAppAccountDto[]> {
    const accounts = await WhatsAppAccountRepository.findByWorkspace(workspaceId);
    return accounts.map(a => this.toDto(a));
  }

  /**
   * Get a specific account by ID.
   */
  async getAccount(workspaceId: string, accountId: string): Promise<WhatsAppAccountDto> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) {
      throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }
    return this.toDto(account);
  }

  /**
   * Synchronize account metadata, phone status, and message templates from Meta.
   */
  async syncAccount(workspaceId: string, accountId: string): Promise<SyncWhatsAppAccountResponse> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) {
      throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decryptCredential(account.accessTokenEncrypted);
    } catch {
      await WhatsAppAccountRepository.updateStatus(workspaceId, accountId, WhatsAppAccountStatus.DEGRADED);
      throw new AppError('Failed to decrypt stored credentials. Key rotation may be required.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    let phoneDetailsResult: Record<string, unknown> | undefined = undefined;
    let qualityRating = account.qualityRating;
    let displayPhoneNumber = account.displayPhoneNumber;
    let displayName = account.displayName;

    try {
      const phoneDetails = await this.adapter.fetchPhoneNumberDetails(account.phoneNumberId, accessToken);
      phoneDetailsResult = phoneDetails as unknown as Record<string, unknown>;
      if (phoneDetails.qualityRating) qualityRating = phoneDetails.qualityRating;
      if (phoneDetails.displayPhoneNumber) displayPhoneNumber = phoneDetails.displayPhoneNumber;
      if (phoneDetails.verifiedName) displayName = phoneDetails.verifiedName;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, accountId }, 'Failed to sync phone number metadata');
    }

    let templatesCount = 0;
    try {
      const templates = await this.adapter.fetchTemplates(account.wabaId, accessToken);
      templatesCount = templates.length;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, accountId }, 'Failed to sync templates');
    }

    // Update account with fresh sync timestamp & metadata
    const updated = await WhatsAppAccountRepository.updateMetadata(
      workspaceId,
      accountId,
      {
        ...account.metadata,
        lastSync: {
          timestamp: new Date(),
          phoneDetails: phoneDetailsResult,
          templatesCount,
        },
      },
      {
        displayPhoneNumber,
        displayName,
        qualityRating,
      }
    );

    if (!updated) {
      throw new AppError('Account update failed during sync.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return {
      account: this.toDto(updated),
      syncedPhoneDetails: phoneDetailsResult,
      templatesCount,
    };
  }

  /**
   * Safely disconnect a WhatsApp account.
   */
  async disconnectAccount(workspaceId: string, accountId: string): Promise<WhatsAppAccountDto> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) {
      throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    const updated = await WhatsAppAccountRepository.disconnect(workspaceId, accountId);
    if (!updated) {
      throw new AppError('Failed to disconnect account.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return this.toDto(updated);
  }

  /**
   * Permanently delete a WhatsApp account from workspace.
   */
  async deleteAccount(workspaceId: string, accountId: string): Promise<void> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) {
      throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    await WhatsAppAccountRepository.deleteAccount(workspaceId, accountId);
  }

  /**
   * Fetch WhatsApp business profile from Meta Graph API using decrypted token.
   */
  async getBusinessProfile(workspaceId: string, accountId: string): Promise<BusinessProfileDto> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) {
      throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    const accessToken = decryptCredential(account.accessTokenEncrypted);
    const profile = await this.adapter.fetchBusinessProfile(account.phoneNumberId, accessToken);
    return profile;
  }

  /**
   * Update WhatsApp business profile fields on Meta Graph API.
   */
  async updateBusinessProfile(
    workspaceId: string,
    accountId: string,
    profileData: UpdateBusinessProfileRequest
  ): Promise<{ success: boolean }> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) {
      throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    const accessToken = decryptCredential(account.accessTokenEncrypted);
    return this.adapter.updateBusinessProfile(account.phoneNumberId, accessToken, profileData);
  }

  /**
   * Evaluates comprehensive multi-dimensional connection health for a WhatsApp account.
   */
  async getAccountHealth(
    workspaceId: string,
    accountId: string
  ): Promise<WhatsAppAccountHealthDto> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) {
      throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    const issues: string[] = [];
    let tokenValid = false;
    let permissionsValid = false;
    let wabaSubscribed = false;
    let phoneRegistered = false;

    // 1. Check credential decryption
    let accessToken = '';
    try {
      accessToken = decryptCredential(account.accessTokenEncrypted);
      tokenValid = true;
    } catch {
      issues.push('Unable to decrypt stored credentials (key mismatch or tampering).');
    }

    // 2. Test live connection / token validity with Meta
    if (tokenValid && accessToken) {
      try {
        const testRes = await this.adapter.testConnection(account.phoneNumberId, accessToken);
        if (testRes.success) {
          tokenValid = true;
          permissionsValid = true;
          phoneRegistered = true;
          wabaSubscribed = true;
        } else {
          tokenValid = false;
          issues.push(testRes.error || 'Meta token validation failed or expired.');
        }
      } catch (err: unknown) {
        tokenValid = false;
        const msg = err instanceof Error ? err.message : String(err);
        issues.push(`Meta Graph API connection error: ${msg}`);
      }
    }

    // 3. Inspect recent webhook delivery
    let lastWebhookReceivedAt: string | null = null;
    try {
      const { Types } = await import('mongoose');
      const latestWebhook = await WebhookEventModel.findOne({
        workspaceId: new Types.ObjectId(workspaceId),
      }).sort({ receivedAt: -1 });

      if (latestWebhook) {
        lastWebhookReceivedAt = latestWebhook.receivedAt.toISOString();
      }
    } catch {
      // Non-fatal
    }

    // 4. Determine overall account status based on health
    let overallStatus = account.status;
    if (!tokenValid) {
      overallStatus = WhatsAppAccountStatus.DEGRADED;
    }

    return {
      accountId,
      phoneNumberId: account.phoneNumberId,
      wabaId: account.wabaId,
      status: overallStatus,
      tokenValid,
      permissionsValid,
      wabaSubscribed,
      phoneRegistered,
      lastWebhookReceivedAt,
      lastCheckedAt: new Date().toISOString(),
      issues,
    };
  }

  private toDto(account: IWhatsAppAccount): WhatsAppAccountDto {
    const doc = account.toJSON() as { id?: string; workspaceId?: string };
    return {
      id: doc.id || account._id.toString(),
      workspaceId: doc.workspaceId || account.workspaceId.toString(),
      wabaId: account.wabaId,
      phoneNumberId: account.phoneNumberId,
      displayName: account.displayName,
      displayPhoneNumber: account.displayPhoneNumber,
      qualityRating: account.qualityRating,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt ? account.lastSyncedAt.toISOString() : null,
      createdAt: account.createdAt ? account.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: account.updatedAt ? account.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const whatsAppService = new WhatsAppService();
