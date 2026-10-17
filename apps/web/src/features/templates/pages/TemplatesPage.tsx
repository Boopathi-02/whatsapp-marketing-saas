import React from 'react';
import { Box, Button } from '@mui/material';
import MarkChatReadOutlinedIcon from '@mui/icons-material/MarkChatReadOutlined';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';

export const TemplatesPage: React.FC = () => {
  return (
    <Box id="templates-page-container">
      <PageHeader
        title="Message Templates"
        subtitle="Meta pre-approved marketing, utility, and authentication message templates"
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />}>
            Create Template (Phase 3)
          </Button>
        }
      />

      <EmptyState
        title="No Message Templates Synced"
        description="Template authoring, variable parameters, and automated approval syncing via Meta Graph API will be activated in Phase 3."
        icon={<MarkChatReadOutlinedIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
      />
    </Box>
  );
};
