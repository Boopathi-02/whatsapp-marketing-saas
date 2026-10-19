import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
