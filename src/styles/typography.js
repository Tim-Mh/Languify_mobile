import { StyleSheet } from 'react-native'

import { colors, fonts } from '../theme'

/**
 * The type ramp, as ready-made text styles.
 *
 * Every entry pairs a family from `theme.fonts` with a colour from
 * `theme.colors` — nothing here invents a value. Poppins carries headings and
 * anything that should feel like the brand; Nunito carries body copy, which is
 * the split the web app uses, so a heading reads the same on both products.
 *
 * Sizes are unscaled on purpose. A screen that needs to adapt multiplies
 * through `useLayout().size()`, which clamps against the reference width, and
 * baking that in here would apply it twice.
 */
export const typography = StyleSheet.create({
  /** Screen titles. One per screen, at the top. */
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.secondary[800],
  },
  /** Section headings within a screen. */
  heading: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
    color: colors.secondary[800],
  },
  /** Card titles and other small headings. */
  subheading: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.secondary[700],
  },
  /** Default body copy. */
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.secondary[700],
  },
  /** Body copy that needs a little more weight, e.g. a value beside a label. */
  bodyStrong: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.secondary[800],
  },
  /** Supporting copy: helper text under a field, a card's second line. */
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondary[400],
  },
  /** Small all-caps labels above a group. */
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.secondary[400],
  },
  /** Button and tab labels. */
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.white,
  },
  /** Validation messages and anything else that has gone wrong. */
  error: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.danger[600],
  },
  /** Confirmation messages. */
  success: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.success[600],
  },
  /** A tappable run of text inside a sentence. */
  link: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primary[600],
  },
  /** Counters: gems, hearts, streak days, XP. */
  numeric: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.secondary[800],
  },
})

export default typography
