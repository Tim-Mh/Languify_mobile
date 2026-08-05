import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg'

import { colors, radii } from '../theme'

/**
 * The circular badge every empty/error/success state sits under.
 *
 * Line icons rather than emoji: emoji render differently on every OS version
 * (and country flags do not render on Android at all), so anything that carries
 * meaning is drawn.
 */
const TONES = {
  neutral: { bg: colors.secondary[100], stroke: colors.secondary[400] },
  danger: { bg: colors.danger[50], stroke: colors.danger[500] },
  warning: { bg: colors.warning[50], stroke: colors.warning[600] },
  success: { bg: colors.success[50], stroke: colors.success[600] },
  brand: { bg: colors.primary[50], stroke: colors.primary[500] },
}

export default function StateIcon({ name, tone = 'neutral', size = 72 }) {
  const palette = TONES[tone] ?? TONES.neutral
  const glyph = Math.round(size * 0.5)

  const line = {
    stroke: palette.stroke,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  }

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, backgroundColor: palette.bg },
      ]}
    >
      <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
        {name === 'error' ? (
          <>
            <Circle cx="12" cy="12" r="9" {...line} />
            <Line x1="12" y1="7.5" x2="12" y2="13" {...line} />
            <Line x1="12" y1="16.5" x2="12" y2="16.6" {...line} />
          </>
        ) : null}

        {name === 'offline' ? (
          <>
            {/* Wi-Fi arcs with a strike through. */}
            <Path d="M4 9.5 A13 13 0 0 1 20 9.5" {...line} />
            <Path d="M7.2 13 A8.5 8.5 0 0 1 16.8 13" {...line} />
            <Line x1="12" y1="17.8" x2="12" y2="17.9" {...line} />
            <Line x1="4" y1="20" x2="20" y2="4" {...line} />
          </>
        ) : null}

        {name === 'slow' ? (
          <>
            <Circle cx="12" cy="12" r="9" {...line} />
            <Polyline points="12,7 12,12 15.5,14" {...line} />
          </>
        ) : null}

        {name === 'empty' ? (
          <>
            {/* Magnifier over nothing. */}
            <Circle cx="10.5" cy="10.5" r="6.5" {...line} />
            <Line x1="15.5" y1="15.5" x2="20.5" y2="20.5" {...line} />
          </>
        ) : null}

        {name === 'session' ? (
          <>
            {/* Padlock. */}
            <Path d="M8 10.5 V8 a4 4 0 0 1 8 0 v2.5" {...line} />
            <Path d="M5.5 10.5 h13 v9 h-13 z" {...line} />
            <Line x1="12" y1="14" x2="12" y2="16.5" {...line} />
          </>
        ) : null}

        {name === 'success' ? <Polyline points="4,13 9.5,18.5 20,6" {...line} strokeWidth={2.6} /> : null}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
