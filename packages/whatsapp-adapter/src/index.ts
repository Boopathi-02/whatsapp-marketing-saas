import { z } from 'zod';
import { TemplateCategory } from '@whatsapp-saas/domain';

/**
 * Meta WhatsApp Cloud API Webhook Event Schemas
 * Used for receiving delivery receipts, status updates, and inbound messages.
 */
export const MetaWebhookStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  timestamp: z.string(),
  recipient_id: z.string(),
  conversation: z
    .object({
      id: z.string(),
      expiration_timestamp: z.string().optional(),
      origin: z.object({ type: z.string() }).optional(),
    })
    .optional(),
  pricing: z
    .object({
      billable: z.boolean(),
      pricing_model: z.string(),
      category: z.string(),
    })
    .optional(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string(),
        message: z.string().optional(),
        error_data: z.object({ details: z.string() }).optional(),
      })
    )
    .optional(),
});
export type MetaWebhookStatus = z.infer<typeof MetaWebhookStatusSchema>;

export interface SendTemplateMessageParams {
  phoneNumberId: string;
  accessToken: string;
  recipientPhoneNumber: string;
  templateName: string;
  languageCode: string;
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
      text?: string;
    }>;
  }>;
}

export interface SendMessageResult {
  messagingProduct: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status?: string }>;
}

export interface SyncTemplatesResult {
  id: string;
  name: string;
  status: string;
  category: TemplateCategory;
  language: string;
}

/**
 * WhatsApp Adapter Interface Contract
 * Concrete implementations (Meta Cloud API, sandbox test double) must implement this contract.
 * Concrete Meta integration is scheduled for Phase 3.
 */
export interface WhatsAppAdapter {
  sendTemplateMessage(params: SendTemplateMessageParams): Promise<SendMessageResult>;
  fetchTemplates(wabaId: string, accessToken: string): Promise<SyncTemplatesResult[]>;
  verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean;
}
