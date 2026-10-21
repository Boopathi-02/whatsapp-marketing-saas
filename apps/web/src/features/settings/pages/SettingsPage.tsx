import React, { useCallback } from 'react';
import { Box, Tabs, Tab, Paper, Chip } from '@mui/material';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { GeneralSettingsTab } from '../components/GeneralSettingsTab.js';
import { TeamSettingsTab } from '../components/TeamSettingsTab.js';
import { SubscriptionSettingsTab } from '../components/SubscriptionSettingsTab.js';
import { BillingWalletSettingsTab } from '../components/BillingWalletSettingsTab.js';
import { useAuth } from '../../auth/AuthContext.js';

interface SettingsPageProps {
  initialTab?: string;
}

export type SettingsTabKey = 'general' | 'team' | 'subscription' | 'billing';

const VALID_TABS: Record<string, SettingsTabKey> = {
  general: 'general',
  team: 'team',
  subscription: 'subscription',
  billing: 'billing',
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useAuth();

  // Tab resolution order: route param -> query param (?tab=...) -> initialTab prop -> default 'general'
  const tabParam = (routeParams.tab || searchParams.get('tab') || initialTab || 'general').toLowerCase();
  const activeTab: SettingsTabKey = VALID_TABS[tabParam] || 'general';

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: SettingsTabKey) => {
      // If currently on a sub-route like /settings/:tab, navigate cleanly to /settings?tab=...
      if (routeParams.tab) {
        navigate(`/settings?tab=${newValue}`);
      } else {
        setSearchParams({ tab: newValue });
      }
    },
    [navigate, routeParams.tab, setSearchParams]
  );

  const handleNavigateTab = useCallback(
    (targetTab: string) => {
      const valid = VALID_TABS[targetTab.toLowerCase()] || 'general';
      setSearchParams({ tab: valid });
    },
    [setSearchParams]
  );

  return (
    <Box id="settings-page-container" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Workspace Settings"
        subtitle="Configure organization profile, team members, subscription plan, and prepaid billing"
        action={
          currentWorkspace ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`Workspace: ${currentWorkspace.name}`}
                variant="outlined"
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`Role: ${currentWorkspace.role || 'member'}`}
                color="default"
                size="small"
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              />
            </Box>
          ) : undefined
        }
      />

      {/* Modern Tabs Navigation Bar */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
          px: 1.5,
          pt: 0.5,
          mb: 1,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Settings section tabs"
          sx={{
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              minHeight: 48,
              px: { xs: 2, sm: 2.5 },
              gap: 1,
              transition: 'all 0.15s ease',
              '&:hover': {
                color: 'primary.main',
                opacity: 0.9,
              },
            },
          }}
        >
          <Tab
            id="tab-settings-general"
            value="general"
            label="General"
            icon={<TuneOutlinedIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            id="tab-settings-team"
            value="team"
            label="Team & Members"
            icon={<GroupOutlinedIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            id="tab-settings-subscription"
            value="subscription"
            label="Subscription"
            icon={<CardMembershipOutlinedIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            id="tab-settings-billing"
            value="billing"
            label="Billing & Wallet"
            icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Box sx={{ mt: 1 }}>
        {activeTab === 'general' && <GeneralSettingsTab onNavigateTab={handleNavigateTab} />}
        {activeTab === 'team' && <TeamSettingsTab />}
        {activeTab === 'subscription' && <SubscriptionSettingsTab onNavigateTab={handleNavigateTab} />}
        {activeTab === 'billing' && <BillingWalletSettingsTab />}
      </Box>
    </Box>
  );
};
