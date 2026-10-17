import React from 'react';
import { Box, Card, CardContent, Typography, Alert, AlertTitle, Grid, Chip } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import { PageHeader } from '../../../components/common/PageHeader.js';

export const AdminPage: React.FC = () => {
  return (
    <Box id="admin-page-container">
      <PageHeader
        title="Super Admin Portal"
        subtitle="Platform-wide multi-tenant controls, system health, and global workspace management"
      />

      {/* Security Architecture Notice */}
      <Alert
        severity="warning"
        icon={<SecurityIcon fontSize="inherit" />}
        sx={{
          mb: 4,
          p: 2,
          borderRadius: 2,
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
          border: '1px solid',
          borderColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.25)',
        }}
      >
        <AlertTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          Development-Only Shell Notice
          <Chip label="PHASE 6 ROADMAP" color="warning" size="small" sx={{ fontWeight: 700 }} />
        </AlertTitle>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          This administrative view is exposed strictly as a layout placeholder for architecture evaluation.
          <strong> Client-side navigation visibility does NOT constitute security.</strong> In Phase 2 and Phase 6,
          all administrative operations will require verified server-side JWT claims with explicit SuperAdmin roles,
          session invalidation, and immutable audit logs.
        </Typography>
      </Alert>

      {/* Mock Administrative Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <CorporateFareIcon color="warning" />
                <Typography variant="h4" fontWeight={700}>
                  Total Workspaces
                </Typography>
              </Box>
              <Typography variant="h2" fontWeight={800}>
                128
              </Typography>
              <Typography variant="caption" color="text.secondary">
                124 Active • 4 Suspended (Mock)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <SpeedIcon color="warning" />
                <Typography variant="h4" fontWeight={700}>
                  Global Message Rate
                </Typography>
              </Box>
              <Typography variant="h2" fontWeight={800}>
                342 / sec
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aggregated Meta Cloud API dispatch (Mock)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <AdminPanelSettingsIcon color="warning" />
                <Typography variant="h4" fontWeight={700}>
                  Audit Log Integrity
                </Typography>
              </Box>
              <Typography variant="h2" fontWeight={800}>
                Verified
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cryptographic tamper checks enabled (Phase 6)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
