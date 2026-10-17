import React from 'react';
import { Box, Button } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';

export const ContactsPage: React.FC = () => {
  return (
    <Box id="contacts-page-container">
      <PageHeader
        title="Contact Management"
        subtitle="Audience directory, opt-in consent verification, and tag segmentation"
        action={
          <Button variant="contained" color="primary" startIcon={<UploadFileIcon />}>
            Import Contacts (Phase 3)
          </Button>
        }
      />

      <EmptyState
        title="No Contacts Ingested Yet"
        description="Tenant-scoped contact repositories, CSV/Excel parsing pipelines, and opt-in consent records will be activated in Phase 3."
        icon={<PeopleAltOutlinedIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
        actionLabel="View Implementation Roadmap"
        onAction={() => alert('Phase 3 will introduce contact management and bulk CSV imports.')}
      />
    </Box>
  );
};
