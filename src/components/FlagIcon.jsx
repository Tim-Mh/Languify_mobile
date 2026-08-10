import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

import { flag } from '../styles/marks'
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
      <Rect width="24" height="16" fill={flag.en.field} />
      {Array.from({ length: 7 }, (_, i) => (
        <Rect key={i} y={i * 2 * STRIPE} width="24" height={STRIPE} fill={flag.en.stripe} />
      ))}
      <Rect width="10" height={7 * STRIPE} fill={flag.en.canton} />
    </Svg>
  )
}

function EsFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.es.band} />
      <Rect y="4" width="24" height="8" fill={flag.es.centre} />
    </Svg>
  )
}

function DeFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.de.top} />
      <Rect width="24" height="5.34" fill={flag.de.black} />
      <Rect y="5.33" width="24" height="5.34" fill={flag.de.red} />
    </Svg>
  )
}

function FrFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.fr.field} />
      <Rect width="8" height="16" fill={flag.fr.blue} />
      <Rect x="16" width="8" height="16" fill={flag.fr.red} />
    </Svg>
  )
}

function JpFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.ja.field} />
      <Circle cx="12" cy="8" r="4.6" fill={flag.ja.disc} />
    </Svg>
  )
}

function KrFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.ko.field} />
      <Path
        d="M12 4.2 A3.8 3.8 0 0 1 12 11.8 A1.9 1.9 0 0 1 12 8 A1.9 1.9 0 0 0 12 4.2 Z"
        fill={flag.ko.red}
      />
      <Path
        d="M12 4.2 A3.8 3.8 0 0 0 12 11.8 A1.9 1.9 0 0 1 12 8 A1.9 1.9 0 0 0 12 4.2 Z"
        fill={flag.ko.blue}
      />
      <G stroke={flag.ko.trigram} strokeWidth="0.6">
        <Path d="M4 4.5 h3 M4 5.3 h3 M4 6.1 h3" />
        <Path d="M17 4.5 h3 M17 5.3 h3 M17 6.1 h3" />
        <Path d="M4 9.9 h1.2 M6.1 9.9 h1.9 M4 10.7 h3 M4 11.5 h1.2 M6.1 11.5 h1.9" />
        <Path d="M17 9.9 h1.2 M19.1 9.9 h1.9 M17 10.7 h3 M17 11.5 h1.2 M19.1 11.5 h1.9" />
      </G>
    </Svg>
  )
}

function TrFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.tr.field} />
      {/* The crescent is a filled disc with a smaller field-coloured disc
          punched out of it, offset to the right, as on the real flag. */}
      <Circle cx="9" cy="8" r="3.2" fill={flag.tr.star} />
      <Circle cx="10.2" cy="8" r="2.56" fill={flag.tr.field} />
      <Path d="M13.6 8 L15.9 7.26 L14.47 9.2 L14.47 6.8 L15.9 8.74 Z" fill={flag.tr.star} />
    </Svg>
  )
}

function RuFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.ru.field} />
      <Rect y="5.33" width="24" height="5.34" fill={flag.ru.blue} />
      <Rect y="10.67" width="24" height="5.33" fill={flag.ru.red} />
    </Svg>
  )
}

function SaFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.ar.field} />
      {/* A stylised band and sword rather than the shahada itself: the script
          is unreadable at 24x16 and a smudge reads worse than a clean mark. */}
      <Rect x="4" y="5.2" width="16" height="1.6" rx="0.8" fill={flag.ar.mark} />
      <Rect x="4" y="9.4" width="14" height="1" rx="0.5" fill={flag.ar.mark} />
      <Path d="M18 9.9 L21 8.4 L21 11.4 Z" fill={flag.ar.mark} />
    </Svg>
  )
}

function AzFlag() {
  return (
    <Svg viewBox="0 0 24 16" width="100%" height="100%">
      <Rect width="24" height="16" fill={flag.az.green} />
      <Rect width="24" height="5.34" fill={flag.az.blue} />
      <Rect y="5.33" width="24" height="5.34" fill={flag.az.red} />
      {/* Crescent punched out of a disc, as on the Turkish flag. */}
      <Circle cx="11" cy="8" r="2.1" fill={flag.az.mark} />
      <Circle cx="11.8" cy="8" r="1.7" fill={flag.az.red} />
      <Path d="M14.4 8 L15.9 7.5 L15 8.8 L15 7.2 L15.9 8.5 Z" fill={flag.az.mark} />
    </Svg>
  )
}

const FLAGS = { en: UsFlag, es: EsFlag, de: DeFlag, fr: FrFlag, ja: JpFlag, ko: KrFlag, tr: TrFlag, ru: RuFlag, ar: SaFlag, az: AzFlag }

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
