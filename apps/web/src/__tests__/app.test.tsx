import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../app/App.js';

describe('Frontend Application Shell', () => {
  it('should render the dashboard shell, demo notice, and primary metrics without crashing', async () => {
    render(<App />);

    // Verify main page title
    expect(screen.getByRole('heading', { name: /Marketing Dashboard/i })).toBeInTheDocument();

    // Verify demo data banner isolation warning
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
