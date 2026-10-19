import crypto from 'node:crypto';
import { z } from 'zod';
import { TemplateCategory, QualityRating } from '@whatsapp-saas/domain';

/**
 * Meta WhatsApp Cloud API Webhook Event Schemas
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

export interface PhoneNumberDetailsResult {
  id: string;
  verifiedName?: string;
  displayPhoneNumber?: string;
  qualityRating?: QualityRating;
  codeVerificationStatus?: string;
}

export interface WabaDetailsResult {
  id: string;
  name?: string;
  currency?: string;
  timezoneId?: string;
  messageTemplateNamespace?: string;
}

export interface ExchangeTokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
}

export interface DebugTokenResult {
  isValid: boolean;
  appId?: string;
  type?: string;
  application?: string;
  expiresAt?: number;
  scopes?: string[];
  granularScopes?: Array<{ scope: string; targetIds?: string[] }>;
  error?: string;
}

export interface SubscribeWebhooksResult {
  success: boolean;
}

export interface RegisterPhoneNumberResult {
  success: boolean;
}

export interface CreateTemplateParams {
  name: string;
  category: TemplateCategory;
  language: string;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: string;
    text?: string;
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

export interface CreateTemplateResult {
  id: string;
  status: string;
  category: string;
}

export interface SendTextMessageParams {
  phoneNumberId: string;
  accessToken: string;
  recipientPhoneNumber: string;
  text: string;
  previewUrl?: boolean;
}

export interface SendMediaMessageParams {
  phoneNumberId: string;
  accessToken: string;
  recipientPhoneNumber: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
}

export interface BusinessProfileResult {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profilePictureUrl?: string;
  websites?: string[];
  vertical?: string;
}

export interface UpdateBusinessProfileParams {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
}

/**
 * WhatsApp Adapter Interface Contract
 */
export interface WhatsAppAdapter {
  verifyWebhookSignature(payload: string | Buffer, signature: string, appSecret: string): boolean;
  fetchPhoneNumberDetails(phoneNumberId: string, accessToken: string): Promise<PhoneNumberDetailsResult>;
  fetchWabaDetails(wabaId: string, accessToken: string): Promise<WabaDetailsResult>;
  fetchTemplates(wabaId: string, accessToken: string): Promise<SyncTemplatesResult[]>;
  createTemplate(wabaId: string, accessToken: string, params: CreateTemplateParams): Promise<CreateTemplateResult>;
  deleteTemplate(wabaId: string, accessToken: string, templateName: string): Promise<{ success: boolean }>;
  testConnection(phoneNumberId: string, accessToken: string): Promise<{ success: boolean; error?: string }>;
  sendTemplateMessage(params: SendTemplateMessageParams): Promise<SendMessageResult>;
  sendTextMessage(params: SendTextMessageParams): Promise<SendMessageResult>;
  sendMediaMessage(params: SendMediaMessageParams): Promise<SendMessageResult>;
  fetchBusinessProfile(phoneNumberId: string, accessToken: string): Promise<BusinessProfileResult>;
  updateBusinessProfile(phoneNumberId: string, accessToken: string, profile: UpdateBusinessProfileParams): Promise<{ success: boolean }>;
  exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri?: string): Promise<ExchangeTokenResult>;
  debugToken(inputToken: string, appAccessToken: string): Promise<DebugTokenResult>;
  subscribeWabaWebhooks(wabaId: string, accessToken: string): Promise<SubscribeWebhooksResult>;
  registerPhoneNumber(phoneNumberId: string, accessToken: string, pin?: string): Promise<RegisterPhoneNumberResult>;
}

/**
 * Official Meta WhatsApp Business Platform Cloud API Adapter
 */
export class MetaWhatsAppCloudAdapter implements WhatsAppAdapter {
  private graphApiVersion: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: { graphApiVersion?: string; timeoutMs?: number } = {}) {
    this.graphApiVersion = options.graphApiVersion || 'v26.0';
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  /**
   * Verifies the incoming webhook payload using X-Hub-Signature-256 header.
   * Compares HMAC-SHA256 signature in constant time.
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string, appSecret: string): boolean {
    if (!signature || !appSecret) return false;

    // Header format: 'sha256=<hex_hash>'
    const parts = signature.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') {
      return false;
    }
    const signatureHash = parts[1];

    const hmac = crypto.createHmac('sha256', appSecret);
    if (Buffer.isBuffer(payload)) {
      hmac.update(payload);
    } else {
      hmac.update(payload, 'utf8');
    }
    const expectedHash = hmac.digest('hex');

    try {
      const sigBuffer = Buffer.from(signatureHash, 'hex');
      const expectedBuffer = Buffer.from(expectedHash, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Fetches phone number metadata, display name, and quality rating from Meta Graph API.
   */
  async fetchPhoneNumberDetails(
    phoneNumberId: string,
    accessToken: string
  ): Promise<PhoneNumberDetailsResult> {
    const url = `${this.baseUrl}/${phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Meta API error (${res.status})`;
      throw new Error(`Failed to fetch phone number metadata: ${message}`);
    }

    const data = (await res.json()) as {
      id: string;
      verified_name?: string;
      display_phone_number?: string;
      quality_rating?: string;
      code_verification_status?: string;
    };
    let qualityRating: QualityRating = QualityRating.UNKNOWN;
    if (data.quality_rating) {
      const qrUpper = String(data.quality_rating).toUpperCase();
      if (qrUpper === 'GREEN') qualityRating = QualityRating.GREEN;
      else if (qrUpper === 'YELLOW') qualityRating = QualityRating.YELLOW;
      else if (qrUpper === 'RED') qualityRating = QualityRating.RED;
    }

    return {
      id: data.id,
      verifiedName: data.verified_name,
      displayPhoneNumber: data.display_phone_number,
      qualityRating,
      codeVerificationStatus: data.code_verification_status,
    };
  }

  /**
   * Fetches WhatsApp Business Account details from Meta Graph API.
   */
  async fetchWabaDetails(wabaId: string, accessToken: string): Promise<WabaDetailsResult> {
    const url = `${this.baseUrl}/${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Meta API error (${res.status})`;
      throw new Error(`Failed to fetch WABA metadata: ${message}`);
    }

    const data = (await res.json()) as {
      id: string;
      name?: string;
      currency?: string;
      timezone_id?: string;
      message_template_namespace?: string;
    };
    return {
      id: data.id,
      name: data.name,
      currency: data.currency,
      timezoneId: data.timezone_id,
      messageTemplateNamespace: data.message_template_namespace,
    };
  }

  /**
   * Tests connectivity and credential validity for a phone number ID.
   */
  async testConnection(
    phoneNumberId: string,
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fetchPhoneNumberDetails(phoneNumberId, accessToken);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * Fetches approved message templates for the WABA.
   */
  async fetchTemplates(wabaId: string, accessToken: string): Promise<SyncTemplatesResult[]> {
    const url = `${this.baseUrl}/${wabaId}/message_templates?fields=id,name,status,category,language&limit=100`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Meta API error (${res.status})`;
      throw new Error(`Failed to fetch message templates: ${message}`);
    }

    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        name: string;
        status: string;
        category?: string;
        language?: string;
      }>;
    };
    const items = Array.isArray(data.data) ? data.data : [];

    return items.map((t) => {
      let category: TemplateCategory = TemplateCategory.MARKETING;
      if (t.category === 'UTILITY') category = TemplateCategory.UTILITY;
      else if (t.category === 'AUTHENTICATION') category = TemplateCategory.AUTHENTICATION;

      return {
        id: t.id,
        name: t.name,
        status: t.status,
        category,
        language: t.language || 'en_US',
      };
    });
  }

  /**
   * Creates a message template on Meta WhatsApp Business Platform.
   */
  async createTemplate(
    wabaId: string,
    accessToken: string,
    params: CreateTemplateParams
  ): Promise<CreateTemplateResult> {
    const url = `${this.baseUrl}/${wabaId}/message_templates`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        category: params.category,
        language: params.language,
        components: params.components,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Template creation error (${res.status})`;
      throw new Error(`Failed to create message template: ${message}`);
    }

    const data = (await res.json()) as { id: string; status?: string; category?: string };
    return {
      id: data.id,
      status: data.status || 'PENDING',
      category: data.category || params.category,
    };
  }

  /**
   * Deletes a message template from Meta WhatsApp Business Platform.
   */
  async deleteTemplate(
    wabaId: string,
    accessToken: string,
    templateName: string
  ): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Template deletion error (${res.status})`;
      throw new Error(`Failed to delete message template: ${message}`);
    }

    const data = (await res.json()) as { success?: boolean };
    return { success: data.success !== false };
  }

  /**
   * Sends a template message (Phase 4 engine foundation).
   */
  async sendTemplateMessage(params: SendTemplateMessageParams): Promise<SendMessageResult> {
    const url = `${this.baseUrl}/${params.phoneNumberId}/messages`;

    const templatePayload: Record<string, unknown> = {
      name: params.templateName,
      language: { code: params.languageCode },
    };

    if (params.components && params.components.length > 0) {
      templatePayload.components = params.components;
    }

    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: params.recipientPhoneNumber,
      type: 'template',
      template: templatePayload,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Meta dispatch error (${res.status})`;
      throw new Error(`Failed to send WhatsApp message: ${message}`);
    }

    const data = (await res.json()) as {
      contacts?: Array<{ input: string; wa_id: string }>;
      messages?: Array<{ id: string }>;
    };
    return {
      messagingProduct: 'whatsapp',
      contacts: data.contacts || [{ input: params.recipientPhoneNumber, wa_id: params.recipientPhoneNumber }],
      messages: data.messages || [{ id: 'mock-meta-id' }],
    };
  }

  /**
   * Sends a freeform text message (session message within 24h window).
   */
  async sendTextMessage(params: SendTextMessageParams): Promise<SendMessageResult> {
    const url = `${this.baseUrl}/${params.phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.recipientPhoneNumber,
        type: 'text',
        text: {
          preview_url: params.previewUrl ?? false,
          body: params.text,
        },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Meta text message error (${res.status})`;
      throw new Error(`Failed to send WhatsApp text message: ${message}`);
    }

    const data = (await res.json()) as {
      contacts?: Array<{ input: string; wa_id: string }>;
      messages?: Array<{ id: string }>;
    };
    return {
      messagingProduct: 'whatsapp',
      contacts: data.contacts || [{ input: params.recipientPhoneNumber, wa_id: params.recipientPhoneNumber }],
      messages: data.messages || [{ id: 'mock-meta-id' }],
    };
  }

  /**
   * Sends a media message (image, video, audio, or document).
   */
  async sendMediaMessage(params: SendMediaMessageParams): Promise<SendMessageResult> {
    const url = `${this.baseUrl}/${params.phoneNumberId}/messages`;

    const mediaObj: Record<string, unknown> = {};
    if (params.mediaUrl) mediaObj.link = params.mediaUrl;
    if (params.mediaId) mediaObj.id = params.mediaId;
    if (params.caption) mediaObj.caption = params.caption;
    if (params.filename) mediaObj.filename = params.filename;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.recipientPhoneNumber,
        type: params.type,
        [params.type]: mediaObj,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Meta media message error (${res.status})`;
      throw new Error(`Failed to send WhatsApp media message: ${message}`);
    }

    const data = (await res.json()) as {
      contacts?: Array<{ input: string; wa_id: string }>;
      messages?: Array<{ id: string }>;
    };
    return {
      messagingProduct: 'whatsapp',
      contacts: data.contacts || [{ input: params.recipientPhoneNumber, wa_id: params.recipientPhoneNumber }],
      messages: data.messages || [{ id: 'mock-meta-id' }],
    };
  }

  /**
   * Fetches the WhatsApp business profile metadata.
   */
  async fetchBusinessProfile(
    phoneNumberId: string,
    accessToken: string
  ): Promise<BusinessProfileResult> {
    const url = `${this.baseUrl}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Business profile error (${res.status})`;
      throw new Error(`Failed to fetch WhatsApp business profile: ${message}`);
    }

    const json = (await res.json()) as {
      data?: Array<{
        about?: string;
        address?: string;
        description?: string;
        email?: string;
        profile_picture_url?: string;
        websites?: string[];
        vertical?: string;
      }>;
    };
    const profile = json.data?.[0] || {};
    return {
      about: profile.about,
      address: profile.address,
      description: profile.description,
      email: profile.email,
      profilePictureUrl: profile.profile_picture_url,
      websites: profile.websites,
      vertical: profile.vertical,
    };
  }

  /**
   * Updates the WhatsApp business profile fields.
   */
  async updateBusinessProfile(
    phoneNumberId: string,
    accessToken: string,
    profile: UpdateBusinessProfileParams
  ): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/${phoneNumberId}/whatsapp_business_profile`;

    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
    };
    if (profile.about !== undefined) body.about = profile.about;
    if (profile.address !== undefined) body.address = profile.address;
    if (profile.description !== undefined) body.description = profile.description;
    if (profile.email !== undefined) body.email = profile.email;
    if (profile.websites !== undefined) body.websites = profile.websites;
    if (profile.vertical !== undefined) body.vertical = profile.vertical;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Business profile update error (${res.status})`;
      throw new Error(`Failed to update WhatsApp business profile: ${message}`);
    }

    const data = (await res.json()) as { success?: boolean };
    return { success: data.success !== false };
  }

  /**
   * Exchanges an authorization code from Embedded Signup v4 for a user access token.
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri?: string
  ): Promise<ExchangeTokenResult> {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    });
    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }
    const url = `${this.baseUrl}/oauth/access_token?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Token exchange error (${res.status})`;
      throw new Error(`Failed to exchange code for access token: ${message}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      token_type?: string;
      expires_in?: number;
    };

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'bearer',
      expiresIn: data.expires_in,
    };
  }

  /**
   * Validates and inspects an access token with Meta Graph API debug_token endpoint.
   */
  async debugToken(inputToken: string, appAccessToken: string): Promise<DebugTokenResult> {
    const url = `${this.baseUrl}/debug_token?input_token=${encodeURIComponent(inputToken)}&access_token=${encodeURIComponent(appAccessToken)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Debug token error (${res.status})`;
      throw new Error(`Failed to debug token: ${message}`);
    }

    const json = (await res.json()) as {
      data?: {
        app_id?: string;
        type?: string;
        application?: string;
        expires_at?: number;
        is_valid?: boolean;
        scopes?: string[];
        granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
      };
    };

    const d = json.data || {};
    return {
      isValid: !!d.is_valid,
      appId: d.app_id,
      type: d.type,
      application: d.application,
      expiresAt: d.expires_at,
      scopes: d.scopes,
      granularScopes: d.granular_scopes?.map(g => ({
        scope: g.scope,
        targetIds: g.target_ids,
      })),
    };
  }

  /**
   * Subscribes a WABA to Pingza's webhooks.
   */
  async subscribeWabaWebhooks(wabaId: string, accessToken: string): Promise<SubscribeWebhooksResult> {
    const url = `${this.baseUrl}/${wabaId}/subscribed_apps`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Webhook subscription error (${res.status})`;
      throw new Error(`Failed to subscribe WABA webhooks: ${message}`);
    }

    const data = (await res.json()) as { success?: boolean };
    return { success: data.success !== false };
  }

  /**
   * Registers a phone number with Meta WhatsApp Cloud API.
   */
  async registerPhoneNumber(
    phoneNumberId: string,
    accessToken: string,
    pin = '123456'
  ): Promise<RegisterPhoneNumberResult> {
    const url = `${this.baseUrl}/${phoneNumberId}/register`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errObj = errBody as { error?: { message?: string } };
      const message = errObj?.error?.message || `Phone registration error (${res.status})`;
      throw new Error(`Failed to register phone number: ${message}`);
    }

    const data = (await res.json()) as { success?: boolean };
    return { success: data.success !== false };
  }
}

/**
 * Mock WhatsApp Adapter for testing and local sandbox development
 */
export class MockWhatsAppAdapter implements WhatsAppAdapter {
  verifyWebhookSignature(payload: string | Buffer, signature: string, appSecret: string): boolean {
    if (!signature || !appSecret) return false;
    const parts = signature.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;

    const hmac = crypto.createHmac('sha256', appSecret);
    if (Buffer.isBuffer(payload)) {
      hmac.update(payload);
    } else {
      hmac.update(payload, 'utf8');
    }
    const expected = hmac.digest('hex');
    return parts[1] === expected;
  }

  async fetchPhoneNumberDetails(phoneNumberId: string): Promise<PhoneNumberDetailsResult> {
    return {
      id: phoneNumberId,
      verifiedName: 'Test Business Account',
      displayPhoneNumber: '+1 555-0199',
      qualityRating: QualityRating.GREEN,
      codeVerificationStatus: 'VERIFIED',
    };
  }

  async fetchWabaDetails(wabaId: string): Promise<WabaDetailsResult> {
    return {
      id: wabaId,
      name: 'Test Business WABA',
      currency: 'USD',
      timezoneId: '1',
      messageTemplateNamespace: 'test_namespace',
    };
  }

  async testConnection(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async fetchTemplates(): Promise<SyncTemplatesResult[]> {
    return [
      {
        id: 'tpl_101',
        name: 'order_update',
        status: 'APPROVED',
        category: TemplateCategory.UTILITY,
        language: 'en_US',
      },
    ];
  }

  async createTemplate(
    _wabaId: string,
    _accessToken: string,
    params: CreateTemplateParams
  ): Promise<CreateTemplateResult> {
    return {
      id: `mock_tpl_${Date.now()}`,
      status: 'APPROVED',
      category: params.category,
    };
  }

  async deleteTemplate(
    _wabaId: string,
    _accessToken: string,
    _templateName: string
  ): Promise<{ success: boolean }> {
    return { success: true };
  }

  async sendTemplateMessage(params: SendTemplateMessageParams): Promise<SendMessageResult> {
    return {
      messagingProduct: 'whatsapp',
      contacts: [{ input: params.recipientPhoneNumber, wa_id: params.recipientPhoneNumber.replace(/\+/g, '') }],
      messages: [{ id: `wamid_${Date.now()}` }],
    };
  }

  async sendTextMessage(params: SendTextMessageParams): Promise<SendMessageResult> {
    return {
      messagingProduct: 'whatsapp',
      contacts: [{ input: params.recipientPhoneNumber, wa_id: params.recipientPhoneNumber.replace(/\+/g, '') }],
      messages: [{ id: `wamid_text_${Date.now()}` }],
    };
  }

  async sendMediaMessage(params: SendMediaMessageParams): Promise<SendMessageResult> {
    return {
      messagingProduct: 'whatsapp',
      contacts: [{ input: params.recipientPhoneNumber, wa_id: params.recipientPhoneNumber.replace(/\+/g, '') }],
      messages: [{ id: `wamid_media_${Date.now()}` }],
    };
  }

  async fetchBusinessProfile(
    _phoneNumberId: string,
    _accessToken: string
  ): Promise<BusinessProfileResult> {
    return {
      about: 'Pingza WhatsApp Marketing Platform',
      address: '123 SaaS Street, Suite 400',
      description: 'Official WhatsApp Marketing automation and customer engagement.',
      email: 'support@pingza.io',
      websites: ['https://pingza.io'],
      vertical: 'PROFESSIONAL_SERVICES',
    };
  }

  async updateBusinessProfile(
    _phoneNumberId: string,
    _accessToken: string,
    _profile: UpdateBusinessProfileParams
  ): Promise<{ success: boolean }> {
    return { success: true };
  }

  async exchangeCodeForToken(
    code: string,
    _clientId: string,
    _clientSecret: string,
    _redirectUri?: string
  ): Promise<ExchangeTokenResult> {
    if (code === 'invalid_code' || code === 'bad_code') {
      throw new Error('Failed to exchange code for access token: Invalid authorization code');
    }
    return {
      accessToken: `mock_access_token_for_${code}`,
      tokenType: 'bearer',
      expiresIn: 5184000,
    };
  }

  async debugToken(inputToken: string, _appAccessToken: string): Promise<DebugTokenResult> {
    if (inputToken.includes('invalid')) {
      return {
        isValid: false,
        error: 'Token is invalid or expired',
      };
    }
    return {
      isValid: true,
      appId: 'mock_app_id',
      type: 'USER',
      application: 'Pingza WhatsApp',
      expiresAt: Math.floor(Date.now() / 1000) + 5184000,
      scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
      granularScopes: [
        {
          scope: 'whatsapp_business_management',
          targetIds: ['waba_mock_123'],
        },
      ],
    };
  }

  async subscribeWabaWebhooks(_wabaId: string, _accessToken: string): Promise<SubscribeWebhooksResult> {
    return { success: true };
  }

  async registerPhoneNumber(
    _phoneNumberId: string,
    _accessToken: string,
    _pin?: string
  ): Promise<RegisterPhoneNumberResult> {
    return { success: true };
  }
}
