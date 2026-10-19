import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout.js';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.js';
import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { RegisterPage } from '../features/auth/pages/RegisterPage.js';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage.js';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage.js';
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage.js';
import { AcceptInvitationPage } from '../features/auth/pages/AcceptInvitationPage.js';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.js';
import { ContactsPage } from '../features/contacts/pages/ContactsPage.js';
import { AccountsPage } from '../features/whatsapp-accounts/pages/AccountsPage.js';
import { ConversationsPage } from '../features/conversations/pages/ConversationsPage.js';
import { TemplatesPage } from '../features/templates/pages/TemplatesPage.js';
import { CampaignsPage } from '../features/campaigns/pages/CampaignsPage.js';
import { AnalyticsPage } from '../features/analytics/pages/AnalyticsPage.js';
import { BillingPage } from '../features/billing/pages/BillingPage.js';
import { SettingsPage } from '../features/settings/pages/SettingsPage.js';
import { TeamMembersPage } from '../features/team/pages/TeamMembersPage.js';
import { AdminPage } from '../features/admin/pages/AdminPage.js';
import { EmptyState } from '../components/common/EmptyState.js';

export const router = createBrowserRouter([
  // Public Authentication & Invitation Routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/invitations/:token',
    element: <AcceptInvitationPage />,
  },

  // Protected Customer Workspace Routes
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'contacts',
            element: <ContactsPage />,
          },
          {
            path: 'whatsapp-accounts',
            element: <AccountsPage />,
          },
          {
            path: 'conversations',
            element: <ConversationsPage />,
          },
          {
            path: 'templates',
            element: <TemplatesPage />,
          },
          {
            path: 'campaigns',
            element: <CampaignsPage />,
          },
          {
            path: 'analytics',
            element: <AnalyticsPage />,
          },
          {
            path: 'billing',
            element: <BillingPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'team',
            element: <TeamMembersPage />,
          },
          {
            path: 'admin',
            element: <AdminPage />,
          },
          {
            path: '*',
            element: (
              <EmptyState
                title="Page Not Found"
                description="The requested dashboard view does not exist or has moved."
                actionLabel="Return to Dashboard"
                onAction={() => (window.location.href = '/')}
              />
            ),
          },
        ],
      },
    ],
  },
]);
