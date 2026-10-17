import React from 'react';
import { Box, Typography } from '@mui/material';
import { Breadcrumbs } from './Breadcrumbs.js';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBreadcrumbs?: boolean;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBreadcrumbs = true,
  action,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      {showBreadcrumbs && <Breadcrumbs />}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
    </Box>
  );
};
