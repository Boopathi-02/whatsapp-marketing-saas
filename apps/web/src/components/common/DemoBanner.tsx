import React from 'react';
import { Alert, AlertTitle, Box, Chip, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface DemoBannerProps {
  apiConnected?: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ apiConnected = false }) => {
  return (
    <Alert
      severity="info"
      icon={<ScienceIcon fontSize="inherit" />}
      sx={{
        mb: 3,
        borderRadius: 2,
        backgroundColor: theme =>
          theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.08)',
        border: '1px solid',
        borderColor: theme =>
          theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.3)' : 'rgba(14, 165, 233, 0.25)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <AlertTitle sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            Phase 1 Foundation & Interactive Demo Mode
            <Chip
              size="small"
              label="DEMO DATA"
              color="info"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
            />
          </AlertTitle>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Metrics, charts, and campaign logs below are strictly isolated mock figures for UI verification.
            Live Meta WhatsApp Cloud API credentials and billing synchronizations are scheduled for Phase 3 and Phase 5.
          </Typography>
        </Box>
        <Chip
          icon={<InfoOutlinedIcon fontSize="small" />}
          label={apiConnected ? 'API Connected (Liveness Active)' : 'API Offline (Standalone Demo Active)'}
          color={apiConnected ? 'success' : 'default'}
          variant="outlined"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Box>
    </Alert>
  );
};
