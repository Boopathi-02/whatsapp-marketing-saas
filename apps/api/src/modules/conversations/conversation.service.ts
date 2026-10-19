import {
  ConversationRepository,
  WhatsAppAccountRepository,
  IConversation,
  IMessage,
} from '@whatsapp-saas/database';
import {
  SendMessageRequest,
  ConversationDto,
  MessageDto,
  ListConversationsQuery,
} from '@whatsapp-saas/contracts';
import {
  MetaWhatsAppCloudAdapter,
  WhatsAppAdapter,
  MockWhatsAppAdapter,
} from '@whatsapp-saas/whatsapp-adapter';
import { MessageStatus, WhatsAppAccountStatus } from '@whatsapp-saas/domain';
import { env } from '../../config/env.js';
import { decryptCredential } from '../../utils/crypto.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';

export class ConversationService {
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
   * List conversations for a workspace with pagination and search.
   */
  async listConversations(
    workspaceId: string,
    query: ListConversationsQuery
  ): Promise<{ items: ConversationDto[]; total: number; page: number; limit: number }> {
    const { conversations, total } = await ConversationRepository.listByWorkspace(
      workspaceId,
      query
    );

    return {
      items: conversations.map((c) => this.toConversationDto(c)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get single conversation details.
   */
  async getConversation(
    workspaceId: string,
    conversationId: string
  ): Promise<ConversationDto> {
    const conv = await ConversationRepository.findById(workspaceId, conversationId);
    if (!conv) {
      throw new AppError('Conversation not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }
    return this.toConversationDto(conv);
  }

  /**
   * List messages in a conversation.
   */
  async listMessages(
    workspaceId: string,
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<{ items: MessageDto[]; total: number; page: number; limit: number }> {
    const conv = await ConversationRepository.findById(workspaceId, conversationId);
    if (!conv) {
      throw new AppError('Conversation not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }

    const { messages, total } = await ConversationRepository.listMessages(
      workspaceId,
      conversationId,
      { page, limit }
    );

    return {
      items: messages.map((m) => this.toMessageDto(m)),
      total,
      page,
      limit,
    };
  }

  /**
   * Send an outbound message to a contact in an existing conversation thread.
   */
  async sendMessage(
    workspaceId: string,
    conversationId: string,
    req: SendMessageRequest
  ): Promise<MessageDto> {
    const conv = await ConversationRepository.findById(workspaceId, conversationId);
    if (!conv) {
      throw new AppError('Conversation not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }

    // Locate WhatsApp account
    const accounts = await WhatsAppAccountRepository.findByWorkspace(workspaceId);
    let account = accounts.find((a) => a.phoneNumberId === req.phoneNumberId);
    if (!account) {
      account = accounts.find((a) => a.status === WhatsAppAccountStatus.CONNECTED);
    }

    if (!account) {
      throw new AppError('No connected WhatsApp Account found to send message.', 400, ErrorCode.BAD_REQUEST);
    }

    let accessToken: string;
    try {
      accessToken = decryptCredential(account.accessTokenEncrypted);
    } catch {
      throw new AppError('Failed to decrypt credentials for WhatsApp Account.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    let metaMsgId: string | undefined = undefined;

    if (req.type === 'text') {
      if (!req.text) {
        throw new AppError('Message text is required for text message.', 400, ErrorCode.BAD_REQUEST);
      }
      const res = await this.adapter.sendTextMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken,
        recipientPhoneNumber: conv.phoneNumber,
        text: req.text,
      });
      metaMsgId = res.messages?.[0]?.id;
    } else if (['image', 'video', 'audio', 'document'].includes(req.type)) {
      if (!req.mediaUrl) {
        throw new AppError('Media URL is required for media message.', 400, ErrorCode.BAD_REQUEST);
      }
      const res = await this.adapter.sendMediaMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken,
        recipientPhoneNumber: conv.phoneNumber,
        type: req.type as 'image' | 'video' | 'audio' | 'document',
        mediaUrl: req.mediaUrl,
        caption: req.caption,
        filename: req.filename,
      });
      metaMsgId = res.messages?.[0]?.id;
    } else if (req.type === 'template') {
      if (!req.templateName) {
        throw new AppError('Template name is required for template message.', 400, ErrorCode.BAD_REQUEST);
      }
      const res = await this.adapter.sendTemplateMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken,
        recipientPhoneNumber: conv.phoneNumber,
        templateName: req.templateName,
        languageCode: req.templateLanguage || 'en_US',
      });
      metaMsgId = res.messages?.[0]?.id;
    }

    // Record outbound message in DB
    const saved = await ConversationRepository.addMessage({
      workspaceId,
      conversationId,
      contactId: conv.contactId.toString(),
      direction: 'outbound',
      type: req.type,
      content: req.text || req.caption || `[${req.type.toUpperCase()}]`,
      mediaUrl: req.mediaUrl,
      status: MessageStatus.SENT,
      metaMessageId: metaMsgId,
    });

    return this.toMessageDto(saved);
  }

  /**
   * Mark a conversation's messages as read.
   */
  async markAsRead(workspaceId: string, conversationId: string): Promise<void> {
    const conv = await ConversationRepository.findById(workspaceId, conversationId);
    if (!conv) {
      throw new AppError('Conversation not found in workspace.', 404, ErrorCode.NOT_FOUND);
    }
    await ConversationRepository.markAsRead(workspaceId, conversationId);
  }

  private toConversationDto(c: IConversation): ConversationDto {
    const doc = c.toJSON() as { id?: string; workspaceId?: string; contactId?: string };
    return {
      id: doc.id || c._id.toString(),
      workspaceId: doc.workspaceId || c.workspaceId.toString(),
      contactId: doc.contactId || c.contactId.toString(),
      phoneNumber: c.phoneNumber,
      contactName: c.contactName,
      lastMessage: c.lastMessage,
      lastMessageTimestamp: c.lastMessageTimestamp ? c.lastMessageTimestamp.toISOString() : null,
      unreadCount: c.unreadCount || 0,
      status: c.status,
      createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? c.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private toMessageDto(m: IMessage): MessageDto {
    const doc = m.toJSON() as {
      id?: string;
      workspaceId?: string;
      conversationId?: string;
    };
    return {
      id: doc.id || m._id.toString(),
      conversationId: doc.conversationId || m.conversationId.toString(),
      workspaceId: doc.workspaceId || m.workspaceId.toString(),
      direction: m.direction,
      type: m.type,
      content: m.content,
      mediaUrl: m.mediaUrl,
      status: m.status,
      metaMessageId: m.metaMessageId,
      timestamp: m.timestamp ? m.timestamp.toISOString() : new Date().toISOString(),
      createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const conversationService = new ConversationService();
