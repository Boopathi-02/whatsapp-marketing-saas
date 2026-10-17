import React from 'react';
import { Box } from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';

export const AnalyticsPage: React.FC = () => {
  return (
    <Box id="analytics-page-container">
      <PageHeader
        title="Delivery & Conversion Analytics"
        subtitle="In-depth delivery receipt times, read rates, click-through tracking and cost metrics"
      />

      <EmptyState
        title="Analytics Engine Inactive"
        description="Historical trend analysis, webhook status ingestion, and conversion attribution models are scheduled for Phase 4."
        icon={<BarChartOutlinedIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
      />
    </Box>
  );
};
