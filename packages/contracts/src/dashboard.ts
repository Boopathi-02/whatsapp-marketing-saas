import { z } from 'zod';

export const CampaignSummaryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  templateName: z.string(),
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'failed', 'paused']),
  recipientsCount: z.number(),
  sentCount: z.number(),
  deliveredCount: z.number(),
  readCount: z.number(),
  scheduledAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type CampaignSummaryItem = z.infer<typeof CampaignSummaryItemSchema>;

export const ActivityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['campaign_completed', 'template_approved', 'contacts_imported', 'account_connected']),
  title: z.string(),
  description: z.string(),
  timestamp: z.string(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const MessageVolumeDataPointSchema = z.object({
  date: z.string(),
  sent: z.number(),
  delivered: z.number(),
  read: z.number(),
  failed: z.number(),
});
export type MessageVolumeDataPoint = z.infer<typeof MessageVolumeDataPointSchema>;

export const DashboardMetricsSchema = z.object({
  isDemoData: z.boolean(),
  totalContacts: z.number(),
  contactsGrowthPercentage: z.number(),
  messagesSent: z.number(),
  messagesGrowthPercentage: z.number(),
  deliveryRatePercentage: z.number(),
  deliveryRateTrend: z.number(),
  activeCampaignsCount: z.number(),
  activeCampaignsTrend: z.number(),
  volumeHistory: z.array(MessageVolumeDataPointSchema),
  recentCampaigns: z.array(CampaignSummaryItemSchema),
  recentActivity: z.array(ActivityItemSchema),
});
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
