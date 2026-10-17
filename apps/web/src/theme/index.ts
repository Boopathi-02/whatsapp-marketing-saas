import { createTheme, responsiveFontSizes, PaletteMode } from '@mui/material';
import { getPalette } from './palette.js';
import { typography } from './typography.js';
import { getComponentOverrides } from './components.js';

export function createAppTheme(mode: PaletteMode) {
  const baseTheme = createTheme({
    palette: getPalette(mode),
    typography,
    shape: {
      borderRadius: 10,
    },
  });

  const themeWithComponents = createTheme(baseTheme, {
    components: getComponentOverrides(baseTheme),
  });

  return responsiveFontSizes(themeWithComponents);
}
