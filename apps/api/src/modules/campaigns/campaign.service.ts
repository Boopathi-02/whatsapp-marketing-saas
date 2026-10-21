import {
  CampaignRepository,
  TemplateRepository,
  WhatsAppAccountRepository,
  ContactModel,
  ICampaign,
  Types,
} from '@whatsapp-saas/database';
import {
  CreateCampaignRequest,
  CampaignDto,
  ListCampaignsQuery,
} from '@whatsapp-saas/contracts';
import {
  MetaWhatsAppCloudAdapter,
  WhatsAppAdapter,
  MockWhatsAppAdapter,
} from '@whatsapp-saas/whatsapp-adapter';
import {
  CampaignStatus,
  MessageStatus,
  TemplateStatus,
  WhatsAppAccountStatus,
  ContactOptInStatus,
} from '@whatsapp-saas/domain';
import { env } from '../../config/env.js';
import { decryptCredential } from '../../utils/crypto.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';
import { logger } from '../../utils/logger.js';
import { BillingService } from '../billing/billing.service.js';

export class CampaignService {
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
   * Creates a broadcast campaign, selects eligible recipients (respecting consent/suppression),
   * and queues recipient jobs.
   */
  async createCampaign(
    workspaceId: string,
    req: CreateCampaignRequest
  ): Promise<CampaignDto> {
    // 0. Subscription / trial gate (server-side; the UI is only a convenience)
    await BillingService.assertDispatchAllowed(workspaceId);

    // 1. Verify template exists and is approved
    const template = await TemplateRepository.findById(workspaceId, req.templateId);
    if (!template) {
      throw new AppError('Selected template not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }
    if (template.status !== TemplateStatus.APPROVED) {
      throw new AppError(
        `Cannot launch campaign with template status "${template.status}". Only APPROVED templates may be used.`,
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // 2. Verify WhatsApp account exists and is connected
    const account = await WhatsAppAccountRepository.findById(workspaceId, req.whatsAppAccountId);
    if (!account) {
      throw new AppError('Selected WhatsApp Account not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }
    if (account.status !== WhatsAppAccountStatus.CONNECTED) {
      throw new AppError(
        'Selected WhatsApp Account is not currently connected.',
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    // 3. Query eligible contacts: strictly consentStatus === 'opted_in' and isSuppressed !== true
    const contactFilter: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
      consentStatus: ContactOptInStatus.OPTED_IN,
      isSuppressed: { $ne: true },
    };

    if (req.tagFilter && req.tagFilter.length > 0) {
      contactFilter.tags = { $in: req.tagFilter };
    }

    const contacts = await ContactModel.find(contactFilter);

    // 4. Determine initial status
    let initialStatus: CampaignStatus = CampaignStatus.DRAFT;
    const scheduledAt = req.scheduledAt ? new Date(req.scheduledAt) : undefined;
    if (scheduledAt && scheduledAt.getTime() > Date.now()) {
      initialStatus = CampaignStatus.SCHEDULED;
    }

    // 5. Create campaign record
    const campaign = await CampaignRepository.create({
      workspaceId,
      name: req.name,
      templateId: req.templateId,
      whatsAppAccountId: req.whatsAppAccountId,
      tagFilter: req.tagFilter,
      scheduledAt,
      status: initialStatus,
    });

    const campaignId = campaign._id.toString();

    // 6. Bulk create recipient records
    if (contacts.length > 0) {
      const recipientDocs = contacts.map((c) => ({
        campaignId,
        workspaceId,
        contactId: c._id.toString(),
        phoneNumber: c.phoneNumber,
        status: MessageStatus.QUEUED,
      }));

      await CampaignRepository.createRecipients(recipientDocs);
      await CampaignRepository.setRecipientCount(campaignId, contacts.length);
      campaign.recipientCount = contacts.length;
    }

    // 7. If not scheduled in the future, dispatch immediately
    if (initialStatus !== CampaignStatus.SCHEDULED && contacts.length > 0) {
      // Dispatch in background or synchronously
      void this.dispatchCampaign(workspaceId, campaignId).catch((err) => {
        logger.error({ err: String(err), campaignId }, 'Background dispatch error');
      });
    }

    return this.toDto(campaign);
  }

  /**
   * Dispatches messages to all queued recipients of a campaign.
   * Performs real-time consent checks before sending each message.
   */
  async dispatchCampaign(workspaceId: string, campaignId: string): Promise<CampaignDto> {
    const campaign = await CampaignRepository.findById(workspaceId, campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }

    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new AppError(
        `Cannot dispatch campaign in "${campaign.status}" state.`,
        400,
        ErrorCode.BAD_REQUEST
      );
    }

    await BillingService.assertDispatchAllowed(workspaceId);

    // 1. Mark campaign as running
    await CampaignRepository.updateStatus(workspaceId, campaignId, CampaignStatus.RUNNING);

    // 2. Load account credentials and template
    const account = await WhatsAppAccountRepository.findById(
      workspaceId,
      campaign.whatsAppAccountId.toString()
    );
    if (!account) {
      await CampaignRepository.updateStatus(workspaceId, campaignId, CampaignStatus.FAILED);
      throw new AppError('WhatsApp account missing for dispatch.', 400, ErrorCode.BAD_REQUEST);
    }

    const template = await TemplateRepository.findById(
      workspaceId,
      campaign.templateId.toString()
    );
    if (!template) {
      await CampaignRepository.updateStatus(workspaceId, campaignId, CampaignStatus.FAILED);
      throw new AppError('Message template missing for dispatch.', 400, ErrorCode.BAD_REQUEST);
    }

    let accessToken: string;
    try {
      accessToken = decryptCredential(account.accessTokenEncrypted);
    } catch {
      await CampaignRepository.updateStatus(workspaceId, campaignId, CampaignStatus.FAILED);
      throw new AppError('Failed to decrypt WhatsApp account credentials.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    // 3. Process pending recipients
    const pendingRecipients = await CampaignRepository.getPendingRecipients(campaignId, 1000);

    for (const recipient of pendingRecipients) {
      // Re-check entitlement before every message: trial expiry or suspension mid-campaign
      // stops dispatch immediately and leaves remaining recipients queued/resumable.
      const access = await BillingService.checkDispatchAccess(workspaceId);
      if (!access.allowed) {
        logger.warn({ campaignId, reason: access.reason }, 'Dispatch halted by subscription policy');
        const paused = await CampaignRepository.updateStatus(workspaceId, campaignId, CampaignStatus.PAUSED);
        return this.toDto(paused!);
      }

      // Immediate consent check before sending: verify contact is still opted-in and not suppressed
      const contact = await ContactModel.findOne({
        _id: recipient.contactId,
        workspaceId: new Types.ObjectId(workspaceId),
      });

      if (!contact || contact.consentStatus !== ContactOptInStatus.OPTED_IN || contact.isSuppressed) {
        // Suppress message
        await CampaignRepository.updateRecipientStatus(
          campaignId,
          recipient.phoneNumber,
          MessageStatus.FAILED,
          undefined,
          'Consent revoked or contact suppressed prior to transmission.'
        );
        await CampaignRepository.incrementStats(campaignId, 'failedCount');
        continue;
      }

      // Send template message via adapter
      try {
        const sendResult = await this.adapter.sendTemplateMessage({
          phoneNumberId: account.phoneNumberId,
          accessToken,
          recipientPhoneNumber: recipient.phoneNumber,
          templateName: template.name,
          languageCode: template.language,
        });

        const metaMsgId = sendResult.messages?.[0]?.id || `wamid_${Date.now()}`;

        await CampaignRepository.updateRecipientStatus(
          campaignId,
          recipient.phoneNumber,
          MessageStatus.SENT,
          metaMsgId
        );
        await CampaignRepository.incrementStats(campaignId, 'sentCount');
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn({ err: errMsg, recipient: recipient.phoneNumber }, 'Recipient send failed');

        await CampaignRepository.updateRecipientStatus(
          campaignId,
          recipient.phoneNumber,
          MessageStatus.FAILED,
          undefined,
          errMsg
        );
        await CampaignRepository.incrementStats(campaignId, 'failedCount');
      }
    }

    // 4. Mark campaign completed
    const updated = await CampaignRepository.updateStatus(
      workspaceId,
      campaignId,
      CampaignStatus.COMPLETED,
      new Date()
    );

    return this.toDto(updated!);
  }

  /**
   * List campaigns for a workspace with pagination and filters.
   */
  async listCampaigns(
    workspaceId: string,
    query: ListCampaignsQuery
  ): Promise<{ items: CampaignDto[]; total: number; page: number; limit: number }> {
    const { campaigns, total } = await CampaignRepository.listByWorkspace(
      workspaceId,
      query
    );

    return {
      items: campaigns.map((c) => this.toDto(c)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get single campaign by ID with tenant isolation.
   */
  async getCampaign(workspaceId: string, campaignId: string): Promise<CampaignDto> {
    const campaign = await CampaignRepository.findById(workspaceId, campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }
    return this.toDto(campaign);
  }

  /**
   * Cancel a scheduled or draft campaign.
   */
  async cancelCampaign(workspaceId: string, campaignId: string): Promise<CampaignDto> {
    const campaign = await CampaignRepository.findById(workspaceId, campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new AppError('Completed campaigns cannot be cancelled.', 400, ErrorCode.BAD_REQUEST);
    }

    const updated = await CampaignRepository.updateStatus(
      workspaceId,
      campaignId,
      CampaignStatus.CANCELLED
    );

    return this.toDto(updated!);
  }

  private toDto(c: ICampaign): CampaignDto {
    const doc = c.toJSON() as {
      id?: string;
      workspaceId?: string;
      templateId?: string;
      whatsAppAccountId?: string;
    };

    return {
      id: doc.id || c._id.toString(),
      workspaceId: doc.workspaceId || c.workspaceId.toString(),
      name: c.name,
      templateId: doc.templateId || c.templateId.toString(),
      whatsAppAccountId: doc.whatsAppAccountId || c.whatsAppAccountId.toString(),
      status: c.status,
      recipientCount: c.recipientCount || 0,
      sentCount: c.sentCount || 0,
      deliveredCount: c.deliveredCount || 0,
      readCount: c.readCount || 0,
      failedCount: c.failedCount || 0,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
      completedAt: c.completedAt ? c.completedAt.toISOString() : null,
      createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? c.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const campaignService = new CampaignService();
