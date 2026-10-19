import { Types } from 'mongoose';
import { CampaignModel, ICampaign } from '../models/campaign.model.js';
import {
  CampaignRecipientModel,
  ICampaignRecipient,
} from '../models/campaign_recipient.model.js';
import { CampaignStatus, MessageStatus } from '@whatsapp-saas/domain';

export interface CreateCampaignData {
  workspaceId: string;
  name: string;
  templateId: string;
  whatsAppAccountId: string;
  tagFilter?: string[];
  scheduledAt?: Date;
  status?: CampaignStatus;
}

export interface ListCampaignsOptions {
  page: number;
  limit: number;
  status?: CampaignStatus;
  search?: string;
}

export class CampaignRepository {
  static async create(data: CreateCampaignData): Promise<ICampaign> {
    return CampaignModel.create({
      workspaceId: new Types.ObjectId(data.workspaceId),
      name: data.name.trim(),
      templateId: new Types.ObjectId(data.templateId),
      whatsAppAccountId: new Types.ObjectId(data.whatsAppAccountId),
      tagFilter: data.tagFilter || [],
      scheduledAt: data.scheduledAt,
      status: data.status || CampaignStatus.DRAFT,
    });
  }

  static async findById(
    workspaceId: string,
    campaignId: string
  ): Promise<ICampaign | null> {
    return CampaignModel.findOne({
      _id: new Types.ObjectId(campaignId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  static async listByWorkspace(
    workspaceId: string,
    options: ListCampaignsOptions
  ): Promise<{ campaigns: ICampaign[]; total: number }> {
    const filter: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
    };

    if (options.status) {
      filter.status = options.status;
    }
    if (options.search) {
      filter.name = { $regex: options.search.trim(), $options: 'i' };
    }

    const skip = (options.page - 1) * options.limit;

    const [campaigns, total] = await Promise.all([
      CampaignModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit),
      CampaignModel.countDocuments(filter),
    ]);

    return { campaigns, total };
  }

  static async updateStatus(
    workspaceId: string,
    campaignId: string,
    status: CampaignStatus,
    completedAt?: Date
  ): Promise<ICampaign | null> {
    const update: Record<string, unknown> = { status };
    if (completedAt) {
      update.completedAt = completedAt;
    }

    return CampaignModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(campaignId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      { $set: update },
      { new: true }
    );
  }

  static async incrementStats(
    campaignId: string,
    field: 'sentCount' | 'deliveredCount' | 'readCount' | 'failedCount'
  ): Promise<void> {
    await CampaignModel.updateOne(
      { _id: new Types.ObjectId(campaignId) },
      { $inc: { [field]: 1 } }
    );
  }

  static async setRecipientCount(campaignId: string, count: number): Promise<void> {
    await CampaignModel.updateOne(
      { _id: new Types.ObjectId(campaignId) },
      { $set: { recipientCount: count } }
    );
  }

  static async createRecipients(
    recipients: Array<{
      campaignId: string;
      workspaceId: string;
      contactId: string;
      phoneNumber: string;
      status?: MessageStatus;
    }>
  ): Promise<void> {
    if (recipients.length === 0) return;

    const docs = recipients.map(r => ({
      campaignId: new Types.ObjectId(r.campaignId),
      workspaceId: new Types.ObjectId(r.workspaceId),
      contactId: new Types.ObjectId(r.contactId),
      phoneNumber: r.phoneNumber,
      status: r.status || MessageStatus.QUEUED,
    }));

    // ordered: false skips duplicate errors if any
    await CampaignRecipientModel.insertMany(docs, { ordered: false }).catch(() => {
      // Ignore bulk write duplicate errors to guarantee idempotency
    });
  }

  static async getPendingRecipients(
    campaignId: string,
    limit = 100
  ): Promise<ICampaignRecipient[]> {
    return CampaignRecipientModel.find({
      campaignId: new Types.ObjectId(campaignId),
      status: MessageStatus.QUEUED,
    }).limit(limit);
  }

  static async updateRecipientStatus(
    campaignId: string,
    phoneNumber: string,
    status: MessageStatus,
    metaMessageId?: string,
    errorMessage?: string
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (metaMessageId) update.metaMessageId = metaMessageId;
    if (errorMessage) update.errorMessage = errorMessage;
    if (status === MessageStatus.SENT) update.sentAt = new Date();
    if (status === MessageStatus.DELIVERED) update.deliveredAt = new Date();
    if (status === MessageStatus.READ) update.readAt = new Date();

    await CampaignRecipientModel.updateOne(
      {
        campaignId: new Types.ObjectId(campaignId),
        phoneNumber,
      },
      { $set: update }
    );
  }

  static async updateRecipientByMetaMessageId(
    metaMessageId: string,
    status: MessageStatus
  ): Promise<{ campaignId: string; status: MessageStatus } | null> {
    const recipient = await CampaignRecipientModel.findOne({ metaMessageId });
    if (!recipient) return null;

    const update: Record<string, unknown> = { status };
    if (status === MessageStatus.DELIVERED) update.deliveredAt = new Date();
    if (status === MessageStatus.READ) update.readAt = new Date();

    recipient.status = status;
    await recipient.save();

    return {
      campaignId: recipient.campaignId.toString(),
      status,
    };
  }
}
