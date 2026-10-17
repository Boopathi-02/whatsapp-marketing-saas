import React from 'react';
import { Box, Button } from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';

export const CampaignsPage: React.FC = () => {
  return (
    <Box id="campaigns-page-container">
      <PageHeader
        title="Broadcast Campaigns"
        subtitle="Schedule and orchestrate bulk WhatsApp notifications with queue telemetry"
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />}>
            New Campaign (Phase 4)
          </Button>
        }
      />

      <EmptyState
        title="No Active Broadcasts"
        description="Multi-tier broadcast scheduling, BullMQ queue dispatching, and per-second throttling will be implemented in Phase 4."
        icon={<CampaignOutlinedIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
      />
    </Box>
  );
};
