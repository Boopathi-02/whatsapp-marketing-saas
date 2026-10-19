import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccountsPage } from '../features/whatsapp-accounts/pages/AccountsPage.js';
import { ContactsPage } from '../features/contacts/pages/ContactsPage.js';
import { ThemeModeProvider } from '../hooks/useThemeMode.js';

// Mock the API client
vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    downloadBlob: vi.fn(),
  },
  ApiClientError: class ApiClientError extends Error {},
}));

// Mock the AuthContext
vi.mock('../features/auth/AuthContext.js', () => ({
  useOptionalAuth: () => ({
    currentWorkspace: {
      id: 'mock-ws-123',
      name: 'Test Workspace',
      slug: 'test-workspace',
      role: 'owner',
    },
    user: {
      id: 'mock-user-123',
      email: 'test@example.com',
      displayName: 'Tester',
    },
  }),
}));

import { api } from '../lib/api.js';

describe('Phase 3 Frontend Pages (Accounts & Contacts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AccountsPage', () => {
    it('should render header, setup instructions, and empty state when no accounts exist', async () => {
      vi.mocked(api.get).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <ThemeModeProvider>
            <AccountsPage />
          </ThemeModeProvider>
        </MemoryRouter>
      );

      // Verify header and action
      expect(screen.getByText('WhatsApp Business Accounts')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Connect WhatsApp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Manual Setup/i })).toBeInTheDocument();

      // Verify Meta setup banner
      expect(
        screen.getByText('Official Meta Cloud API Setup Instructions')
      ).toBeInTheDocument();

      // Wait for empty state to appear after fetch
      await waitFor(() => {
        expect(
          screen.getByText('No WhatsApp Accounts Connected')
        ).toBeInTheDocument();
      });
    });

    it('should render account cards when accounts are returned by API', async () => {
      vi.mocked(api.get).mockResolvedValueOnce([
        {
          id: 'acc-1',
          workspaceId: 'mock-ws-123',
          wabaId: '1029384756',
          phoneNumberId: '9876543210',
          displayName: 'Customer Support Line',
          displayPhoneNumber: '+1 555-0199',
          qualityRating: 'GREEN',
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      render(
        <MemoryRouter>
          <ThemeModeProvider>
            <AccountsPage />
          </ThemeModeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Customer Support Line')).toBeInTheDocument();
        expect(screen.getByText('+1 555-0199')).toBeInTheDocument();
        expect(screen.getByText('CONNECTED')).toBeInTheDocument();
        expect(screen.getByText('Rating: GREEN')).toBeInTheDocument();
      });
    });
  });

  describe('ContactsPage', () => {
    it('should render header with Export, Import, and Add buttons, plus search and filter controls', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        contacts: [],
        pagination: {
          page: 1,
          limit: 10,
          totalContacts: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      render(
        <MemoryRouter>
          <ThemeModeProvider>
            <ContactsPage />
          </ThemeModeProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Contact Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import CSV/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Contact/i })).toBeInTheDocument();

      // Verify search input
      expect(
        screen.getByPlaceholderText('Search by phone, name, or email...')
      ).toBeInTheDocument();

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByText('No Contacts Found')).toBeInTheDocument();
      });
    });

    it('should render table rows for contacts returned by API', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        contacts: [
          {
            id: 'c-1',
            workspaceId: 'mock-ws-123',
            phoneNumber: '+14155552671',
            displayName: 'Alice Cooper',
            email: 'alice@example.com',
            tags: ['VIP'],
            source: 'manual',
            consentStatus: 'opted_in',
            consentSource: 'web_form',
            consentTimestamp: new Date().toISOString(),
            isSuppressed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          totalContacts: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      render(
        <MemoryRouter>
          <ThemeModeProvider>
            <ContactsPage />
          </ThemeModeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('+14155552671')).toBeInTheDocument();
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.getByText('Opted In')).toBeInTheDocument();
      });
    });
  });
});
