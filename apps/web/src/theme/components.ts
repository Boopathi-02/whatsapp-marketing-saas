import { Components, Theme } from '@mui/material';
import { fontWeights, radii, sizing } from './tokens.js';

export const getComponentOverrides = (theme: Theme): Components<Omit<Theme, 'components'>> => {
  const isDark = theme.palette.mode === 'dark';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontSize: '0.875rem', lineHeight: '20px' },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: radii.control,
          minHeight: sizing.controlHeight,
          padding: '6px 16px',
          fontWeight: fontWeights.medium,
          transition: 'all 0.15s ease-in-out',
        },
        sizeSmall: { minHeight: 32, padding: '4px 12px', fontSize: '0.8125rem' },
        sizeLarge: { minHeight: sizing.controlHeightLarge, padding: '8px 20px', fontSize: '0.875rem' },
        containedPrimary: {
          boxShadow: isDark
            ? '0 4px 14px 0 rgba(20, 184, 166, 0.25)'
            : '0 4px 14px 0 rgba(20, 184, 166, 0.2)',
          '&:hover': {
            boxShadow: isDark
              ? '0 6px 20px 0 rgba(20, 184, 166, 0.35)'
              : '0 6px 20px 0 rgba(20, 184, 166, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radii.panel,
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: isDark
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: { borderRadius: radii.panel },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: isDark ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radii.chip,
          fontWeight: fontWeights.medium,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: radii.control, fontSize: '0.875rem', lineHeight: '20px' },
        input: { height: 20, padding: '8px 12px' },
        inputSizeSmall: { padding: '6px 12px' },
        multiline: { padding: '8px 12px' },
        inputMultiline: { height: 'auto', padding: 0 },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: '0.875rem', lineHeight: '20px' } },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: '0.75rem', lineHeight: '16px', marginLeft: 0, marginRight: 0 } },
    },
    MuiMenuItem: {
      styleOverrides: { root: { minHeight: 36, fontSize: '0.875rem', lineHeight: '20px' } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: radii.panel } },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: '1rem', lineHeight: '24px', fontWeight: fontWeights.semibold, padding: '16px 24px' } },
    },
    MuiTabs: {
      styleOverrides: { root: { minHeight: sizing.tabHeight } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: sizing.tabHeight,
          padding: '0 16px',
          fontSize: '0.875rem',
          lineHeight: '20px',
          fontWeight: fontWeights.medium,
          textTransform: 'none',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { padding: 8, '& .MuiSvgIcon-root': { fontSize: sizing.checkbox } },
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { overflowX: 'auto', maxWidth: '100%' } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          lineHeight: '20px',
          padding: '12px 16px',
          height: sizing.tableRowHeight,
        },
        head: {
          fontSize: '0.75rem',
          lineHeight: '16px',
          fontWeight: fontWeights.semibold,
          height: sizing.tableHeaderHeight,
          padding: '10px 16px',
        },
        sizeSmall: { padding: '8px 16px', height: sizing.tableRowHeight },
      },
    },
  };
};
