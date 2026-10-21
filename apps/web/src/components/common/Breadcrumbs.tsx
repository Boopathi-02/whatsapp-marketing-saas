import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Typography, Link as MuiLink } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const ROUTE_LABELS: Record<string, string> = {
  contacts: 'Contacts',
  'whatsapp-accounts': 'WhatsApp Accounts',
  templates: 'Message Templates',
  campaigns: 'Campaigns',
  analytics: 'Analytics',
  billing: 'Billing',
  settings: 'Settings',
  team: 'Team & Members',
  admin: 'Super Admin',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.6 }} />}
      aria-label="breadcrumb"
      sx={{ mb: 1 }}
    >
      <MuiLink
        component={RouterLink}
        to="/"
        underline="hover"
        color="text.secondary"
        variant="body2"
        sx={{ '&:hover': { color: 'primary.main' } }}
      >
        Home
      </MuiLink>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label = ROUTE_LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1);

        return last ? (
          <Typography key={to} color="text.primary" variant="body2" fontWeight={600}>
            {label}
          </Typography>
        ) : (
          <MuiLink
            key={to}
            component={RouterLink}
            to={to}
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            {label}
          </MuiLink>
        );
      })}
    </MuiBreadcrumbs>
  );
};
