import { PaletteMode, PaletteOptions } from '@mui/material';

export const getPalette = (mode: PaletteMode): PaletteOptions => ({
  mode,
  primary: {
    main: '#14B8A6', // Pingza Accent Teal
    light: '#2DD4BF',
    dark: '#0D9488',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#14213D', // Pingza Primary Navy
    light: '#1F2E4D',
    dark: '#0B1324',
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
    primary: mode === 'dark' ? '#F8FAFC' : '#0F172A',
    secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
  },
  divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
});
