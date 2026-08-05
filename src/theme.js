/**
 * Design tokens ported verbatim from the web app's `src/index.css`, so the
 * mobile app and languify.us read as one product. Change a colour here only
 * if it also changes there.
 */

export const colors = {
  primary: {
    50: '#fdf2f9',
    100: '#fce7f5',
    200: '#f9cfe8',
    300: '#f0a8d4',
    400: '#e878bb',
    500: '#e040a0',
    600: '#c22885',
    700: '#9c1e6a',
    800: '#7a1955',
    900: '#5c1441',
  },
  secondary: {
    50: '#f5f2fa',
    100: '#ebe3f5',
    200: '#d5c5eb',
    300: '#b8a0d0',
    400: '#9878b8',
    500: '#7850a8',
    600: '#613f88',
    700: '#4d3269',
    800: '#3a264f',
    900: '#281b37',
  },
  accent: {
    50: '#eafaff',
    100: '#d3f3ff',
    200: '#a8e8ff',
    300: '#6fd6f4',
    400: '#40c0e8',
    500: '#0090c8',
    600: '#0072a0',
    700: '#045a80',
  },
  success: {
    50: '#ecfdf3',
    100: '#d1fadf',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  surface: '#fff8fc',
  surfaceMuted: '#f8d8f0',
  white: '#ffffff',
}

/** The colour behind the native splash, reused by the JS splash for a seamless handoff. */
export const SPLASH_BACKGROUND = colors.surface

/**
 * The font families, named so that one string works on both platforms.
 *
 * These are the fonts' **PostScript names**, and the files in `assets/fonts`
 * are named to match. That is not cosmetic: a bundled font is resolved by
 * filename on Android and by PostScript name on iOS, so a file called
 * `Poppins_700Bold.ttf` — which is what the Expo build loaded, by handing the
 * file to `useFonts` under a name of its choosing — renders on Android and
 * silently falls back to the system font on iOS, because the name inside that
 * file is actually `Poppins-Bold`.
 *
 * Renaming a file here means renaming the family everywhere it is used, so
 * check both halves stay in step.
 */
export const fonts = {
  /** Headings and anything that should feel like the brand. */
  display: 'Poppins-Bold',
  displaySemi: 'Poppins-SemiBold',
  displayMedium: 'Poppins-Medium',
  /** Body copy. */
  body: 'Nunito-Regular',
  bodySemi: 'Nunito-SemiBold',
  bodyBold: 'Nunito-Bold',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
}

/**
 * Duolingo-style chunky button shadow: a solid darker edge underneath rather
 * than a blur, which is what gives the web app's buttons their pressable look.
 */
export const shadows = {
  card: {
    shadowColor: colors.secondary[900],
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  lifted: {
    shadowColor: colors.secondary[900],
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
}

export default { colors, fonts, spacing, radii, shadows, SPLASH_BACKGROUND }
