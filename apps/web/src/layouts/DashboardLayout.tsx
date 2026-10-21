import React, { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, PRIMARY_RAIL_WIDTH, TOTAL_SIDEBAR_WIDTH } from './Sidebar.js';
import { Topbar } from './Topbar.js';

export const DashboardLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isSettingsRoute = location.pathname.startsWith('/settings');

  // Track if user manually collapsed the secondary panel while on settings
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);

  // When navigating away from /settings, reset settingsCollapsed so next time Settings is clicked, it opens
  useEffect(() => {
    if (!isSettingsRoute) {
      setSettingsCollapsed(false);
    }
  }, [isSettingsRoute]);

  // secondarySections is displayed ONLY when on settings AND not manually collapsed.
  // For all other menu items, it remains hidden.
  const isSecondaryOpen = isSettingsRoute && !settingsCollapsed;
  const secondaryCollapsed = !isSecondaryOpen;

  const handleMobileDrawerToggle = () => {
    setMobileOpen(prev => !prev);
  };

  const handleMobileDrawerClose = () => {
    setMobileOpen(false);
  };

  const handleToggleSecondary = () => {
    setSettingsCollapsed(prev => !prev);
  };

  const handleOpenSettings = () => {
    // When the user clicks Settings, automatically open and display secondarySections
    setSettingsCollapsed(false);
  };

  const handleOtherItemClick = () => {
    // For all other menu items, secondarySections remains hidden
    setSettingsCollapsed(false);
  };

  const effectiveSidebarWidth = secondaryCollapsed ? PRIMARY_RAIL_WIDTH : TOTAL_SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Two-Level Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileDrawerClose}
        secondaryCollapsed={secondaryCollapsed}
        onToggleSecondary={handleToggleSecondary}
        onOpenSettings={handleOpenSettings}
        onOtherItemClick={handleOtherItemClick}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${effectiveSidebarWidth}px)` },
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
        }}
      >
        {/* Topbar */}
        <Topbar onMobileDrawerToggle={handleMobileDrawerToggle} />

        {/* Dynamic Page Content */}
        <Container
          maxWidth="xl"
          sx={{
            flexGrow: 1,
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};
