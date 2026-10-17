import { DashboardMetrics } from '@whatsapp-saas/contracts';

/**
 * Isolated Demo Data for Phase 1 Frontend Dashboard Shell.
 *
 * NOTE: These figures are strictly illustrative mock data used to evaluate
 * UI responsiveness and visual aesthetics. They are never confused with live WhatsApp statistics.
 */
export const DEMO_DASHBOARD_METRICS: DashboardMetrics = {
  isDemoData: true,
  totalContacts: 14280,
  contactsGrowthPercentage: 12.5,
  messagesSent: 86450,
  messagesGrowthPercentage: 24.8,
  deliveryRatePercentage: 98.6,
  deliveryRateTrend: 0.4,
  activeCampaignsCount: 6,
  activeCampaignsTrend: 2,
  volumeHistory: [
    { date: 'Mon', sent: 12400, delivered: 12250, read: 10400, failed: 150 },
    { date: 'Tue', sent: 15800, delivered: 15600, read: 13200, failed: 200 },
    { date: 'Wed', sent: 18200, delivered: 17950, read: 15100, failed: 250 },
    { date: 'Thu', sent: 14100, delivered: 13900, read: 11800, failed: 200 },
    { date: 'Fri', sent: 21500, delivered: 21200, read: 18400, failed: 300 },
    { date: 'Sat', sent: 9800, delivered: 9700, read: 8100, failed: 100 },
    { date: 'Sun', sent: 11200, delivered: 11050, read: 9200, failed: 150 },
  ],
  recentCampaigns: [
    {
      id: 'camp-01',
      name: 'Spring Flash Sale VIP',
      templateName: 'seasonal_promo_v2',
      status: 'completed',
      recipientsCount: 25000,
      sentCount: 25000,
      deliveredCount: 24700,
      readCount: 21300,
      completedAt: '2 hours ago',
    },
    {
      id: 'camp-02',
      name: 'Abandoned Cart Recovery (Cohort B)',
      templateName: 'cart_recovery_discount',
      status: 'sending',
      recipientsCount: 8400,
      sentCount: 6200,
      deliveredCount: 6050,
      readCount: 4800,
      scheduledAt: 'In progress',
    },
    {
      id: 'camp-03',
      name: 'Monthly Loyalty Statement',
      templateName: 'points_balance_update',
      status: 'scheduled',
      recipientsCount: 45000,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      scheduledAt: 'Tomorrow, 09:00 AM',
    },
    {
      id: 'camp-04',
      name: 'Product Launch Early Access',
      templateName: 'exclusive_preorder',
      status: 'draft',
      recipientsCount: 12000,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
    },
  ],
  recentActivity: [
    {
      id: 'act-01',
      type: 'campaign_completed',
      title: 'Campaign Completed',
      description: '"Spring Flash Sale VIP" finished sending 25,000 messages with 98.8% delivery.',
      timestamp: '15 minutes ago',
    },
    {
      id: 'act-02',
      type: 'template_approved',
      title: 'Template Approved by Meta',
      description: 'Template "points_balance_update" was approved for the UTILITY category.',
      timestamp: '2 hours ago',
    },
    {
      id: 'act-03',
      type: 'contacts_imported',
      title: 'Contacts Imported',
      description: 'Successfully uploaded 1,420 new opted-in customer phone numbers via CSV.',
      timestamp: 'Yesterday at 4:30 PM',
    },
    {
      id: 'act-04',
      type: 'account_connected',
      title: 'WhatsApp WABA Active',
      description: 'Connected Phone Number (+1 555-0199) maintained GREEN quality score.',
      timestamp: '2 days ago',
    },
  ],
};
