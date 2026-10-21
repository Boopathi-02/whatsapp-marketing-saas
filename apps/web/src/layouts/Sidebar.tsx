import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import MarkChatReadOutlinedIcon from '@mui/icons-material/MarkChatReadOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useOptionalAuth } from '../features/auth/AuthContext.js';
import { PingzaLogo } from '../components/branding/PingzaLogo.js';

export const PRIMARY_RAIL_WIDTH = 54;
export const SECONDARY_PANEL_WIDTH = 224;
export const TOTAL_SIDEBAR_WIDTH = PRIMARY_RAIL_WIDTH + SECONDARY_PANEL_WIDTH; // 278px
export const SIDEBAR_WIDTH = TOTAL_SIDEBAR_WIDTH;
export const COLLAPSED_SIDEBAR_WIDTH = PRIMARY_RAIL_WIDTH;

const visuallyHidden = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed?: boolean;
  secondaryCollapsed?: boolean;
  onToggleSecondary?: () => void;
  onOpenSettings?: () => void;
  onOtherItemClick?: () => void;
}

interface NavItemConfig {
  id?: string;
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

interface NavSectionConfig {
  title: string;
  subtitle?: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onMobileClose,
  collapsed,
  secondaryCollapsed,
  onToggleSecondary,
  onOpenSettings,
  onOtherItemClick,
}) => {
  const auth = useOptionalAuth();
  const currentWorkspace = auth?.currentWorkspace;
  const user = auth?.user;
  const location = useLocation();

  const isSettingsRoute = location.pathname.startsWith('/settings');

  const [internalSecondaryCollapsed, setInternalSecondaryCollapsed] = useState(false);

  // If secondaryCollapsed is explicitly controlled by parent, use it;
  // otherwise, default to displaying only when on /settings route!
  const isSecondaryCollapsed =
    collapsed !== undefined
      ? collapsed
      : secondaryCollapsed !== undefined
        ? secondaryCollapsed
        : !isSettingsRoute || internalSecondaryCollapsed;

  const handleToggleSecondary = () => {
    if (onToggleSecondary) {
      onToggleSecondary();
    } else {
      setInternalSecondaryCollapsed(prev => !prev);
    }
  };

  const handleSettingsClick = () => {
    onMobileClose();
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  const handleOtherClick = () => {
    onMobileClose();
    if (onOtherItemClick) {
      onOtherItemClick();
    }
  };

  const userInitials = user?.displayName
    ? user.displayName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'U';

  // Check if a secondary navigation item is active
  const isSecondaryItemActive = (to: string) => {
    if (to.includes('?')) {
      const [pathname, search] = to.split('?');
      if (location.pathname !== pathname) return false;
      const urlParams = new URLSearchParams(location.search);
      const targetParams = new URLSearchParams(search);
      const targetTab = targetParams.get('tab');
      const currentTab = urlParams.get('tab') || 'general';
      return targetTab === currentTab;
    }
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  // Primary rail navigation icon config
  const primaryRailItems = [
    {
      id: 'rail-dashboard',
      to: '/',
      label: 'Dashboard',
      icon: <DashboardOutlinedIcon fontSize="small" />,
      isActive: location.pathname === '/',
    },
    {
      id: 'rail-contacts',
      to: '/contacts',
      label: 'Contacts',
      icon: <PeopleAltOutlinedIcon fontSize="small" />,
      isActive: location.pathname.startsWith('/contacts'),
    },
    {
      id: 'rail-whatsapp-accounts',
      to: '/whatsapp-accounts',
      label: 'WhatsApp Accounts',
      icon: <WhatsAppIcon fontSize="small" />,
      isActive: location.pathname.startsWith('/whatsapp-accounts'),
    },
    {
      id: 'rail-conversations',
      to: '/conversations',
      label: 'Live Inbox',
      icon: <ForumOutlinedIcon fontSize="small" />,
      isActive: location.pathname.startsWith('/conversations'),
    },
    {
      id: 'rail-templates',
      to: '/templates',
      label: 'Message Templates',
      icon: <MarkChatReadOutlinedIcon fontSize="small" />,
      isActive: location.pathname.startsWith('/templates'),
    },
    {
      id: 'rail-campaigns',
      to: '/campaigns',
      label: 'Campaigns',
      icon: <CampaignOutlinedIcon fontSize="small" />,
      isActive: location.pathname.startsWith('/campaigns'),
    },
    {
      id: 'rail-analytics',
      to: '/analytics',
      label: 'Analytics',
      icon: <BarChartOutlinedIcon fontSize="small" />,
      isActive: location.pathname.startsWith('/analytics'),
    },
  ];

  // Secondary sidebar grouped sections - Settings only
  const secondarySections: NavSectionConfig[] = [
    {
      title: 'Workspace',
      items: [
        {
          id: 'nav-general',
          to: '/settings?tab=general',
          label: 'General',
          icon: <TuneOutlinedIcon fontSize="small" />,
        },
        {
          id: 'nav-team',
          to: '/settings?tab=team',
          label: 'Team & Members',
          icon: <GroupOutlinedIcon fontSize="small" />,
        },
      ],
    },
    {
      title: 'Misc',
      items: [
        {
          id: 'nav-subscription',
          to: '/settings?tab=subscription',
          label: 'Subscription',
          icon: <CardMembershipOutlinedIcon fontSize="small" />,
        },
        {
          id: 'nav-billing',
          to: '/settings?tab=billing',
          label: 'Billing & Wallet',
          icon: <CreditCardOutlinedIcon fontSize="small" />,
        },
      ],
    },
  ];

  // 1. PRIMARY RAIL CONTENT (54px wide)
  const primaryRailContent = (
    <Box
      sx={{
        width: PRIMARY_RAIL_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundColor: theme =>
          theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : '#F8FAFC',
        py: 1.5,
        zIndex: 2,
        flexShrink: 0,
      }}
    >
      {/* Top Application Logo */}
      <Box
        component={RouterLink}
        to="/"
        aria-label="Pingza Home"
        onClick={handleOtherClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          color: 'inherit',
          mb: 1.5,
          transition: 'transform 0.15s ease',
          '&:hover': { transform: 'scale(1.05)' },
        }}
      >
        <PingzaLogo variant="icon" size={32} />
      </Box>

      <Divider sx={{ width: 32, mb: 1, borderColor: 'divider' }} />

      {/* Primary Rail Navigation Icons */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          flexGrow: 1,
          width: '100%',
        }}
      >
        {primaryRailItems.map(item => (
          <Tooltip key={item.id} title={item.label} placement="right" arrow enterDelay={200}>
            <IconButton
              id={item.id}
              component={RouterLink}
              to={item.to}
              onClick={handleOtherClick}
              aria-label={item.label}
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                color: item.isActive
                  ? theme => (theme.palette.mode === 'dark' ? '#38BDF8' : '#0284C7')
                  : 'text.secondary',
                backgroundColor: item.isActive
                  ? theme => (theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE')
                  : 'transparent',
                '&:hover': {
                  backgroundColor: item.isActive
                    ? theme => (theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.28)' : '#BAE6FD')
                    : theme => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                  color: item.isActive
                    ? theme => (theme.palette.mode === 'dark' ? '#38BDF8' : '#0284C7')
                    : 'text.primary',
                },
                transition: 'all 0.15s ease',
              }}
            >
              {item.icon}
              <Box component="span" sx={visuallyHidden}>
                {item.label}
              </Box>
            </IconButton>
          </Tooltip>
        ))}

        <Divider sx={{ width: 28, my: 0.75, borderColor: 'divider' }} />

        {/* Super Admin rail icon */}
        <Tooltip title="Super Admin" placement="right" arrow enterDelay={200}>
          <IconButton
            id="rail-admin"
            component={RouterLink}
            to="/admin"
            onClick={handleOtherClick}
            aria-label="Super Admin"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              color: location.pathname.startsWith('/admin')
                ? theme => (theme.palette.mode === 'dark' ? '#38BDF8' : '#0284C7')
                : 'text.secondary',
              backgroundColor: location.pathname.startsWith('/admin')
                ? theme => (theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE')
                : 'transparent',
              '&:hover': {
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            <AdminPanelSettingsOutlinedIcon fontSize="small" />
            <Box component="span" sx={visuallyHidden}>
              Super Admin DEV ONLY System Administration
            </Box>
          </IconButton>
        </Tooltip>
      </Box>

      {/* Bottom Controls */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75,
          width: '100%',
          pt: 1,
        }}
      >
        <Divider sx={{ width: 32, mb: 0.5, borderColor: 'divider' }} />

        {/* If on Settings and secondary panel is collapsed, show expand chevron button on rail */}
        {isSettingsRoute && isSecondaryCollapsed && (
          <Tooltip
            title="Expand Settings"
            placement="right"
            arrow
            enterDelay={200}
          >
            <IconButton
              id="btn-toggle-secondary-rail"
              onClick={handleToggleSecondary}
              aria-label="Expand Settings"
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: theme =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Settings Icon on Rail */}
        <Tooltip title="Settings" placement="right" arrow enterDelay={200}>
          <IconButton
            id="rail-settings"
            component={RouterLink}
            to="/settings"
            onClick={handleSettingsClick}
            aria-label="Settings"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              color: isSettingsRoute
                ? theme => (theme.palette.mode === 'dark' ? '#38BDF8' : '#0284C7')
                : 'text.secondary',
              backgroundColor: isSettingsRoute
                ? theme => (theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE')
                : 'transparent',
              '&:hover': {
                backgroundColor: isSettingsRoute
                  ? theme => (theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.28)' : '#BAE6FD')
                  : theme => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                color: isSettingsRoute
                  ? theme => (theme.palette.mode === 'dark' ? '#38BDF8' : '#0284C7')
                  : 'text.primary',
              },
            }}
          >
            <SettingsOutlinedIcon fontSize="small" />
            <Box component="span" sx={visuallyHidden}>
              Settings
            </Box>
          </IconButton>
        </Tooltip>

        {/* Help & Support Button */}
        <Tooltip title="Help & Docs" placement="right" arrow enterDelay={200}>
          <IconButton
            id="rail-help"
            aria-label="Help & Documentation"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            <HelpOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* User Profile Avatar */}
        <Tooltip title={user?.displayName || 'User Profile'} placement="right" arrow enterDelay={200}>
          <IconButton
            id="rail-user-profile"
            component={RouterLink}
            to="/settings"
            onClick={handleSettingsClick}
            sx={{ p: 0.5, mt: 0.5 }}
            aria-label="User profile"
          >
            <Avatar
              sx={{
                width: 30,
                height: 30,
                fontSize: '0.75rem',
                fontWeight: 700,
                bgcolor: 'primary.dark',
                color: 'primary.contrastText',
              }}
            >
              {userInitials}
            </Avatar>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  // 2. SECONDARY PANEL CONTENT (224px wide)
  const secondaryPanelContent = (
    <Box
      sx={{
        width: SECONDARY_PANEL_WIDTH,
        height: '100%',
        display: isSecondaryCollapsed ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Secondary Panel Header */}
      <Box
        sx={{
          height: 52,
          minHeight: 52,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography
            id="secondary-panel-title"
            variant="subtitle2"
            fontWeight={700}
            sx={{ letterSpacing: '0.01em' }}
          >
            Settings
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Collapse Secondary Button */}
          <Tooltip title="Collapse sidebar" placement="bottom" arrow>
            <IconButton
              id="btn-collapse-secondary-header"
              size="small"
              onClick={handleToggleSecondary}
              aria-label="Collapse sidebar"
              sx={{ color: 'text.secondary' }}
            >
              <MenuOpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Mobile close button */}
          <IconButton
            onClick={onMobileClose}
            sx={{ display: { md: 'none' }, color: 'text.secondary', ml: 0.5 }}
            aria-label="Close sidebar"
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Secondary Navigation Section Groups */}
      <Box
        sx={{
          flexGrow: 1,
          px: 1.25,
          py: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {secondarySections.map(section => (
          <Box key={section.title} sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, pt: 1, pb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  opacity: 0.75,
                }}
              >
                {section.title}
              </Typography>
              {section.subtitle && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.625rem',
                    color: 'text.secondary',
                    opacity: 0.6,
                    fontWeight: 500,
                  }}
                >
                  {section.subtitle}
                </Typography>
              )}
            </Box>

            <List disablePadding>
              {section.items.map(item => {
                const active = isSecondaryItemActive(item.to);

                return (
                  <ListItemButton
                    key={item.id}
                    id={item.id}
                    component={RouterLink}
                    to={item.to}
                    onClick={() => {
                      onMobileClose();
                      if (!item.to.startsWith('/settings')) {
                        handleOtherClick();
                      }
                    }}
                    sx={{
                      borderRadius: 1.5,
                      my: 0.2,
                      px: 1.25,
                      py: 0.65,
                      minHeight: 34,
                      color: active ? 'text.primary' : 'text.secondary',
                      backgroundColor: active
                        ? theme =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : '#F1F5F9'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: active
                          ? theme =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.12)'
                              : '#E2E8F0'
                          : theme =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.04)'
                              : 'rgba(0, 0, 0, 0.03)',
                        color: 'text.primary',
                      },
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 26,
                        color: active
                          ? theme => (theme.palette.mode === 'dark' ? '#38BDF8' : '#0284C7')
                          : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <>
                          {item.label}
                          {item.id === 'nav-billing' && (
                            <Box component="span" sx={visuallyHidden}>
                              Billing
                            </Box>
                          )}
                        </>
                      }
                      primaryTypographyProps={{
                        fontSize: '0.8125rem',
                        fontWeight: active ? 600 : 500,
                        noWrap: true,
                      }}
                    />
                    {item.badge && (
                      <Chip
                        size="small"
                        label={item.badge}
                        color={item.badgeColor || 'default'}
                        sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>


    </Box>
  );

  const effectiveWidth = isSecondaryCollapsed ? PRIMARY_RAIL_WIDTH : TOTAL_SIDEBAR_WIDTH;

  return (
    <Box
      component="nav"
      sx={{
        width: { md: effectiveWidth },
        flexShrink: { md: 0 },
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      aria-label="Navigation sidebar"
    >
      {/* Mobile temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: isSecondaryCollapsed ? PRIMARY_RAIL_WIDTH : TOTAL_SIDEBAR_WIDTH,
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'row',
          },
        }}
      >
        {primaryRailContent}
        {secondaryPanelContent}
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: effectiveWidth,
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'row',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
          },
        }}
      >
        {primaryRailContent}
        {secondaryPanelContent}
      </Drawer>
    </Box>
  );
};
