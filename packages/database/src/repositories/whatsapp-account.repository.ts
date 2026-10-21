import { Types } from 'mongoose';
import { WhatsAppAccountModel, IWhatsAppAccount } from '../models/whatsapp_account.model.js';
import { QualityRating, WhatsAppAccountStatus } from '@whatsapp-saas/domain';

export interface UpsertWhatsAppAccountData {
  workspaceId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  displayName: string;
  accessTokenEncrypted: string;
  qualityRating?: QualityRating;
  status?: WhatsAppAccountStatus;
  metadata?: Record<string, unknown>;
}

export class WhatsAppAccountRepository {
  /**
   * Connect or update a WhatsApp Business Account registration for a workspace.
   */
  static async upsertAccount(data: UpsertWhatsAppAccountData): Promise<IWhatsAppAccount> {
    const workspaceObjectId = new Types.ObjectId(data.workspaceId);

    const updated = await WhatsAppAccountModel.findOneAndUpdate(
      {
        workspaceId: workspaceObjectId,
        phoneNumberId: data.phoneNumberId.trim(),
      },
      {
        $set: {
          wabaId: data.wabaId.trim(),
          displayPhoneNumber: data.displayPhoneNumber.trim(),
          displayName: data.displayName.trim(),
          accessTokenEncrypted: data.accessTokenEncrypted,
          qualityRating: data.qualityRating || QualityRating.UNKNOWN,
          status: data.status || WhatsAppAccountStatus.CONNECTED,
          metadata: data.metadata || {},
          lastSyncedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return updated;
  }

  /**
   * List all WhatsApp accounts belonging to the workspace.
   */
  static async findByWorkspace(workspaceId: string): Promise<IWhatsAppAccount[]> {
    return WhatsAppAccountModel.find({
      workspaceId: new Types.ObjectId(workspaceId),
    }).sort({ createdAt: -1 });
  }

  /**
   * Find a specific WhatsApp account scoped to the workspace.
   */
  static async findById(workspaceId: string, accountId: string): Promise<IWhatsAppAccount | null> {
    if (!Types.ObjectId.isValid(accountId)) return null;

    return WhatsAppAccountModel.findOne({
      _id: new Types.ObjectId(accountId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  /**
   * Find an account by phone number ID across the platform (used for webhook dispatching).
   */
  static async findByPhoneNumberId(phoneNumberId: string): Promise<IWhatsAppAccount | null> {
    return WhatsAppAccountModel.findOne({
      phoneNumberId: phoneNumberId.trim(),
      status: WhatsAppAccountStatus.CONNECTED,
    });
  }

  /**
   * Find accounts by WABA ID.
   */
  static async findByWabaId(wabaId: string): Promise<IWhatsAppAccount[]> {
    return WhatsAppAccountModel.find({
      wabaId: wabaId.trim(),
    });
  }

  /**
   * Update connection status and quality rating.
   */
  static async updateStatus(
    workspaceId: string,
    accountId: string,
    status: WhatsAppAccountStatus,
    qualityRating?: QualityRating
  ): Promise<IWhatsAppAccount | null> {
    if (!Types.ObjectId.isValid(accountId)) return null;

    const updateFields: Record<string, unknown> = { status };
    if (qualityRating) {
      updateFields.qualityRating = qualityRating;
    }

    return WhatsAppAccountModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(accountId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      { $set: updateFields },
      { new: true }
    );
  }

  /**
   * Update synchronized metadata from Meta Graph API.
   */
  static async updateMetadata(
    workspaceId: string,
    accountId: string,
    metadata: Record<string, unknown>,
    additionalFields?: {
      displayPhoneNumber?: string;
      displayName?: string;
      qualityRating?: QualityRating;
    }
  ): Promise<IWhatsAppAccount | null> {
    if (!Types.ObjectId.isValid(accountId)) return null;

    const setFields: Record<string, unknown> = {
      metadata,
      lastSyncedAt: new Date(),
    };

    if (additionalFields?.displayPhoneNumber) {
      setFields.displayPhoneNumber = additionalFields.displayPhoneNumber;
    }
    if (additionalFields?.displayName) {
      setFields.displayName = additionalFields.displayName;
    }
    if (additionalFields?.qualityRating) {
      setFields.qualityRating = additionalFields.qualityRating;
    }

    return WhatsAppAccountModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(accountId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      { $set: setFields },
      { new: true }
    );
  }

  /**
   * Resolves the account that owns a webhook's phone_number_id. Disconnected accounts are
   * ignored; if several non-disconnected rows exist (should not happen) CONNECTED wins.
   */
  static async resolveForWebhook(phoneNumberId: string): Promise<IWhatsAppAccount | null> {
    const rows = await WhatsAppAccountModel.find({
      phoneNumberId: phoneNumberId.trim(),
      status: { $ne: WhatsAppAccountStatus.DISCONNECTED },
    });
    return rows.find(r => r.status === WhatsAppAccountStatus.CONNECTED) ?? rows[0] ?? null;
  }

  /** Accounts of a WABA whose display number (digits only) matches; used by account-level events. */
  static async findByWabaAndDisplayDigits(wabaId: string, digits: string): Promise<IWhatsAppAccount[]> {
    const rows = await WhatsAppAccountModel.find({ wabaId: wabaId.trim() });
    return rows.filter(r => r.displayPhoneNumber.replace(/\D/g, '') === digits);
  }

  /**
   * Internal (webhook-driven) field update. Callers pass fixed, code-owned keys such as
   * 'metadata.messagingLimit'; never user-supplied paths.
   */
  static async patchFields(accountId: string, fields: Record<string, unknown>): Promise<void> {
    if (!Types.ObjectId.isValid(accountId)) return;
    await WhatsAppAccountModel.updateOne({ _id: new Types.ObjectId(accountId) }, { $set: fields });
  }

  /**
   * Safely disconnect an account.
   */
  static async disconnect(workspaceId: string, accountId: string): Promise<IWhatsAppAccount | null> {
    if (!Types.ObjectId.isValid(accountId)) return null;

    return WhatsAppAccountModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(accountId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      {
        $set: {
          status: WhatsAppAccountStatus.DISCONNECTED,
        },
      },
      { new: true }
    );
  }

  /**
   * Permanently delete an account from workspace.
   */
  static async deleteAccount(workspaceId: string, accountId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(accountId)) return false;

    const res = await WhatsAppAccountModel.deleteOne({
      _id: new Types.ObjectId(accountId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
    return res.deletedCount > 0;
  }
}
