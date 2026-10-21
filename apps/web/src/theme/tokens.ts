/**
 * Non-color design tokens (sizing, spacing, radii). Colors live in palette.ts.
 */
export const spacingUnit = 4;

/** 4px-based scale: 4, 8, 12, 16, 24, 32 */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const sizing = {
  sidebarCollapsedWidth: 54,
  contentPaddingX: 24,
  contentPaddingXMobile: 16,
  tabHeight: 60,
  controlHeight: 36,
  controlHeightLarge: 40,
  tableHeaderHeight: 36,
  tableRowHeight: 54,
  checkbox: 16,
} as const;

export const radii = { control: 8, panel: 8, chip: 6 } as const;

export const fontWeights = { regular: 400, medium: 500, semibold: 600 } as const;
