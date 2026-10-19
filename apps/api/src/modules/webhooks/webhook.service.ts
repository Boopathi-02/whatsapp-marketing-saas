import crypto from 'node:crypto';
import {
  WebhookEventRepository,
  WhatsAppAccountRepository,
  ConversationRepository,
  CampaignRepository,
  ContactRepository,
  IWebhookEvent,
} from '@whatsapp-saas/database';
import {
  MetaWhatsAppCloudAdapter,
  WhatsAppAdapter,
  MockWhatsAppAdapter,
} from '@whatsapp-saas/whatsapp-adapter';
import { MessageStatus, ContactOptInStatus } from '@whatsapp-saas/domain';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';
import { logger } from '../../utils/logger.js';

export interface WebhookIngestionResult {
  persisted: boolean;
  isDuplicate: boolean;
  event: IWebhookEvent;
}

export class WebhookService {
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
   * Verifies the Meta Webhook setup challenge handshake (GET request).
   */
  verifyHandshake(mode?: string, token?: string, challenge?: string): string {
    if (!mode || !token || !challenge) {
      throw new AppError('Missing required webhook verification query parameters', 400, ErrorCode.BAD_REQUEST);
    }
    if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }

    throw new AppError('Invalid webhook verification token', 403, ErrorCode.FORBIDDEN);
  }

  /**
   * Validates webhook signature and durably ingests the payload.
   */
  async ingestWebhook(
    rawBody: Buffer | string | undefined,
    signatureHeader: string | undefined,
    payload: Record<string, unknown>
  ): Promise<WebhookIngestionResult> {
    // 1. Validate payload and signature header
    if (!rawBody) {
      throw new AppError('Missing raw request body for signature verification', 400, ErrorCode.BAD_REQUEST);
    }

    if (!signatureHeader) {
      throw new AppError('Missing X-Hub-Signature-256 header', 401, ErrorCode.UNAUTHORIZED);
    }

    // 2. Cryptographic signature check
    const isValidSignature = this.adapter.verifyWebhookSignature(
      rawBody,
      signatureHeader,
      env.META_APP_SECRET
    );

    if (!isValidSignature) {
      logger.warn({ signatureHeader }, 'Rejected webhook request with invalid signature');
      throw new AppError('Invalid webhook cryptographic signature', 401, ErrorCode.UNAUTHORIZED);
    }

    // 3. Extract Meta event identifiers and resolve workspace ownership
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    let phoneNumberId: string | undefined;
    let wabaId: string | undefined;
    let providerEventId: string | undefined;
    let eventType = 'unknown';

    if (entries.length > 0) {
      const firstEntry = entries[0];
      wabaId = firstEntry.id;

      if (Array.isArray(firstEntry.changes) && firstEntry.changes.length > 0) {
        const change = firstEntry.changes[0];
        eventType = change.field || 'messages';
        const val = change.value;

        if (val) {
          phoneNumberId = val.metadata?.phone_number_id;

          // Stable ID extraction from message or status
          if (Array.isArray(val.messages) && val.messages.length > 0) {
            providerEventId = val.messages[0].id;
            eventType = 'messages';
          } else if (Array.isArray(val.statuses) && val.statuses.length > 0) {
            const statusObj = val.statuses[0];
            const statusName = statusObj.status || 'status';
            const timestamp = statusObj.timestamp ? `_${statusObj.timestamp}` : '';
            providerEventId = statusObj.id ? `${statusObj.id}_${statusName}${timestamp}` : undefined;
            eventType = 'statuses';
          }
        }
      }
    }

    // Fallback stable event identifier if neither message nor status ID was present
    if (!providerEventId) {
      const rawString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      providerEventId = `evt_${crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 32)}`;
    }

    // 4. Resolve workspace ID strictly from verified provider records
    let resolvedWorkspaceId: string | null = null;
    if (phoneNumberId) {
      const account = await WhatsAppAccountRepository.findByPhoneNumberId(phoneNumberId);
      if (account) {
        resolvedWorkspaceId = account.workspaceId.toString();
      }
    }

    if (!resolvedWorkspaceId && wabaId) {
      const accounts = await WhatsAppAccountRepository.findByWabaId(wabaId);
      if (accounts.length > 0) {
        resolvedWorkspaceId = accounts[0].workspaceId.toString();
      }
    }

    // 5. Durably record event before returning acknowledgment (prevents data loss)
    const { event, isDuplicate } = await WebhookEventRepository.recordEvent(
      providerEventId,
      eventType,
      payload,
      resolvedWorkspaceId
    );

    // 6. Process message delivery status or inbound message if not duplicate
    if (!isDuplicate) {
      void this.processWebhookEvent(payload, resolvedWorkspaceId).catch((err) => {
        logger.error({ err: String(err) }, 'Failed to process webhook event asynchronously');
      });
    }

    return {
      persisted: true,
      isDuplicate,
      event,
    };
  }

  /**
   * Processes webhook events (status updates and inbound customer messages).
   */
  async processWebhookEvent(
    payload: Record<string, unknown>,
    workspaceId: string | null
  ): Promise<void> {
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const val = change.value as {
          statuses?: Array<{ id: string; status: string; timestamp?: string }>;
          messages?: Array<{
            id: string;
            from: string;
            type: string;
            text?: { body?: string };
            timestamp?: string;
            [key: string]: unknown;
          }>;
          contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
        };
        if (!val) continue;

        // 1. Process delivery / read / failure statuses
        if (Array.isArray(val.statuses)) {
          for (const statusObj of val.statuses) {
            const metaMessageId = statusObj.id;
            const status = statusObj.status as MessageStatus;
            if (metaMessageId && status) {
              await ConversationRepository.updateMessageStatus(metaMessageId, status);
              const campaignUpdate = await CampaignRepository.updateRecipientByMetaMessageId(
                metaMessageId,
                status
              );
              if (campaignUpdate) {
                if (status === MessageStatus.DELIVERED) {
                  await CampaignRepository.incrementStats(campaignUpdate.campaignId, 'deliveredCount');
                } else if (status === MessageStatus.READ) {
                  await CampaignRepository.incrementStats(campaignUpdate.campaignId, 'readCount');
                } else if (status === MessageStatus.FAILED) {
                  await CampaignRepository.incrementStats(campaignUpdate.campaignId, 'failedCount');
                }
              }
            }
          }
        }

        // 2. Process inbound messages
        if (workspaceId && Array.isArray(val.messages)) {
          const contacts = Array.isArray(val.contacts) ? val.contacts : [];
          for (const msg of val.messages) {
            const senderPhone = msg.from;
            const contactMeta = contacts.find((c) => c.wa_id === senderPhone);
            const contactName = contactMeta?.profile?.name;

            // Find or create contact
            let contact = await ContactRepository.findByPhone(workspaceId, senderPhone);
            if (!contact) {
              contact = await ContactRepository.createContact({
                workspaceId,
                phoneNumber: senderPhone,
                displayName: contactName,
                source: 'webhook',
                consentStatus: ContactOptInStatus.OPTED_IN,
              });
            }

            // Find or create conversation
            const conversation = await ConversationRepository.findOrCreateConversation(
              workspaceId,
              contact._id.toString(),
              senderPhone,
              contactName
            );

            // Extract message body / media
            let content = '';
            let mediaUrl: string | undefined = undefined;
            const msgType = msg.type || 'text';

            if (msg.text?.body) {
              content = msg.text.body;
            } else if (msg[msgType] && typeof msg[msgType] === 'object') {
              const mediaObj = msg[msgType] as { caption?: string; link?: string };
              content = mediaObj.caption || `[${msgType.toUpperCase()}]`;
              mediaUrl = mediaObj.link;
            } else {
              content = `[${msgType.toUpperCase()}]`;
            }

            await ConversationRepository.addMessage({
              workspaceId,
              conversationId: conversation._id.toString(),
              contactId: contact._id.toString(),
              direction: 'inbound',
              type: msgType,
              content,
              mediaUrl,
              metaMessageId: msg.id,
              timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date(),
            });
          }
        }
      }
    }
  }
}

export const webhookService = new WebhookService();
