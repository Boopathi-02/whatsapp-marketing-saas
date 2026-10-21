import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../layouts/Sidebar.js';
import { ThemeModeProvider } from '../hooks/useThemeMode.js';

describe('Sidebar Navigation Component', () => {
  it('should render all 9 required navigation routes and dev placeholder badge', () => {
    render(
      <MemoryRouter>
        <ThemeModeProvider>
          <Sidebar mobileOpen={false} onMobileClose={() => { }} />
        </ThemeModeProvider>
      </MemoryRouter>
    );

    // Verify all 8 customer-facing routes exist
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contacts').length).toBeGreaterThan(0);
    expect(screen.getAllByText('WhatsApp Accounts').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Live Inbox').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Message Templates').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Campaigns').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Billing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);

    // Verify the Super Admin section is clearly segregated with dev placeholder indicators
    expect(screen.getAllByText('Super Admin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEV ONLY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('System Administration').length).toBeGreaterThan(0);

    // Verify Pingza brand logo and subtitle are displayed
    expect(screen.getAllByText('Ping').length).toBeGreaterThan(0);
    expect(screen.getAllByText('za').length).toBeGreaterThan(0);
    expect(screen.getAllByText('WhatsApp Marketing').length).toBeGreaterThan(0);
  });

  it('should render icon-only logo in collapsed sidebar state', () => {
    render(
      <MemoryRouter>
        <ThemeModeProvider>
          <Sidebar mobileOpen={false} onMobileClose={() => { }} collapsed={true} />
        </ThemeModeProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByLabelText('Pingza Home').length).toBeGreaterThan(0);
  });

  it('should trigger onOpenSettings when Settings rail icon is clicked', () => {
    const handleOpenSettings = vi.fn();
    render(
      <MemoryRouter initialEntries={['/contacts']}>
        <ThemeModeProvider>
          <Sidebar
            mobileOpen={false}
            onMobileClose={() => {}}
            secondaryCollapsed={true}
            onOpenSettings={handleOpenSettings}
          />
        </ThemeModeProvider>
      </MemoryRouter>
    );

    const settingsBtn = screen.getAllByLabelText('Settings')[0];
    fireEvent.click(settingsBtn);
    expect(handleOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('should trigger onOtherItemClick when non-settings rail icon is clicked', () => {
    const handleOtherItemClick = vi.fn();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ThemeModeProvider>
          <Sidebar
            mobileOpen={false}
            onMobileClose={() => {}}
            secondaryCollapsed={false}
            onOtherItemClick={handleOtherItemClick}
          />
        </ThemeModeProvider>
      </MemoryRouter>
    );

    const contactsBtn = screen.getAllByLabelText('Contacts')[0];
    fireEvent.click(contactsBtn);
    expect(handleOtherItemClick).toHaveBeenCalledTimes(1);
  });
});

