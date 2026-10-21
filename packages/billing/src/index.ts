import { SubscriptionTier } from '@whatsapp-saas/domain';

export interface PlanLimits {
  tier: SubscriptionTier;
  monthlyMessageQuota: number;
  maxContacts: number;
  maxWhatsAppAccounts: number;
  templatesSyncEnabled: boolean;
  teamMembersAllowed: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  [SubscriptionTier.FREE_TRIAL]: {
    tier: SubscriptionTier.FREE_TRIAL,
    monthlyMessageQuota: 250,
    maxContacts: 500,
    maxWhatsAppAccounts: 1,
    templatesSyncEnabled: true,
    teamMembersAllowed: 1,
  },
  [SubscriptionTier.STARTER]: {
    tier: SubscriptionTier.STARTER,
    monthlyMessageQuota: 5000,
    maxContacts: 10000,
    maxWhatsAppAccounts: 2,
    templatesSyncEnabled: true,
    teamMembersAllowed: 3,
  },
  [SubscriptionTier.GROWTH]: {
    tier: SubscriptionTier.GROWTH,
    monthlyMessageQuota: 50000,
    maxContacts: 100000,
    maxWhatsAppAccounts: 5,
    templatesSyncEnabled: true,
    teamMembersAllowed: 10,
  },
  [SubscriptionTier.ENTERPRISE]: {
    tier: SubscriptionTier.ENTERPRISE,
    monthlyMessageQuota: 1000000,
    maxContacts: 2000000,
    maxWhatsAppAccounts: 50,
    templatesSyncEnabled: true,
    teamMembersAllowed: 100,
  },
};

export * from './money.js';
export * from './subscription.js';
export * from './ledger.js';

export interface BillingUsageRecord {
  workspaceId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  messagesSent: number;
  quotaLimit: number;
  overageAllowed: boolean;
}
