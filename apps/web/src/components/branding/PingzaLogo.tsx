import React from 'react';
import { Box, Typography, useTheme, SxProps, Theme } from '@mui/material';

export interface PingzaLogoProps {
  /**
   * 'full': Icon + "Pingza" wordmark
   * 'icon': Geometric "P" ribbon icon only
   * 'stacked': Icon with wordmark and subtitle stacked
   */
  variant?: 'full' | 'icon' | 'stacked';
  /**
   * Theme mode override. Defaults to 'auto', which detects MUI theme.palette.mode.
   */
  mode?: 'light' | 'dark' | 'monochrome' | 'auto';
  /**
   * Size preset or numeric height in pixels. Defaults to 'medium' (36px).
   */
  size?: 'small' | 'medium' | 'large' | number;
  /**
   * Optional custom subtitle displayed under the wordmark (e.g., "Marketing Platform")
   */
  subtitle?: string;
  /**
   * Whether to display the subtitle in 'full' or 'stacked' variant
   */
  showSubtitle?: boolean;
  /**
   * Optional SX style overrides for the root Box
   */
  sx?: SxProps<Theme>;
  /**
   * Optional link destination or click handler
   */
  onClick?: () => void;
}

export const PingzaIconSvg: React.FC<{
  size: number;
  isDark?: boolean;
  isMonochrome?: boolean;
}> = ({ size, isDark = false, isMonochrome = false }) => {
  const iconId = React.useId();

  if (isMonochrome) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <g transform="translate(2, 2)">
          <path d="M10 28 L10 46 L19 37 L19 28 Z" fill="currentColor" fillOpacity="0.8" />
          <path
            d="M10 24 C10 30 14 36 22 36 C28 36 33 32 36 27 C33 30 28 32 21 32 C14 32 10 27 10 24 Z"
            fill="currentColor"
            fillOpacity="0.4"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M20 4 H30 C37.732 4 44 10.268 44 18 C44 25.732 37.732 32 30 32 H18 C13.582 32 10 28.418 10 24 V14 C10 8.477 14.477 4 20 4 Z M19 12 V24 H30 C33.314 24 36 21.314 36 18 C36 14.686 33.314 12 30 12 H19 Z"
            fill="currentColor"
          />
          <path
            d="M10 20 C10 20 14 26 22 28 C28 29.5 34 26 38 21 C35 24 29 26 22 25 C15 24 11 20 10 20 Z"
            fill="currentColor"
            fillOpacity="0.5"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient
          id={`pz-teal-${iconId}`}
          x1="10"
          y1="4"
          x2="48"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="55%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        <linearGradient
          id={`pz-navy-${iconId}`}
          x1="10"
          y1="20"
          x2="34"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={isDark ? '#3B82F6' : '#2563EB'} />
          <stop offset="60%" stopColor={isDark ? '#2563EB' : '#1D4ED8'} />
          <stop offset="100%" stopColor={isDark ? '#1D4ED8' : '#14213D'} />
        </linearGradient>

        <linearGradient
          id={`pz-tail-${iconId}`}
          x1="10"
          y1="30"
          x2="20"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={isDark ? '#2DD4BF' : '#14B8A6'} />
          <stop offset="100%" stopColor={isDark ? '#14B8A6' : '#0F766E'} />
        </linearGradient>
      </defs>

      <g transform="translate(2, 2)">
        {/* Chat message tail fold */}
        <path d="M10 28 L10 46 L19 37 L19 28 Z" fill={`url(#pz-tail-${iconId})`} />

        {/* Lower shadow fold */}
        <path
          d="M10 24 C10 30 14 36 22 36 C28 36 33 32 36 27 C33 30 28 32 21 32 C14 32 10 27 10 24 Z"
          fill={`url(#pz-navy-${iconId})`}
          fillOpacity={isDark ? 0.9 : 0.8}
        />

        {/* Main P with true transparent counter cutout */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20 4 H30 C37.732 4 44 10.268 44 18 C44 25.732 37.732 32 30 32 H18 C13.582 32 10 28.418 10 24 V14 C10 8.477 14.477 4 20 4 Z M19 12 V24 H30 C33.314 24 36 21.314 36 18 C36 14.686 33.314 12 30 12 H19 Z"
          fill={`url(#pz-teal-${iconId})`}
        />

        {/* 3D Ribbon Wrap Overlay */}
        <path
          d="M10 20 C10 20 14 26 22 28 C28 29.5 34 26 38 21 C35 24 29 26 22 25 C15 24 11 20 10 20 Z"
          fill={`url(#pz-navy-${iconId})`}
        />
      </g>
    </svg>
  );
};

export const PingzaLogo: React.FC<PingzaLogoProps> = ({
  variant = 'full',
  mode = 'auto',
  size = 'medium',
  subtitle = 'WhatsApp Marketing Platform',
  showSubtitle = false,
  sx,
  onClick,
}) => {
  const theme = useTheme();

  // Resolve active theme mode
  const isDark = mode === 'auto' ? theme.palette.mode === 'dark' : mode === 'dark';
  const isMonochrome = mode === 'monochrome';

  // Resolve numeric dimensions
  const iconPixelSize =
    typeof size === 'number'
      ? size
      : size === 'small'
        ? 28
        : size === 'large'
          ? 44
          : 36;

  const fontSize =
    typeof size === 'number'
      ? `${Math.round(size * 0.6)}px`
      : size === 'small'
        ? '1.125rem'
        : size === 'large'
          ? '1.75rem'
          : '1.375rem';

  const wordColorPing = isMonochrome
    ? 'currentColor'
    : isDark
      ? '#F8FAFC'
      : '#14213D';

  const wordColorZa = isMonochrome
    ? 'currentColor'
    : isDark
      ? '#2DD4BF'
      : '#14B8A6';

  if (variant === 'icon') {
    return (
      <Box
        component={onClick ? 'button' : 'div'}
        onClick={onClick}
        aria-label="Pingza"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: onClick ? 'pointer' : 'default',
          ...sx,
        }}
      >
        <PingzaIconSvg size={iconPixelSize} isDark={isDark} isMonochrome={isMonochrome} />
      </Box>
    );
  }

  return (
    <Box
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      aria-label="Pingza Home"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        border: 'none',
        background: 'none',
        padding: 0,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        textDecoration: 'none',
        ...sx,
      }}
    >
      <PingzaIconSvg size={iconPixelSize} isDark={isDark} isMonochrome={isMonochrome} />

      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Typography
          variant="h6"
          component="span"
          sx={{
            fontWeight: 800,
            fontSize,
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <Box component="span" sx={{ color: wordColorPing }}>
            Ping
          </Box>
          <Box component="span" sx={{ color: wordColorZa }}>
            za
          </Box>
        </Typography>

        {showSubtitle && (
          <Typography
            variant="caption"
            component="span"
            sx={{
              color: 'text.secondary',
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
              mt: 0.25,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
