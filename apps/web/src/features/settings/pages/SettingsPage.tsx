import React from 'react';
import { Box, Card, CardContent, Typography, TextField, Grid, Button } from '@mui/material';
import { PageHeader } from '../../../components/common/PageHeader.js';

export const SettingsPage: React.FC = () => {
  return (
    <Box id="settings-page-container">
      <PageHeader
        title="Workspace Settings"
        subtitle="Configure organization metadata, timezones, and communication defaults"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                General Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Workspace Name"
                    defaultValue="Acme Corp Marketing"
                    disabled
                    helperText="Configured via tenant provisioning"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Workspace Identifier (Slug)"
                    defaultValue="acme-corp"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Default Timezone"
                    defaultValue="UTC / America/New_York"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Default Country Code"
                    defaultValue="+1 (United States)"
                    disabled
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" disabled>
                  Save Changes (Phase 2)
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
