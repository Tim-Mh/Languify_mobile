import { StyleSheet } from 'react-native'

import { colors, radii, shadows, spacing } from '../theme'

/**
 * The layout patterns that repeat across screens, as one shared sheet.
 *
 * Colours, spacing, radii and shadows all come from `theme.js` — this file
 * composes those tokens into the shapes the app actually draws and never
 * hardcodes a value of its own. Change a brand colour in the theme and it
 * changes here too.
 *
 * Screens still keep their own `StyleSheet.create` for anything specific to
 * them. This is for the shapes that would otherwise be retyped: the screen
 * wrapper, a card, a row, a divider.
 */
export const common = StyleSheet.create({
  /** The app surface, behind everything. */
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  /** The surface used behind the signed-in tabs, which sits a shade cooler. */
  screenMuted: {
    flex: 1,
    backgroundColor: colors.secondary[50],
  },
  /** Standard page padding for a scroll container that owns its own gutter. */
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  /** Centres a single block of content, e.g. an empty state. */
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },

  /** The default white card. */
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  /** A card that should sit forward of the others. */
  cardLifted: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.lifted,
  },
  /** A card outlined rather than filled, for a secondary grouping. */
  cardOutlined: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.secondary[100],
    padding: spacing.md,
  },

  /** Label on the left, value on the right. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  /** Fills the free space in a row so the next child is pushed to the end. */
  spacer: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.secondary[100],
  },

  /** A rounded counter chip: gems, hearts, streak. */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[50],
  },
  /** A circular icon slot, sized to sit next to a line of body copy. */
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[100],
  },

  /** The pressed state used on anything tappable that is not a Button. */
  pressed: {
    opacity: 0.6,
  },
  /** Covers the parent, e.g. a loading veil over a card. */
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
})

export default common
