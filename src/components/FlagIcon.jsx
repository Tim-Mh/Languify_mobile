import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

import { radii } from '../theme'

/**
 * Flags are drawn as shapes, not emoji, because Android's system font does not
 * render regional-indicator flag emoji at all: 🇩🇪 comes out as the letters
 * "DE" or as tofu. The web app draws them the same way, so the two products
 * match. Ported from Linguispath-web/src/components/FlagIcon.jsx.
 */

const STRIPE = 16 / 13

function UsFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill="#fff" />
      {Array.from({ length: 7 }, (_, i) => (
        <Rect key={i} y={i * 2 * STRIPE} width="24" height={STRIPE} fill="#B22234" />
      ))}
      <Rect width="10" height={7 * STRIPE} fill="#3C3B6E" />
    </Svg>
  )
}

function EsFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill="#AA151B" />
      <Rect y="4" width="24" height="8" fill="#F1BF00" />
    </Svg>
  )
}

function DeFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill="#FFCE00" />
      <Rect width="24" height="5.34" fill="#000" />
      <Rect y="5.33" width="24" height="5.34" fill="#D00" />
    </Svg>
  )
}

function FrFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill="#fff" />
      <Rect width="8" height="16" fill="#002395" />
      <Rect x="16" width="8" height="16" fill="#ED2939" />
    </Svg>
  )
}

function JpFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill="#fff" />
      <Circle cx="12" cy="8" r="4.6" fill="#BC002D" />
    </Svg>
  )
}

function KrFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill="#fff" />
      <Path
        d="M12 4.2 A3.8 3.8 0 0 1 12 11.8 A1.9 1.9 0 0 1 12 8 A1.9 1.9 0 0 0 12 4.2 Z"
        fill="#CD2E3A"
      />
      <Path
        d="M12 4.2 A3.8 3.8 0 0 0 12 11.8 A1.9 1.9 0 0 1 12 8 A1.9 1.9 0 0 0 12 4.2 Z"
        fill="#0047A0"
      />
      <G stroke="#000" strokeWidth="0.6">
        <Path d="M4 4.5 h3 M4 5.3 h3 M4 6.1 h3" />
        <Path d="M17 4.5 h3 M17 5.3 h3 M17 6.1 h3" />
        <Path d="M4 9.9 h1.2 M6.1 9.9 h1.9 M4 10.7 h3 M4 11.5 h1.2 M6.1 11.5 h1.9" />
        <Path d="M17 9.9 h1.2 M19.1 9.9 h1.9 M17 10.7 h3 M17 11.5 h1.2 M19.1 11.5 h1.9" />
      </G>
    </Svg>
  )
}

const FLAGS = { en: UsFlag, es: EsFlag, de: DeFlag, fr: FrFlag, ja: JpFlag, ko: KrFlag }

export default function FlagIcon({ code, emoji, width = 22, style }) {
  const Flag = FLAGS[code]
  const height = Math.round((width / 24) * 16)

  // A language we have not drawn yet still gets something; the emoji is a poor
  // fallback on Android but better than a blank space.
  if (!Flag) return <Text style={[{ fontSize: width * 0.8 }, style]}>{emoji}</Text>

  return (
    <View style={[styles.frame, { width, height }, style]}>
      <Flag />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.sm / 2,
    overflow: 'hidden',
  },
})
