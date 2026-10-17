import React from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MarkChatReadOutlinedIcon from '@mui/icons-material/MarkChatReadOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { NavItem } from './NavItem.js';
import { useOptionalAuth } from '../features/auth/AuthContext.js';

export const SIDEBAR_WIDTH = 264;

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const auth = useOptionalAuth();
  const currentWorkspace = auth?.currentWorkspace;

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <WhatsAppIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              WhatsApp SaaS
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Marketing Platform
            </Typography>
          </Box>
        </Box>
        {/* Mobile close button */}
        <IconButton
          onClick={onMobileClose}
          sx={{ display: { md: 'none' }, color: 'text.secondary' }}
          aria-label="Close sidebar"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flexGrow: 1, px: 2, py: 2, overflowY: 'auto' }}>
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            mb: 1,
            display: 'block',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'text.secondary',
            opacity: 0.8,
          }}
        >
          Workspace
        </Typography>

        <List disablePadding>
          <NavItem
            id="nav-dashboard"
            to="/"
            label="Dashboard"
            icon={<DashboardOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-contacts"
            to="/contacts"
            label="Contacts"
            icon={<PeopleAltOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-whatsapp-accounts"
            to="/whatsapp-accounts"
            label="WhatsApp Accounts"
            icon={<WhatsAppIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-templates"
            to="/templates"
            label="Message Templates"
            icon={<MarkChatReadOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-campaigns"
            to="/campaigns"
            label="Campaigns"
            icon={<CampaignOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-analytics"
            to="/analytics"
            label="Analytics"
            icon={<BarChartOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-billing"
            to="/billing"
            label="Billing"
            icon={<CreditCardOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-settings"
            to="/settings"
            label="Settings"
            icon={<SettingsOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
          <NavItem
            id="nav-team"
            to="/team"
            label="Team & Members"
            icon={<GroupOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
        </List>

        <Divider sx={{ my: 2.5 }} />

        {/* Super Admin Section - Clearly Separated */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
              opacity: 0.8,
            }}
          >
            System Administration
          </Typography>
          <Chip
            label="DEV ONLY"
            color="warning"
            size="small"
            sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }}
          />
        </Box>

        <List disablePadding>
          <NavItem
            id="nav-super-admin"
            to="/admin"
            label="Super Admin"
            badge="Phase 6"
            badgeColor="warning"
            icon={<AdminPanelSettingsOutlinedIcon fontSize="small" />}
            onClick={onMobileClose}
          />
        </List>
      </Box>

      {/* Footer Workspace Info */}
      <Box
        sx={{
          p: 2,
          m: 2,
          borderRadius: 2,
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block">
          Active Workspace
        </Typography>
        <Typography variant="body2" fontWeight={700} noWrap>
          {currentWorkspace?.name || 'Workspace'}
        </Typography>
        <Chip
          label="Active"
          color="primary"
          variant="outlined"
          size="small"
          sx={{ mt: 1, height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
        />
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}
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
            width: SIDEBAR_WIDTH,
            backgroundColor: 'background.paper',
          },
        }}
      >
        {content}
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: SIDEBAR_WIDTH,
            backgroundColor: 'background.paper',
          },
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
};
