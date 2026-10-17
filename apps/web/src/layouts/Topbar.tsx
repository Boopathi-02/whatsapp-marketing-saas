import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Divider,
  ListItemIcon,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import { useThemeMode } from '../hooks/useThemeMode.js';
import { useApiHealth } from '../hooks/useApiHealth.js';

interface TopbarProps {
  onMobileDrawerToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileDrawerToggle }) => {
  const { mode, toggleTheme } = useThemeMode();
  const apiHealth = useApiHealth();

  // Profile menu state
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const handleOpenProfile = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchor(event.currentTarget);
  };
  const handleCloseProfile = () => {
    setProfileAnchor(null);
  };

  // Notifications menu state
  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null);
  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchor(event.currentTarget);
  };
  const handleCloseNotifications = () => {
    setNotificationsAnchor(null);
  };

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64, px: { xs: 2, sm: 3 } }}>
        {/* Left Side: Mobile Menu Button & Platform Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            id="btn-mobile-menu"
            color="inherit"
            aria-label="Open navigation drawer"
            edge="start"
            onClick={onMobileDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* API Health Pill */}
          <Tooltip
            title={
              apiHealth.isConnected
                ? `API Online (Uptime: ${apiHealth.data?.uptimeSeconds ?? 0}s)`
                : 'API Offline — Standalone Demo Mode Active'
            }
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 9999,
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
              }}
            >
              <CircleIcon
                sx={{
                  fontSize: 10,
                  color: apiHealth.isConnected ? 'success.main' : 'warning.main',
                }}
              />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {apiHealth.isConnected ? 'API Live' : 'Demo Mode'}
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        {/* Right Side: Theme Toggle, Notifications, Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Theme Mode Toggle */}
          <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} mode`}>
            <IconButton id="btn-theme-toggle" color="inherit" onClick={toggleTheme} aria-label="Toggle theme">
              {mode === 'dark' ? (
                <LightModeOutlinedIcon fontSize="small" sx={{ color: 'warning.light' }} />
              ) : (
                <DarkModeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Notifications Placeholder */}
          <Tooltip title="Notifications (Demo)">
            <IconButton
              id="btn-notifications"
              color="inherit"
              onClick={handleOpenNotifications}
              aria-label="View notifications"
            >
              <Badge badgeContent={2} color="primary" variant="dot">
                <NotificationsOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={notificationsAnchor}
            open={Boolean(notificationsAnchor)}
            onClose={handleCloseNotifications}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ mt: 1 }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Notifications
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Phase 1 interactive mock alerts
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleCloseNotifications} sx={{ py: 1.5, minWidth: 280 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Template "spring_flash_sale" Approved
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Meta approved your marketing template 2 hours ago
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleCloseNotifications} sx={{ py: 1.5 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Daily delivery rate reached 98.4%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  High quality score maintained across all active channels
                </Typography>
              </Box>
            </MenuItem>
          </Menu>

          {/* Profile Menu Placeholder */}
          <Tooltip title="User Profile">
            <IconButton
              id="btn-user-profile"
              onClick={handleOpenProfile}
              size="small"
              sx={{ ml: 0.5 }}
              aria-label="User account profile"
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText',
                }}
              >
                JD
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={handleCloseProfile}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ mt: 1 }}
          >
            <Box sx={{ px: 2, py: 1.5, minWidth: 220 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                John Doe
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                john.doe@example.com
              </Typography>
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                Workspace Owner (Role)
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleCloseProfile}>
              <ListItemIcon>
                <PersonOutlineIcon fontSize="small" />
              </ListItemIcon>
              Profile Settings
            </MenuItem>
            <MenuItem onClick={handleCloseProfile}>
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Workspace Preferences
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleCloseProfile} sx={{ color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <LogoutOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Sign Out (Phase 2 Auth)
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
