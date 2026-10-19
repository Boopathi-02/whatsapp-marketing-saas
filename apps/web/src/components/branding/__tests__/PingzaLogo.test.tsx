import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PingzaLogo, PingzaIconSvg } from '../PingzaLogo.js';

describe('PingzaLogo Component', () => {
  const theme = createTheme({ palette: { mode: 'light' } });

  it('renders the full logo with Pingza wordmark by default', () => {
    render(
      <ThemeProvider theme={theme}>
        <PingzaLogo />
      </ThemeProvider>
    );

    expect(screen.getByText('Ping')).toBeInTheDocument();
    expect(screen.getByText('za')).toBeInTheDocument();
  });

  it('renders with custom subtitle when showSubtitle is enabled', () => {
    render(
      <ThemeProvider theme={theme}>
        <PingzaLogo showSubtitle subtitle="WhatsApp Marketing Platform" />
      </ThemeProvider>
    );

    expect(screen.getByText('Ping')).toBeInTheDocument();
    expect(screen.getByText('za')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Marketing Platform')).toBeInTheDocument();
  });

  it('renders the icon-only variant with appropriate accessibility label', () => {
    render(
      <ThemeProvider theme={theme}>
        <PingzaLogo variant="icon" />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Pingza')).toBeInTheDocument();
    expect(screen.queryByText('Ping')).not.toBeInTheDocument();
  });

  it('renders monochrome variant without error', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <PingzaLogo mode="monochrome" />
      </ThemeProvider>
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders standalone PingzaIconSvg in both dark and light modes', () => {
    const { rerender, container } = render(<PingzaIconSvg size={48} isDark={false} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '48');

    rerender(<PingzaIconSvg size={32} isDark={true} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '32');
  });
});
