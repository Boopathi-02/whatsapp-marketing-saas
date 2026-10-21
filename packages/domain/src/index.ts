/**
 * Domain enums and value types for WhatsApp Marketing SaaS
 */

export const WorkspaceRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const WhatsAppAccountStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  PENDING_VERIFICATION: 'pending_verification',
  DEGRADED: 'degraded',
} as const;
export type WhatsAppAccountStatus = (typeof WhatsAppAccountStatus)[keyof typeof WhatsAppAccountStatus];

export const QualityRating = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type QualityRating = (typeof QualityRating)[keyof typeof QualityRating];

export const ContactOptInStatus = {
  OPTED_IN: 'opted_in',
  OPTED_OUT: 'opted_out',
  PENDING: 'pending',
} as const;
export type ContactOptInStatus = (typeof ContactOptInStatus)[keyof typeof ContactOptInStatus];

export const TemplateCategory = {
  MARKETING: 'MARKETING',
  UTILITY: 'UTILITY',
  AUTHENTICATION: 'AUTHENTICATION',
} as const;
export type TemplateCategory = (typeof TemplateCategory)[keyof typeof TemplateCategory];

export const TemplateStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED',
} as const;
export type TemplateStatus = (typeof TemplateStatus)[keyof typeof TemplateStatus];

export const CampaignStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const MessageStatus = {
  ACCEPTED: 'accepted',
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

const MESSAGE_STATUS_RANK: Record<string, number> = { accepted: 0, queued: 1, sent: 2, delivered: 3, read: 4 };

/**
 * Message statuses only move forward. Webhooks can arrive late or out of order, so a late
 * 'sent' must never overwrite 'read'. 'failed' is terminal and can only follow pre-delivery states.
 */
export function canAdvanceMessageStatus(from: MessageStatus, to: MessageStatus): boolean {
  if (from === to || from === 'failed') return false;
  if (to === 'failed') return from !== 'delivered' && from !== 'read';
  return MESSAGE_STATUS_RANK[to]! > MESSAGE_STATUS_RANK[from]!;
}

/** All current statuses from which a transition to `to` is allowed (for atomic conditional updates). */
export function messageStatusesBefore(to: MessageStatus): MessageStatus[] {
  return (Object.values(MessageStatus) as MessageStatus[]).filter(s => canAdvanceMessageStatus(s, to));
}

export const SubscriptionTier = {
  FREE_TRIAL: 'free_trial',
  STARTER: 'starter',
  GROWTH: 'growth',
  ENTERPRISE: 'enterprise',
} as const;
export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

/**
 * Base Multi-Tenant Entity
 * All workspace-scoped models must implement this pattern.
 */
export interface MultiTenantEntity {
  id: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  tier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppAccount extends MultiTenantEntity {
  phoneNumberId: string;
  wabaId: string;
  displayName: string;
  displayPhoneNumber: string;
  status: WhatsAppAccountStatus;
  qualityRating: QualityRating;
}

export interface Contact extends MultiTenantEntity {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  optInStatus: ContactOptInStatus;
  optInDate?: Date;
  tags: string[];
  customAttributes: Record<string, string | number | boolean>;
}

export interface MessageTemplate extends MultiTenantEntity {
  metaTemplateId?: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: string;
  }>;
}

export interface Campaign extends MultiTenantEntity {
  name: string;
  templateId: string;
  whatsAppAccountId: string;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: Date;
  completedAt?: Date;
}
