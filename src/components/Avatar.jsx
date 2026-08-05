import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'

import { avatarSvg } from '../lib/avatar'
import { colors, fonts, radii } from '../theme'

/**
 * A learner's DiceBear face, the same one the web draws.
 *
 * Falls back to their initials when there is no saved config yet or the SVG
 * could not be built, so a row in the leaderboard is never an empty circle.
 */
export default function Avatar({ config, seed, name, size = 40, ring = null, style }) {
  // Regenerating this on every render would rebuild the SVG for every row of a
  // leaderboard on each scroll frame.
  const xml = useMemo(
    () => (config ? avatarSvg(config, seed ? { seed: String(seed) } : {}) : null),
    [config, seed],
  )

  const frame = [
    styles.frame,
    { width: size, height: size, borderRadius: size / 2 },
    ring ? { borderWidth: Math.max(2, Math.round(size * 0.075)), borderColor: ring } : null,
    style,
  ]

  if (!xml) {
    return (
      <View style={[...frame, styles.fallback]}>
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>
          {initials(name)}
        </Text>
      </View>
    )
  }

  return (
    <View style={frame}>
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  )
}

export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.secondary[100],
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary[300],
    borderRadius: radii.pill,
  },
  initials: {
    fontFamily: fonts.display,
    color: colors.white,
  },
})
