import React from 'react';
import { ListItemButton, ListItemIcon, ListItemText, Chip, Box } from '@mui/material';
import { NavLink as RouterNavLink } from 'react-router-dom';

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  onClick?: () => void;
  id?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  label,
  icon,
  badge,
  badgeColor = 'default',
  onClick,
  id,
}) => {
  return (
    <ListItemButton
      id={id}
      component={RouterNavLink}
      to={to}
      onClick={onClick}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        px: 2,
        py: 1,
        color: 'text.secondary',
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          color: 'text.primary',
        },
        '&.active': {
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(20, 184, 166, 0.1)',
          color: 'primary.main',
          fontWeight: 500,
          '& .MuiListItemIcon-root': {
            color: 'primary.main',
          },
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 36,
          color: 'inherit',
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: '0.875rem',
          fontWeight: 'inherit',
        }}
      />
      {badge && (
        <Box sx={{ ml: 1 }}>
          <Chip
            size="small"
            label={badge}
            color={badgeColor}
            sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }}
          />
        </Box>
      )}
    </ListItemButton>
  );
};
