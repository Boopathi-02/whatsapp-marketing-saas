import { z } from 'zod';
import { MessageStatus } from '@whatsapp-saas/domain';

export const SendMessageSchema = z.object({
  phoneNumberId: z.string().trim().min(1, 'Phone number ID is required'),
  recipientPhoneNumber: z.string().trim().min(8, 'Recipient phone number is required'),
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'template']).default('text'),
  text: z.string().trim().max(4096).optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().trim().max(1024).optional(),
  filename: z.string().trim().max(255).optional(),
  templateName: z.string().trim().optional(),
  templateLanguage: z.string().trim().default('en_US').optional(),
});

export type SendMessageRequest = z.infer<typeof SendMessageSchema>;

export const MessageDtoSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  workspaceId: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  type: z.string(),
  content: z.string().optional(),
  mediaUrl: z.string().optional(),
  status: z.enum([
    MessageStatus.ACCEPTED,
    MessageStatus.QUEUED,
    MessageStatus.SENT,
    MessageStatus.DELIVERED,
    MessageStatus.READ,
    MessageStatus.FAILED,
  ]),
  metaMessageId: z.string().optional(),
  timestamp: z.string(),
  createdAt: z.string(),
});

export type MessageDto = z.infer<typeof MessageDtoSchema>;

export const ConversationDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  contactId: z.string(),
  phoneNumber: z.string(),
  contactName: z.string().optional(),
  lastMessage: z.string().optional(),
  lastMessageTimestamp: z.string().nullable().optional(),
  unreadCount: z.number().int().min(0),
  status: z.enum(['open', 'closed', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConversationDto = z.infer<typeof ConversationDtoSchema>;

export const ListConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
});

export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>;
