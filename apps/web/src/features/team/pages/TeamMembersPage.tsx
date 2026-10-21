import React from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { TeamSettingsTab } from '../../settings/components/TeamSettingsTab.js';

export const TeamMembersPage: React.FC = () => {
  return (
    <Box id="team-members-page-container">
      <PageHeader
        title="Team & Workspace Members"
        subtitle="Manage roles, access levels, and team invitations for your active workspace"
      />
      <TeamSettingsTab />
    </Box>
  );
};
