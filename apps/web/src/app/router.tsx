import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout.js';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.js';
import { ContactsPage } from '../features/contacts/pages/ContactsPage.js';
import { AccountsPage } from '../features/whatsapp-accounts/pages/AccountsPage.js';
import { TemplatesPage } from '../features/templates/pages/TemplatesPage.js';
import { CampaignsPage } from '../features/campaigns/pages/CampaignsPage.js';
import { AnalyticsPage } from '../features/analytics/pages/AnalyticsPage.js';
import { BillingPage } from '../features/billing/pages/BillingPage.js';
import { SettingsPage } from '../features/settings/pages/SettingsPage.js';
import { AdminPage } from '../features/admin/pages/AdminPage.js';
import { EmptyState } from '../components/common/EmptyState.js';

export const router = createBrowserRouter([
  {
    path: '/',
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
]);
