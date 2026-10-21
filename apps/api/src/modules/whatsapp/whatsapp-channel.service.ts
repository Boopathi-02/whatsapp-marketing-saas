import crypto from 'node:crypto';
import {
  WhatsAppAccountRepository,
  WhatsAppAccountModel,
  AuditRepository,
  ContactRepository,
  IWhatsAppAccount,
  Types,
} from '@whatsapp-saas/database';
import {
  MetaWhatsAppCloudAdapter,
  WhatsAppAdapter,
  MockWhatsAppAdapter,
  WabaPhoneNumber,
} from '@whatsapp-saas/whatsapp-adapter';
import {
  ErrorCode,
  WhatsAppAccountDto,
  UpdateBusinessProfileRequest,
  WabaPhoneNumberDto,
  ListBlockedUsersQuery,
  BlockedUsersPageDto,
  BlockUsersResultDto,
} from '@whatsapp-saas/contracts';
import { QualityRating, WhatsAppAccountStatus } from '@whatsapp-saas/domain';
import { env } from '../../config/env.js';
import { encryptCredential, decryptCredential } from '../../utils/crypto.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;

/** Verifies the decoded bytes really are the declared image type (never trust the client mime). */
function matchesImageSignature(buf: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mimeType === 'image/png') {
    return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return false;
}

function toDigits(waIdOrPhone: string): string {
  return waIdOrPhone.replace(/\D/g, '');
}

export class WhatsAppChannelService {
  private adapter: WhatsAppAdapter;

  constructor(customAdapter?: WhatsAppAdapter) {
    this.adapter =
      customAdapter ??
      (env.NODE_ENV === 'test'
        ? new MockWhatsAppAdapter()
        : new MetaWhatsAppCloudAdapter({ graphApiVersion: env.META_GRAPH_API_VERSION }));
  }

  // --- helpers ---------------------------------------------------------------

  private async loadAccount(workspaceId: string, accountId: string, requireConnected = true): Promise<IWhatsAppAccount> {
    const account = await WhatsAppAccountRepository.findById(workspaceId, accountId);
    if (!account) throw new AppError('WhatsApp account not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    if (requireConnected && account.status === WhatsAppAccountStatus.DISCONNECTED) {
      throw new AppError('This WhatsApp account is disconnected. Reconnect it first.', 409, ErrorCode.CONFLICT);
    }
    return account;
  }

  private token(account: IWhatsAppAccount): string {
    try {
      return decryptCredential(account.accessTokenEncrypted);
    } catch {
      throw new AppError(
        'Stored WhatsApp credentials could not be decrypted. Reconnect the account.',
        500,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /** Wraps provider failures so Meta error text reaches the user without a 500. */
  private async meta<T>(action: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, action }, 'Meta API call failed');
      throw new AppError(message, 502, ErrorCode.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Registers a phone number with a per-account random 2-step-verification PIN (stored
   * encrypted) rather than a shared default. Returns metadata to persist when it succeeded.
   */
  private async registerWithPin(
    phoneNumberId: string,
    accessToken: string,
    existingPinEncrypted?: unknown
  ): Promise<{ registered: boolean; registrationPinEncrypted?: string; error?: string }> {
    let pin: string | undefined;
    if (typeof existingPinEncrypted === 'string') {
      try {
        pin = decryptCredential(existingPinEncrypted);
      } catch {
        pin = undefined;
      }
    }
    const usedExisting = Boolean(pin);
    pin ??= String(crypto.randomInt(100000, 1000000));
    try {
      await this.adapter.registerPhoneNumber(phoneNumberId, accessToken, pin);
      return { registered: true, registrationPinEncrypted: usedExisting ? (existingPinEncrypted as string) : encryptCredential(pin) };
    } catch (err) {
      return { registered: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private toDto(account: IWhatsAppAccount): WhatsAppAccountDto {
    const doc = account.toJSON() as unknown as WhatsAppAccountDto;
    return { ...doc, id: String(doc.id ?? account._id), workspaceId: account.workspaceId.toString() };
  }

  // --- phone numbers under a WABA ------------------------------------------

  async listWabaPhoneNumbers(workspaceId: string, accountId: string): Promise<WabaPhoneNumberDto[]> {
    const account = await this.loadAccount(workspaceId, accountId);
    const phones = await this.meta('list_phone_numbers', () =>
      this.adapter.listPhoneNumbers(account.wabaId, this.token(account))
    );

    const ids = phones.map(p => p.id);
    const [mine, others] = await Promise.all([
      WhatsAppAccountModel.find({
        workspaceId: new Types.ObjectId(workspaceId),
        phoneNumberId: { $in: ids },
        status: WhatsAppAccountStatus.CONNECTED,
      }).select('phoneNumberId'),
      WhatsAppAccountModel.find({
        workspaceId: { $ne: new Types.ObjectId(workspaceId) },
        phoneNumberId: { $in: ids },
        status: WhatsAppAccountStatus.CONNECTED,
      }).select('phoneNumberId'),
    ]);
    const mineIds = new Set(mine.map(a => a.phoneNumberId));
    const otherIds = new Set(others.map(a => a.phoneNumberId));

    return phones.map(p => ({
      id: p.id,
      displayPhoneNumber: p.displayPhoneNumber ?? null,
      verifiedName: p.verifiedName ?? null,
      qualityRating: p.qualityRating,
      nameStatus: p.nameStatus ?? null,
      codeVerificationStatus: p.codeVerificationStatus ?? null,
      platformType: p.platformType ?? null,
      connected: mineIds.has(p.id),
      unavailable: otherIds.has(p.id),
    }));
  }

  /** Connects another phone number of the same WABA, reusing the verified credential. */
  async addPhoneNumber(
    workspaceId: string,
    accountId: string,
    phoneNumberId: string,
    actorUserId: string
  ): Promise<WhatsAppAccountDto> {
    const base = await this.loadAccount(workspaceId, accountId);
    const accessToken = this.token(base);

    // The phone must be listed under the WABA the verified token controls.
    const phones = await this.meta('list_phone_numbers', () => this.adapter.listPhoneNumbers(base.wabaId, accessToken));
    const phone: WabaPhoneNumber | undefined = phones.find(p => p.id === phoneNumberId);
    if (!phone) {
      throw new AppError('That phone number does not belong to this WhatsApp Business Account.', 404, ErrorCode.NOT_FOUND);
    }

    const conflict = await WhatsAppAccountModel.exists({
      phoneNumberId,
      status: WhatsAppAccountStatus.CONNECTED,
      workspaceId: { $ne: new Types.ObjectId(workspaceId) },
    });
    if (conflict) {
      throw new AppError('This WhatsApp Phone Number ID is already connected to another workspace.', 409, ErrorCode.CONFLICT);
    }
    const already = await WhatsAppAccountModel.exists({
      phoneNumberId,
      workspaceId: new Types.ObjectId(workspaceId),
      status: WhatsAppAccountStatus.CONNECTED,
    });
    if (already) {
      throw new AppError('This phone number is already connected in your workspace.', 409, ErrorCode.CONFLICT);
    }

    const reg = await this.registerWithPin(phoneNumberId, accessToken);
    if (!reg.registered) logger.warn({ phoneNumberId, err: reg.error }, 'Phone registration did not complete');

    const account = await WhatsAppAccountRepository.upsertAccount({
      workspaceId,
      wabaId: base.wabaId,
      phoneNumberId,
      displayPhoneNumber: phone.displayPhoneNumber || 'Unknown Number',
      displayName: phone.verifiedName || base.displayName,
      qualityRating: phone.qualityRating || QualityRating.UNKNOWN,
      status: WhatsAppAccountStatus.CONNECTED,
      accessTokenEncrypted: base.accessTokenEncrypted,
      metadata: {
        signupMethod: 'additional_phone_number',
        sourceAccountId: base._id.toString(),
        nameStatus: phone.nameStatus,
        platformType: phone.platformType,
        throughputLevel: phone.throughputLevel,
        registered: reg.registered,
        ...(reg.registrationPinEncrypted ? { registrationPinEncrypted: reg.registrationPinEncrypted } : {}),
      },
    });

    await AuditRepository.record({
      workspaceId,
      actorUserId,
      action: 'whatsapp.phone_number_added',
      targetType: 'whatsapp_account',
      targetId: account._id.toString(),
      metadata: { phoneNumberId, wabaId: base.wabaId },
    });
    return this.toDto(account);
  }

  /** Re-registers a phone and restores CONNECTED, if the stored token is still valid. */
  async reconnectAccount(workspaceId: string, accountId: string, actorUserId: string): Promise<WhatsAppAccountDto> {
    const account = await this.loadAccount(workspaceId, accountId, false);
    const accessToken = this.token(account);

    const test = await this.meta('test_connection', () => this.adapter.testConnection(account.phoneNumberId, accessToken));
    if (!test.success) {
      throw new AppError(
        test.error || 'The stored Meta token is no longer valid. Run WhatsApp sign-in again to reconnect.',
        409,
        ErrorCode.CONFLICT
      );
    }

    const conflict = await WhatsAppAccountModel.exists({
      phoneNumberId: account.phoneNumberId,
      status: WhatsAppAccountStatus.CONNECTED,
      workspaceId: { $ne: account.workspaceId },
    });
    if (conflict) {
      throw new AppError('This WhatsApp Phone Number ID is already connected to another workspace.', 409, ErrorCode.CONFLICT);
    }

    const meta = (account.metadata ?? {}) as Record<string, unknown>;
    const reg = await this.registerWithPin(account.phoneNumberId, accessToken, meta.registrationPinEncrypted);
    try {
      await this.adapter.subscribeWabaWebhooks(account.wabaId, accessToken);
    } catch (err) {
      logger.warn({ err: String(err), wabaId: account.wabaId }, 'Webhook re-subscription failed during reconnect');
    }
    const details = await this.meta('fetch_phone', () => this.adapter.fetchPhoneNumberDetails(account.phoneNumberId, accessToken));

    const updated = await WhatsAppAccountRepository.updateMetadata(
      workspaceId,
      accountId,
      {
        ...meta,
        registered: reg.registered,
        ...(reg.registrationPinEncrypted ? { registrationPinEncrypted: reg.registrationPinEncrypted } : {}),
        reconnectedAt: new Date().toISOString(),
      },
      {
        displayPhoneNumber: details.displayPhoneNumber,
        displayName: details.verifiedName,
        qualityRating: details.qualityRating,
      }
    );
    const connected = await WhatsAppAccountRepository.updateStatus(workspaceId, accountId, WhatsAppAccountStatus.CONNECTED);

    await AuditRepository.record({
      workspaceId,
      actorUserId,
      action: 'whatsapp.account_reconnected',
      targetType: 'whatsapp_account',
      targetId: accountId,
      metadata: { registered: reg.registered },
    });
    return this.toDto(connected ?? updated ?? account);
  }

  // --- business profile ------------------------------------------------------

  async updateBusinessProfile(
    workspaceId: string,
    accountId: string,
    data: UpdateBusinessProfileRequest,
    actorUserId?: string
  ): Promise<{ success: boolean; profilePictureUpdated: boolean }> {
    const account = await this.loadAccount(workspaceId, accountId);
    const accessToken = this.token(account);
    const { profilePicture, ...fields } = data;

    let profilePictureHandle: string | undefined;
    if (profilePicture) {
      const bytes = Buffer.from(profilePicture.data, 'base64');
      if (bytes.length === 0 || bytes.length > MAX_PROFILE_PICTURE_BYTES) {
        throw new AppError('Profile picture must be between 1 byte and 5 MB.', 422, ErrorCode.VALIDATION_ERROR);
      }
      if (!matchesImageSignature(bytes, profilePicture.mimeType)) {
        throw new AppError('The uploaded file is not a valid JPEG or PNG image.', 422, ErrorCode.VALIDATION_ERROR);
      }
      const ext = profilePicture.mimeType === 'image/png' ? 'png' : 'jpg';
      const upload = await this.meta('upload_profile_picture', () =>
        this.adapter.uploadProfilePicture(env.META_APP_ID, accessToken, {
          data: bytes,
          mimeType: profilePicture.mimeType,
          fileName: `profile-${account.phoneNumberId}.${ext}`,
        })
      );
      profilePictureHandle = upload.handle;
    }

    const result = await this.meta('update_business_profile', () =>
      this.adapter.updateBusinessProfile(account.phoneNumberId, accessToken, {
        ...fields,
        ...(profilePictureHandle ? { profilePictureHandle } : {}),
      })
    );

    await AuditRepository.record({
      workspaceId,
      actorUserId,
      action: 'whatsapp.profile_updated',
      targetType: 'whatsapp_account',
      targetId: accountId,
      metadata: { fields: Object.keys(fields), profilePictureUpdated: Boolean(profilePictureHandle) },
    });
    return { success: result.success, profilePictureUpdated: Boolean(profilePictureHandle) };
  }

  // --- blocked users ---------------------------------------------------------

  async listBlockedUsers(
    workspaceId: string,
    accountId: string,
    query: ListBlockedUsersQuery
  ): Promise<BlockedUsersPageDto> {
    const account = await this.loadAccount(workspaceId, accountId);
    const page = await this.meta('list_blocked_users', () =>
      this.adapter.listBlockedUsers(account.phoneNumberId, this.token(account), query)
    );
    const items = await Promise.all(
      page.items.map(async u => {
        const contact = await ContactRepository.findByPhone(workspaceId, `+${toDigits(u.waId)}`);
        return { waId: u.waId, name: contact?.displayName ?? null };
      })
    );
    return { items, after: page.after ?? null, before: page.before ?? null };
  }

  async blockUsers(workspaceId: string, accountId: string, users: string[], actorUserId: string): Promise<BlockUsersResultDto> {
    return this.mutateBlocked('block', workspaceId, accountId, users, actorUserId);
  }

  async unblockUsers(workspaceId: string, accountId: string, users: string[], actorUserId: string): Promise<BlockUsersResultDto> {
    return this.mutateBlocked('unblock', workspaceId, accountId, users, actorUserId);
  }

  private async mutateBlocked(
    kind: 'block' | 'unblock',
    workspaceId: string,
    accountId: string,
    users: string[],
    actorUserId: string
  ): Promise<BlockUsersResultDto> {
    const account = await this.loadAccount(workspaceId, accountId);
    const normalized = [...new Set(users.map(toDigits))];
    const result = await this.meta(`${kind}_users`, () =>
      kind === 'block'
        ? this.adapter.blockUsers(account.phoneNumberId, this.token(account), normalized)
        : this.adapter.unblockUsers(account.phoneNumberId, this.token(account), normalized)
    );
    await AuditRepository.record({
      workspaceId,
      actorUserId,
      action: kind === 'block' ? 'whatsapp.users_blocked' : 'whatsapp.users_unblocked',
      targetType: 'whatsapp_account',
      targetId: accountId,
      metadata: { requested: normalized.length, changed: result.added.length, failed: result.failed.length },
    });
    return { changed: result.added.map(u => u.waId), failed: result.failed };
  }
}

export const whatsAppChannelService = new WhatsAppChannelService();
