import { TypographyOptions } from '@mui/material/styles/createTypography';
import { fontWeights } from './tokens.js';

export const fontFamily = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'sans-serif',
].join(',');

export const typography: TypographyOptions = {
  fontFamily,
  fontSize: 14,
  fontWeightRegular: fontWeights.regular,
  fontWeightMedium: fontWeights.medium,
  fontWeightBold: fontWeights.semibold,
  // Page heading
  h1: { fontWeight: fontWeights.semibold, fontSize: '1.25rem', lineHeight: '28px' },
  // Section headings
  h2: { fontWeight: fontWeights.semibold, fontSize: '1rem', lineHeight: '24px' },
  h3: { fontWeight: fontWeights.semibold, fontSize: '1rem', lineHeight: '24px' },
  h4: { fontWeight: fontWeights.semibold, fontSize: '1rem', lineHeight: '24px' },
  h5: { fontWeight: fontWeights.semibold, fontSize: '0.875rem', lineHeight: '20px' },
  h6: { fontWeight: fontWeights.semibold, fontSize: '0.875rem', lineHeight: '20px' },
  subtitle1: { fontWeight: fontWeights.medium, fontSize: '1rem', lineHeight: '24px' },
  subtitle2: { fontWeight: fontWeights.medium, fontSize: '0.875rem', lineHeight: '20px' },
  // Base text
  body1: { fontSize: '0.875rem', lineHeight: '20px', fontWeight: fontWeights.regular },
  // Secondary text / helper labels
  body2: { fontSize: '0.8125rem', lineHeight: '20px', fontWeight: fontWeights.regular },
  caption: { fontSize: '0.75rem', lineHeight: '16px', fontWeight: fontWeights.regular },
  overline: { fontSize: '0.75rem', lineHeight: '16px', fontWeight: fontWeights.medium },
  button: {
    fontWeight: fontWeights.medium,
    fontSize: '0.875rem',
    lineHeight: '20px',
    textTransform: 'none',
    letterSpacing: 0,
  },
};
