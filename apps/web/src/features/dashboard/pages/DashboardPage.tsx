import React from 'react';
import { Box, Grid } from '@mui/material';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { DemoBanner } from '../../../components/common/DemoBanner.js';
import { MetricsOverview } from '../components/MetricsOverview.js';
import { VolumeChart } from '../components/VolumeChart.js';
import { RecentCampaigns } from '../components/RecentCampaigns.js';
import { ActivityFeed } from '../components/ActivityFeed.js';
import { QuickActions } from '../components/QuickActions.js';
import { DEMO_DASHBOARD_METRICS } from '../data/demoData.js';
import { useApiHealth } from '../../../hooks/useApiHealth.js';

export const DashboardPage: React.FC = () => {
  const apiHealth = useApiHealth();

  return (
    <Box id="dashboard-page-container">
      {/* Page Title & Breadcrumbs with Quick Actions */}
      <PageHeader
        title="Marketing Dashboard"
        subtitle="Multi-tenant WhatsApp campaign delivery metrics and account automation status"
        action={<QuickActions />}
      />

      {/* Demo Mode Notice Banner */}
      <DemoBanner apiConnected={apiHealth.isConnected} />

      {/* Top 4 Stat Cards */}
      <MetricsOverview metrics={DEMO_DASHBOARD_METRICS} />

      {/* Mid Section: Volume Chart & Real-Time Activity */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <VolumeChart data={DEMO_DASHBOARD_METRICS.volumeHistory} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ActivityFeed activities={DEMO_DASHBOARD_METRICS.recentActivity} />
        </Grid>
      </Grid>

      {/* Bottom Section: Recent Campaigns Table */}
      <Box sx={{ mb: 2 }}>
        <RecentCampaigns campaigns={DEMO_DASHBOARD_METRICS.recentCampaigns} />
      </Box>
    </Box>
  );
};
