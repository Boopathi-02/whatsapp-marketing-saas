import { createTheme, PaletteMode } from '@mui/material';
import { getPalette } from './palette.js';
import { typography } from './typography.js';
import { getComponentOverrides } from './components.js';
import { radii } from './tokens.js';

export function createAppTheme(mode: PaletteMode) {
  const baseTheme = createTheme({
    palette: getPalette(mode),
    typography,
    shape: {
      borderRadius: radii.control,
    },
  });

  // Fixed type scale (no responsiveFontSizes) so sizes match the design tokens exactly.
  return createTheme(baseTheme, {
    components: getComponentOverrides(baseTheme),
  });
}
