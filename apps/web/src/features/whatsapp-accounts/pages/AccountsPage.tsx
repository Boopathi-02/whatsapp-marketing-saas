import React from 'react';
import { Box, Button } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';

export const AccountsPage: React.FC = () => {
  return (
    <Box id="accounts-page-container">
      <PageHeader
        title="WhatsApp Business Accounts"
        subtitle="Manage official Meta Cloud API phone numbers, WABA tokens, and quality ratings"
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />}>
            Connect WABA (Phase 3)
          </Button>
        }
      />

      <EmptyState
        title="No WhatsApp Accounts Connected"
        description="Official Meta Embedded Signup integration, phone number verification, and webhook handshake will be configured in Phase 3."
        icon={<WhatsAppIcon sx={{ fontSize: 32, color: '#10B981' }} />}
        actionLabel="Read Meta Onboarding Prerequisites"
        onAction={() => alert('Phase 3 will configure official Meta WhatsApp Cloud API credentials.')}
      />
    </Box>
  );
};
