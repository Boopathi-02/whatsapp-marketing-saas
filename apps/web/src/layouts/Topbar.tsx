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
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckIcon from '@mui/icons-material/Check';
import BusinessIcon from '@mui/icons-material/Business';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '../hooks/useThemeMode.js';
import { useApiHealth } from '../hooks/useApiHealth.js';
import { useAuth } from '../features/auth/AuthContext.js';
import { CreateWorkspaceDialog } from '../features/workspaces/components/CreateWorkspaceDialog.js';

interface TopbarProps {
  onMobileDrawerToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileDrawerToggle }) => {
  const { mode, toggleTheme } = useThemeMode();
  const apiHealth = useApiHealth();
  const { user, currentWorkspace, workspaces, switchWorkspace, logout } = useAuth();
  const navigate = useNavigate();

  // Profile menu state
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const handleOpenProfile = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchor(event.currentTarget);
  };
  const handleCloseProfile = () => {
    setProfileAnchor(null);
  };

  // Workspace menu state
  const [wsAnchor, setWsAnchor] = useState<null | HTMLElement>(null);
  const [createWsOpen, setCreateWsOpen] = useState(false);

  // Notifications menu state
  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null);
  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchor(event.currentTarget);
  };
  const handleCloseNotifications = () => {
    setNotificationsAnchor(null);
  };

  const handleSignOut = async () => {
    handleCloseProfile();
    await logout();
    navigate('/login', { replace: true });
  };

  const userInitials = user?.displayName
    ? user.displayName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64, px: { xs: 2, sm: 3 } }}>
        {/* Left Side: Mobile Menu Button & Workspace Selector */}
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

          {/* Workspace Switcher Button */}
          <Button
            id="btn-workspace-selector"
            color="inherit"
            onClick={e => setWsAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              textTransform: 'none',
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
              '&:hover': {
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            }}
          >
            <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: { xs: 120, sm: 220 } }}>
              {currentWorkspace?.name || 'Select Workspace'}
            </Typography>
          </Button>

          {/* Workspace Switcher Menu */}
          <Menu
            id="menu-workspaces"
            anchorEl={wsAnchor}
            open={Boolean(wsAnchor)}
            onClose={() => setWsAnchor(null)}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            sx={{ mt: 1 }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Your Workspaces
              </Typography>
            </Box>
            <Divider />

            {workspaces.map(ws => (
              <MenuItem
                key={ws.id}
                selected={ws.id === currentWorkspace?.id}
                onClick={() => {
                  switchWorkspace(ws.id);
                  setWsAnchor(null);
                }}
                sx={{ py: 1.25, minWidth: 220, display: 'flex', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={ws.id === currentWorkspace?.id ? 700 : 500}>
                    {ws.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Role: {ws.role || 'member'}
                  </Typography>
                </Box>
                {ws.id === currentWorkspace?.id && (
                  <CheckIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
                )}
              </MenuItem>
            ))}

            <Divider />
            <MenuItem
              id="btn-new-workspace-menu"
              onClick={() => {
                setWsAnchor(null);
                setCreateWsOpen(true);
              }}
              sx={{ py: 1.25, color: 'primary.main', fontWeight: 600 }}
            >
              <ListItemIcon sx={{ color: 'primary.main' }}>
                <AddCircleOutlineIcon fontSize="small" />
              </ListItemIcon>
              Create New Workspace
            </MenuItem>
          </Menu>

          {/* API Health Pill */}
          <Tooltip
            title={
              apiHealth.isConnected
                ? `API Online (Uptime: ${apiHealth.data?.uptimeSeconds ?? 0}s)`
                : 'Connecting to API server...'
            }
          >
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 9999,
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CircleIcon
                sx={{
                  fontSize: 10,
                  color: apiHealth.isConnected ? 'success.main' : 'warning.main',
                }}
              />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {apiHealth.isConnected ? 'Connected' : 'Offline'}
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

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              id="btn-notifications"
              color="inherit"
              onClick={handleOpenNotifications}
              aria-label="View notifications"
            >
              <Badge badgeContent={1} color="primary" variant="dot">
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
            </Box>
            <Divider />
            <MenuItem onClick={handleCloseNotifications} sx={{ py: 1.5, minWidth: 260 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Multi-tenant Session Active
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Logged in as {user?.email}
                </Typography>
              </Box>
            </MenuItem>
          </Menu>

          {/* User Profile Menu */}
          <Tooltip title={user?.displayName || 'User Profile'}>
            <IconButton
              id="btn-user-profile"
              onClick={handleOpenProfile}
              size="small"
              sx={{ ml: 0.5 }}
              aria-label="User account profile"
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText',
                }}
              >
                {userInitials}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            id="menu-user-profile"
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={handleCloseProfile}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ mt: 1 }}
          >
            <Box sx={{ px: 2, py: 1.5, minWidth: 220 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {user?.displayName || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {user?.email || ''}
              </Typography>
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                Active: {currentWorkspace?.name || 'Workspace'}
              </Typography>
            </Box>
            <Divider />

            <MenuItem
              id="menu-item-team"
              onClick={() => {
                handleCloseProfile();
                navigate('/team');
              }}
            >
              <ListItemIcon>
                <GroupOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Team & Members
            </MenuItem>

            <Divider />

            <MenuItem
              id="btn-sign-out"
              onClick={handleSignOut}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <LogoutOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Create Workspace Modal */}
      <CreateWorkspaceDialog
        open={createWsOpen}
        onClose={() => setCreateWsOpen(false)}
      />
    </AppBar>
  );
};
