import { PaletteMode, PaletteOptions } from '@mui/material';

export const getPalette = (mode: PaletteMode): PaletteOptions => ({
  mode,
  primary: {
    main: '#10B981', // Emerald WhatsApp-inspired accent
    light: '#34D399',
    dark: '#059669',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#6366F1', // Indigo
    light: '#818CF8',
    dark: '#4F46E5',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#0EA5E9',
    light: '#38BDF8',
    dark: '#0284C7',
  },
  success: {
    main: '#22C55E',
    light: '#4ADE80',
    dark: '#16A34A',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
  },
  background: {
    default: mode === 'dark' ? '#0B0F17' : '#F8FAFC',
    paper: mode === 'dark' ? '#111827' : '#FFFFFF',
  },
  text: {
    primary: mode === 'dark' ? '#F9FAFB' : '#0F172A',
    secondary: mode === 'dark' ? '#9CA3AF' : '#64748B',
  },
  divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
});
