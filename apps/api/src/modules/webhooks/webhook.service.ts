import crypto from 'node:crypto';
import {
  WebhookEventRepository,
  WhatsAppAccountRepository,
  ConversationRepository,
  CampaignRepository,
  ContactRepository,
  IWebhookEvent,
  IWhatsAppAccount,
} from '@whatsapp-saas/database';
import {
  MetaWhatsAppCloudAdapter,
  WhatsAppAdapter,
  MockWhatsAppAdapter,
} from '@whatsapp-saas/whatsapp-adapter';
import { MessageStatus, ContactOptInStatus, WhatsAppAccountStatus } from '@whatsapp-saas/domain';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';
import { logger } from '../../utils/logger.js';
import {
  parseInboundMessage,
  describeStatusError,
  MetaInboundMessage,
  MetaStatusError,
} from './inbound-message.js';

export interface WebhookIngestionResult {
  persisted: boolean;
  isDuplicate: boolean;
  event: IWebhookEvent;
}

interface MetaChange {
  field?: string;
  value?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
interface MetaEntry {
  id?: string;
  changes?: MetaChange[];
}

const digits = (v: unknown): string => String(v ?? '').replace(/\D/g, '');

/** Stable identifiers of every deliverable item in a payload (messages and statuses). */
function collectItemIds(entries: MetaEntry[]): string[] {
  const ids: string[] = [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const val = change.value;
      if (!val) continue;
      for (const m of Array.isArray(val.messages) ? val.messages : []) if (m?.id) ids.push(String(m.id));
      for (const s of Array.isArray(val.statuses) ? val.statuses : []) {
        if (s?.id) ids.push(`${s.id}_${s.status ?? 'status'}${s.timestamp ? `_${s.timestamp}` : ''}`);
      }
    }
  }
  return ids;
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
    if (!rawBody) {
      throw new AppError('Missing raw request body for signature verification', 400, ErrorCode.BAD_REQUEST);
    }
    if (!signatureHeader) {
      throw new AppError('Missing X-Hub-Signature-256 header', 401, ErrorCode.UNAUTHORIZED);
    }

    const isValidSignature = this.adapter.verifyWebhookSignature(rawBody, signatureHeader, env.META_APP_SECRET);
    if (!isValidSignature) {
      logger.warn('Rejected webhook request with invalid signature');
      throw new AppError('Invalid webhook cryptographic signature', 401, ErrorCode.UNAUTHORIZED);
    }

    const entries = (Array.isArray(payload.entry) ? payload.entry : []) as MetaEntry[];

    // Event type is the first change's field; message/status payloads are normalised.
    let eventType = 'unknown';
    const firstChange = entries[0]?.changes?.[0];
    if (firstChange) {
      eventType = firstChange.field || 'messages';
      if (Array.isArray(firstChange.value?.messages) && firstChange.value.messages.length > 0) eventType = 'messages';
      else if (Array.isArray(firstChange.value?.statuses) && firstChange.value.statuses.length > 0) eventType = 'statuses';
    }

    // Dedup key. One item keeps its natural id; a batch hashes ALL item ids so a payload
    // whose first message was already seen cannot hide new messages behind it.
    const itemIds = collectItemIds(entries);
    let providerEventId: string;
    if (itemIds.length === 1) {
      providerEventId = itemIds[0]!;
    } else if (itemIds.length > 1) {
      providerEventId = `batch_${crypto.createHash('sha256').update([...itemIds].sort().join('|')).digest('hex').substring(0, 32)}`;
    } else {
      const rawString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      providerEventId = `evt_${crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 32)}`;
    }

    // The stored workspace is set only when every change in the payload belongs to one tenant.
    const owners = new Set<string>();
    let unresolved = false;
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const account = await this.resolveAccount(entry.id, change.value);
        if (account) owners.add(account.workspaceId.toString());
        else unresolved = true;
      }
    }
    const resolvedWorkspaceId = !unresolved && owners.size === 1 ? [...owners][0]! : null;

    const { event, isDuplicate } = await WebhookEventRepository.recordEvent(
      providerEventId,
      eventType,
      payload,
      resolvedWorkspaceId
    );

    if (!isDuplicate) {
      void this.processWebhookEvent(payload, event._id.toString()).catch(err => {
        logger.error({ err: String(err) }, 'Failed to process webhook event asynchronously');
      });
    }

    return { persisted: true, isDuplicate, event };
  }

  /**
   * Which of our accounts does this change belong to? The identifiers come from a payload
   * that passed signature verification, but are still only used to *look up* our own
   * records - never to select or create tenant data directly.
   */
  private async resolveAccount(wabaId: string | undefined, value: Record<string, any> | undefined): Promise<IWhatsAppAccount | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const phoneNumberId = value?.metadata?.phone_number_id;
    if (typeof phoneNumberId === 'string' && phoneNumberId) {
      return WhatsAppAccountRepository.resolveForWebhook(phoneNumberId);
    }
    if (wabaId) {
      const display = digits(value?.display_phone_number ?? value?.phone_number);
      if (display) {
        const matches = (await WhatsAppAccountRepository.findByWabaAndDisplayDigits(wabaId, display)).filter(
          a => a.status !== WhatsAppAccountStatus.DISCONNECTED
        );
        if (matches.length === 1) return matches[0]!;
      }
      const accounts = (await WhatsAppAccountRepository.findByWabaId(wabaId)).filter(
        a => a.status !== WhatsAppAccountStatus.DISCONNECTED
      );
      // Only unambiguous when every account of the WABA belongs to the same workspace.
      if (accounts.length > 0 && new Set(accounts.map(a => a.workspaceId.toString())).size === 1) return accounts[0]!;
    }
    return null;
  }

  /**
   * Processes every change in a payload. Each change is isolated so one bad item cannot
   * block the rest; the stored event is marked processed or failed accordingly.
   */
  async processWebhookEvent(payload: Record<string, unknown>, eventId?: string): Promise<void> {
    const entries = (Array.isArray(payload.entry) ? payload.entry : []) as MetaEntry[];
    const errors: string[] = [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        try {
          const account = await this.resolveAccount(entry.id, change.value);
          await this.handleChange(entry.id, change, account);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ err: message, field: change.field }, 'Webhook change processing failed');
          errors.push(`${change.field ?? 'unknown'}: ${message}`);
        }
      }
    }

    if (eventId) {
      if (errors.length > 0) await WebhookEventRepository.markFailed(eventId, errors.join('; ').slice(0, 1000));
      else await WebhookEventRepository.markProcessed(eventId);
    }
    if (errors.length > 0) throw new Error(errors.join('; '));
  }

  private async handleChange(
    wabaId: string | undefined,
    change: MetaChange,
    account: IWhatsAppAccount | null
  ): Promise<void> {
    const val = change.value;
    if (!val) return;

    switch (change.field) {
      case 'messages':
        await this.handleMessages(val, account);
        return;
      case 'phone_number_name_update':
        await this.handleNameUpdate(val, account);
        return;
      case 'phone_number_quality_update':
        await this.handleQualityUpdate(val, account);
        return;
      case 'account_update':
        await this.handleAccountUpdate(wabaId, val, account);
        return;
      default:
        logger.debug({ field: change.field }, 'Ignoring unhandled webhook field');
    }
  }

  // --- account-level events ---------------------------------------------------

  /** Display-name review result. Only an APPROVED decision changes what we show. */
  private async handleNameUpdate(val: Record<string, any>, account: IWhatsAppAccount | null): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!account) return;
    const fields: Record<string, unknown> = { 'metadata.nameStatus': val.decision };
    if (val.decision === 'APPROVED' && typeof val.requested_verified_name === 'string' && val.requested_verified_name) {
      fields.displayName = val.requested_verified_name;
    }
    if (val.rejection_reason) fields['metadata.nameRejectionReason'] = val.rejection_reason;
    await WhatsAppAccountRepository.patchFields(account._id.toString(), fields);
  }

  /** Messaging-limit tier changes (upgrade / downgrade / onboarding). */
  private async handleQualityUpdate(val: Record<string, any>, account: IWhatsAppAccount | null): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!account) return;
    const fields: Record<string, unknown> = {
      'metadata.lastQualityEvent': { event: val.event, at: new Date().toISOString() },
    };
    if (typeof val.current_limit === 'string') fields['metadata.messagingLimit'] = val.current_limit;
    await WhatsAppAccountRepository.patchFields(account._id.toString(), fields);
  }

  private async handleAccountUpdate(
    wabaId: string | undefined,
    val: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    account: IWhatsAppAccount | null
  ): Promise<void> {
    const event = String(val.event ?? '');
    switch (event) {
      case 'VERIFIED_ACCOUNT':
        if (account) await WhatsAppAccountRepository.patchFields(account._id.toString(), { 'metadata.businessVerification': 'VERIFIED' });
        return;
      case 'PARTNER_APP_INSTALLED':
        // The customer authorised our app. The account itself is created by our own
        // Embedded Signup completion (which holds the token); nothing is created from a webhook.
        logger.info({ wabaId: val.waba_info?.waba_id ?? wabaId }, 'Partner app installed on WABA');
        return;
      case 'PARTNER_REMOVED':
      case 'ACCOUNT_DELETED': {
        // Our access is gone: mark every affected account of this WABA disconnected.
        if (!wabaId) return;
        for (const a of await WhatsAppAccountRepository.findByWabaId(wabaId)) {
          if (a.status !== WhatsAppAccountStatus.DISCONNECTED) {
            await WhatsAppAccountRepository.patchFields(a._id.toString(), {
              status: WhatsAppAccountStatus.DISCONNECTED,
              'metadata.disconnectedBy': event,
            });
          }
        }
        return;
      }
      default:
        if (account && event) {
          await WhatsAppAccountRepository.patchFields(account._id.toString(), {
            'metadata.lastAccountEvent': { event, at: new Date().toISOString() },
          });
        }
    }
  }

  // --- messages and statuses ----------------------------------------------------

  private async handleMessages(val: Record<string, any>, account: IWhatsAppAccount | null): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const workspaceId = account ? account.workspaceId.toString() : null;

    // 1. Delivery / read / failure statuses (forward-only, scoped to the owning workspace)
    for (const statusObj of Array.isArray(val.statuses) ? val.statuses : []) {
      const metaMessageId: string | undefined = statusObj?.id;
      const status = statusObj?.status as MessageStatus | undefined;
      if (!metaMessageId || !status) continue;

      const error = status === MessageStatus.FAILED ? describeStatusError(statusObj.errors as MetaStatusError[]) : null;
      const updated = await ConversationRepository.updateMessageStatus(metaMessageId, status, error, workspaceId);
      const campaignUpdate = await CampaignRepository.updateRecipientByMetaMessageId(
        metaMessageId,
        status,
        error?.message,
        workspaceId
      );
      if (campaignUpdate) {
        if (status === MessageStatus.DELIVERED) await CampaignRepository.incrementStats(campaignUpdate.campaignId, 'deliveredCount');
        else if (status === MessageStatus.READ) await CampaignRepository.incrementStats(campaignUpdate.campaignId, 'readCount');
        else if (status === MessageStatus.FAILED) await CampaignRepository.incrementStats(campaignUpdate.campaignId, 'failedCount');
      }
      if (!updated && !campaignUpdate) {
        logger.debug({ metaMessageId, status }, 'Status update ignored (unknown message or not a forward transition)');
      }
    }

    // 2. Inbound customer messages
    const inbound = Array.isArray(val.messages) ? (val.messages as MetaInboundMessage[]) : [];
    if (inbound.length === 0) return;
    if (!workspaceId) {
      logger.warn({ phoneNumberId: val.metadata?.phone_number_id }, 'Inbound message for unknown or disconnected account ignored');
      return;
    }

    const contacts = Array.isArray(val.contacts) ? (val.contacts as Array<{ wa_id: string; profile?: { name?: string } }>) : [];
    for (const msg of inbound) {
      if (!msg?.id || !msg.from) continue;

      // Idempotent against redelivery of an already-stored message
      if (await ConversationRepository.findMessageByMetaId(workspaceId, msg.id)) continue;

      const parsed = parseInboundMessage(msg);
      if (parsed.reaction) {
        await ConversationRepository.setReaction(
          workspaceId,
          parsed.reaction.targetMetaMessageId,
          msg.from,
          parsed.reaction.emoji
        );
        continue;
      }

      // Store phones as E.164 so inbound traffic matches contacts created elsewhere.
      const senderPhone = `+${digits(msg.from)}`;
      const contactName = contacts.find(c => digits(c.wa_id) === digits(msg.from))?.profile?.name;

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

      const conversation = await ConversationRepository.findOrCreateConversation(
        workspaceId,
        contact._id.toString(),
        senderPhone,
        contactName
      );

      await ConversationRepository.addMessage({
        workspaceId,
        conversationId: conversation._id.toString(),
        contactId: contact._id.toString(),
        direction: 'inbound',
        type: parsed.type,
        content: parsed.content,
        metaMessageId: msg.id,
        timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date(),
        metadata: parsed.metadata,
      });
    }
  }
}

export const webhookService = new WebhookService();
