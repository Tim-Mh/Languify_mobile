/**
 * Colours we do not own.
 *
 * Deliberately **not** in `theme.js`. Everything in the theme is a design
 * decision this app is free to change; nothing here is. A French flag is
 * #002395 because France says so, and Google's mark is four specific hues
 * because their brand guidelines require it — recolouring either to fit our
 * palette would be wrong, and worse, a future palette change must never touch
 * them.
 *
 * They live here rather than as literals scattered through components so that
 * there is still one place to look, and so a colour audit of the app can tell
 * "hardcoded by accident" apart from "fixed by someone else's brand".
 */

/**
 * National flags, for `FlagIcon`.
 *
 * Keyed by the language code the app uses, not by country, since that is what
 * the picker and the course list have in hand.
 */
export const flag = {
  en: {
    field: '#ffffff',
    stripe: '#B22234',
    canton: '#3C3B6E',
  },
  es: {
    band: '#AA151B',
    centre: '#F1BF00',
  },
  de: {
    top: '#FFCE00',
    black: '#000000',
    red: '#DD0000',
  },
  fr: {
    field: '#ffffff',
    blue: '#002395',
    red: '#ED2939',
  },
  ja: {
    field: '#ffffff',
    disc: '#BC002D',
  },
  ko: {
    field: '#ffffff',
    red: '#CD2E3A',
    blue: '#0047A0',
    trigram: '#000000',
  },
  tr: {
    field: '#E30A17',
    star: '#ffffff',
  },
  ru: {
    field: '#ffffff',
    blue: '#0039A6',
    red: '#D52B1E',
  },
  ar: {
    field: '#165D31',
    mark: '#ffffff',
  },
  az: {
    blue: '#0092BC',
    red: '#ED2939',
    green: '#3F9C35',
    mark: '#ffffff',
  },
}

/**
 * Google's four-colour "G", for the sign-in button.
 *
 * These are from Google's own branding guidelines for Sign in with Google, and
 * using the correct ones is a condition of the button being allowed to say
 * "Google" at all.
 */
export const google = {
  blue: '#4285F4',
  green: '#34A853',
  yellow: '#FBBC05',
  red: '#EA4335',
}
