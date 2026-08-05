import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { colors, fonts, radii } from '../theme'

/**
 * The web reveals a word's native-language meaning on hover (its `HoverHint` in
 * components/exercises/exerciseHelpers.jsx). A phone has no hover, so the same
 * dark bubble is revealed by tapping the word.
 *
 * The bubble is rendered *inside* the word it belongs to and positioned with
 * plain `bottom: '100%'`. An earlier version measured each word with
 * `measureInWindow` and drew one shared bubble in a screen overlay; that is a
 * native async call which, under the New Architecture, can return without ever
 * invoking its callback — so the bubble silently never appeared and there was
 * nothing to see in the logs. Ordinary layout cannot fail that way.
 *
 * The provider still exists, but only to hold *which* word is open, so opening
 * one closes the last. That needs no measurement.
 */
const HINT_MS = 2800

const HintContext = createContext(null)

export function HintProvider({ children }) {
  const [openId, setOpenId] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const open = useCallback((id) => {
    clearTimeout(timer.current)
    setOpenId(id)
    // Fades on its own so a stray tap does not leave a bubble sitting over the
    // next word the learner wants to read.
    if (id) timer.current = setTimeout(() => setOpenId(null), HINT_MS)
  }, [])

  const value = useMemo(() => ({ openId, open }), [openId, open])

  return <HintContext.Provider value={value}>{children}</HintContext.Provider>
}

/**
 * Wires one word to the shared "only one open" state.
 *
 * Returns whether this word's bubble is showing and a toggle for its onPress.
 * Tapping the open word closes it, which makes a mistaken tap undoable without
 * waiting out the timer.
 *
 * Works with no provider above it too — it just falls back to local state, so a
 * tile is never silently inert depending on where it is mounted.
 */
export function useHintTarget(text) {
  const context = useContext(HintContext)
  const [localOpen, setLocalOpen] = useState(false)
  // Identity for this word, stable across re-renders.
  const id = useRef({}).current

  const shared = Boolean(context)
  const open = shared ? context.openId === id : localOpen

  const toggle = useCallback(() => {
    if (!text) return
    if (shared) {
      context.open(open ? null : id)
      return
    }
    setLocalOpen((value) => !value)
  }, [text, shared, context, open, id])

  return { open: Boolean(text) && open, toggle }
}

/**
 * Render inside the pressable the hint belongs to.
 *
 * `zIndex` *and* `elevation`: Android orders overlapping siblings by elevation,
 * and without it the bubble paints underneath the tile above this one.
 *
 * The host deliberately hangs outside its parent on both sides. Pinned to the
 * parent with `left: 0; right: 0` it inherited that parent's width — and the
 * parent is a word tile, often narrower than the word it is glossing. The
 * bubble's `maxWidth` is a ceiling, not a floor, so the text had only ~35pt to
 * lay out in and wrapped to one character per line, which is what made a hint
 * read vertically. Overhanging is safe because the whole thing is
 * `pointerEvents="none"` and nothing above it clips.
 */
const OVERHANG = 110
export default function HintBubble({ text, visible }) {
  if (!text || !visible) return null

  return (
    <View pointerEvents="none" style={styles.host}>
      <View style={styles.bubble}>
        <Text style={styles.text} numberOfLines={3}>
          {text}
        </Text>
      </View>
      <View style={styles.tail} />
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    bottom: '100%',
    // Wider than the word it belongs to, so the gloss has room to lay out as a
    // line of text. Centred on the tile, so it still visibly points at it.
    left: -OVERHANG,
    right: -OVERHANG,
    alignItems: 'center',
    paddingBottom: 5,
    zIndex: 50,
    elevation: 24,
  },
  bubble: {
    // Comfortably inside the host's own width, so the bubble is sized by its
    // text rather than by whatever the tile underneath happens to be.
    maxWidth: 2 * OVERHANG,
    backgroundColor: colors.secondary[900],
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.white,
    textAlign: 'center',
  },
  // A rotated square rather than a border triangle, which cannot be coloured
  // independently of the box on Android.
  tail: {
    width: 10,
    height: 10,
    marginTop: -5,
    borderRadius: 2,
    backgroundColor: colors.secondary[900],
    transform: [{ rotate: '45deg' }],
  },
})
