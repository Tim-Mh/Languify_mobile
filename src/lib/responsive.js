import { useWindowDimensions } from 'react-native'

/**
 * Layout facts a screen needs to adapt itself, recomputed on rotation and on
 * foldable resize because it is built on useWindowDimensions.
 *
 * The reference width is 393pt (iPhone 14 Pro), which is what the designs were
 * laid out against. `scale` is deliberately clamped: unclamped linear scaling
 * makes type comically large on a tablet and unreadably small on a 320pt phone.
 */
const REFERENCE_WIDTH = 393

/** Phones narrower than this cannot afford full-size art and generous spacing. */
export const COMPACT_WIDTH = 360

/** Short screens (small phones, or any phone with the keyboard up) need to scroll. */
export const SHORT_HEIGHT = 700

/** Beyond this, content stops stretching and centres instead. */
export const MAX_CONTENT_WIDTH = 520

export function useLayout() {
  const { width, height } = useWindowDimensions()

  const scale = clamp(width / REFERENCE_WIDTH, 0.85, 1.15)

  return {
    width,
    height,
    scale,
    isCompact: width < COMPACT_WIDTH,
    isShort: height < SHORT_HEIGHT,
    isWide: width >= MAX_CONTENT_WIDTH,
    /** Rounds to whole pixels: fractional sizes blur borders and text. */
    size: (value) => Math.round(value * scale),
    /**
     * Centres and caps the content column so a tablet does not render one
     * enormously wide form.
     *
     * Use this on a container that owns its own horizontal padding, e.g. a
     * ScrollView's contentContainerStyle.
     */
    contentWidth: Math.min(width, MAX_CONTENT_WIDTH),
    /**
     * The same cap, for a column nested *inside* an already-padded parent.
     *
     * Percentage width plus maxWidth rather than a pixel width: a fixed
     * `contentWidth` here is measured against the parent's full width, so it
     * overflows the parent's padding and the content ends up flush against both
     * screen edges.
     */
    column: {
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: 'center',
    },
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
