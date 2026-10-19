import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConversationsPage } from '../features/conversations/pages/ConversationsPage.js';
import { BusinessProfileDialog } from '../features/whatsapp-accounts/components/BusinessProfileDialog.js';
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

describe('Conversations Live Inbox & Business Profile Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConversationsPage', () => {
    it('should render header, quick replies trigger, and empty state when no threads exist', async () => {
      // Mock accounts call
      vi.mocked(api.get).mockImplementation(async (url: string) => {
        if (url.includes('/whatsapp-accounts')) return [];
        if (url.includes('/quick-replies')) return [];
        if (url.includes('/conversations')) return { items: [], total: 0, page: 1, limit: 50 };
        return [];
      });

      render(
        <MemoryRouter>
          <ThemeModeProvider>
            <ConversationsPage />
          </ThemeModeProvider>
        </MemoryRouter>
      );

      // Verify page title and subtitle
      expect(screen.getByText('Live WhatsApp Inbox')).toBeInTheDocument();
      expect(
        screen.getByText(/Real-time multi-tenant WhatsApp chat threads/i)
      ).toBeInTheDocument();

      // Verify action buttons
      expect(screen.getByRole('button', { name: /Canned Quick Replies/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();

      // Verify empty state
      await waitFor(() => {
        expect(screen.getByText('No Conversations Yet')).toBeInTheDocument();
      });
    });

    it('should render list of conversations when available', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          workspaceId: 'mock-ws-123',
          contactId: 'contact-1',
          phoneNumber: '+15551234567',
          contactName: 'Alice Support',
          lastMessage: 'Where is my tracking number?',
          lastMessageTimestamp: new Date().toISOString(),
          unreadCount: 1,
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(api.get).mockImplementation(async (url: string) => {
        if (url.includes('/whatsapp-accounts')) return [];
        if (url.includes('/quick-replies')) return [];
        if (url.includes('/conversations')) return { items: mockConversations, total: 1, page: 1, limit: 50 };
        return [];
      });

      render(
        <MemoryRouter>
          <ThemeModeProvider>
            <ConversationsPage />
          </ThemeModeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Support')).toBeInTheDocument();
        expect(screen.getByText('Where is my tracking number?')).toBeInTheDocument();
      });
    });
  });

  describe('BusinessProfileDialog', () => {
    it('should render profile dialog fields with account details', async () => {
      const mockAccount = {
        id: 'acc-1',
        workspaceId: 'mock-ws-123',
        wabaId: 'waba-123',
        phoneNumberId: 'phone-123',
        displayName: 'Alpha Sales',
        displayPhoneNumber: '+15559998888',
        qualityRating: 'GREEN' as const,
        status: 'connected' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockProfile = {
        about: 'Available 24/7 for customer inquiries',
        description: 'Leading provider of enterprise communication solutions.',
        address: '100 Silicon Way, Tech City',
        email: 'sales@alpha.com',
        vertical: 'PROF_SERVICES',
        websites: ['https://alpha.com'],
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockProfile);

      render(
        <ThemeModeProvider>
          <BusinessProfileDialog
            open={true}
            onClose={() => {}}
            account={mockAccount}
            workspaceId="mock-ws-123"
          />
        </ThemeModeProvider>
      );

      expect(screen.getByText(/WhatsApp Business Profile: Alpha Sales/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Available 24/7 for customer inquiries')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100 Silicon Way, Tech City')).toBeInTheDocument();
        expect(screen.getByDisplayValue('sales@alpha.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://alpha.com')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Save Profile to Meta/i })).toBeInTheDocument();
    });
  });
});
