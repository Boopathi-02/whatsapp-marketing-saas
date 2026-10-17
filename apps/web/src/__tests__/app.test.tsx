import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../app/App.js';
import { router } from '../app/router.js';

describe('Frontend Application Shell & Authentication Guarding', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    window.history.pushState({}, '', '/');
    try {
      await router.navigate('/');
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should redirect unauthenticated users to login and protect customer data', async () => {
    // Mock refresh endpoint rejecting (unauthenticated visitor)
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/auth/refresh')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { message: 'Unauthorized' } }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false }),
      });
    }) as unknown as typeof fetch;

    render(<App />);

    // Initially displays session securing progress
    expect(screen.getByText(/Securing workspace session/i)).toBeInTheDocument();

    // After session check fails, redirects to Login page
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    // Customer dashboard metrics are NOT exposed before authentication
    expect(screen.queryByText('Total Contacts')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/Create one now/i)).toBeInTheDocument();
  });

  it('should render the dashboard shell, demo notice, and primary metrics when authenticated', async () => {
    // Mock active authenticated session
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                accessToken: 'mock_jwt_access_token',
                user: {
                  id: 'mock_user_1',
                  email: 'demo@enterprise.com',
                  displayName: 'Demo User',
                  status: 'active',
                  isEmailVerified: true,
                  createdAt: new Date().toISOString(),
                },
              },
            }),
        });
      }

      if (url.includes('/api/v1/workspaces')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: [
                {
                  id: 'ws_demo_1',
                  name: 'Demo Marketing Workspace',
                  slug: 'demo-ws',
                  ownerUserId: 'mock_user_1',
                  status: 'active',
                  role: 'owner',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    }) as unknown as typeof fetch;

    render(<App />);

    // Verify authenticated user reaches Dashboard
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Marketing Dashboard/i })).toBeInTheDocument();
    });

    // Verify demo data banner isolation notice
    expect(
      screen.getByText(/Phase 1 Foundation & Interactive Demo Mode/i)
    ).toBeInTheDocument();

    // Verify key metrics exist
    expect(screen.getByText('Total Contacts')).toBeInTheDocument();
    expect(screen.getByText('Messages Sent (30d)')).toBeInTheDocument();
    expect(screen.getByText('Average Delivery Rate')).toBeInTheDocument();
    expect(screen.getByText('Active Campaigns')).toBeInTheDocument();

    // Verify quick action buttons exist
    expect(screen.getByText('Create Campaign')).toBeInTheDocument();
    expect(screen.getByText('Import Contacts')).toBeInTheDocument();
  });
});
