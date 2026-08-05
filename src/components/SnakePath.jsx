import Svg, { Path } from 'react-native-svg'

import { colors } from '../theme'

/**
 * The winding dotted trail the lesson nodes sit on, ported from the web app's
 * components/SnakePath.jsx so both products lay the path out identically.
 *
 * The x fractions are what make it snake: centre, right, centre, left, repeating.
 */
export const NODE_SPACING = 138
export const TOP_PADDING = 46
export const NODE_SIZE = 66

const X_FRACTIONS = [0.5, 0.76, 0.5, 0.24]

export function nodePosition(index) {
  return {
    xFraction: X_FRACTIONS[index % X_FRACTIONS.length],
    y: TOP_PADDING + index * NODE_SPACING,
  }
}

export function pathHeight(count) {
  return TOP_PADDING * 2 + Math.max(0, count - 1) * NODE_SPACING
}

/** True when a node leans fully to one side, which is where art can sit. */
export function nodeLean(index) {
  const x = X_FRACTIONS[index % X_FRACTIONS.length]
  if (x > 0.6) return 'right'
  if (x < 0.4) return 'left'
  return null
}

function buildCurve(points, width) {
  if (points.length < 2) return ''

  let d = `M ${points[0].xFraction * width} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const curr = points[i]
    const midY = (prev.y + curr.y) / 2
    // Two control points at the midpoint give an S-curve between nodes rather
    // than a straight diagonal.
    d += ` C ${prev.xFraction * width} ${midY}, ${curr.xFraction * width} ${midY}, ${curr.xFraction * width} ${curr.y}`
  }
  return d
}

export default function SnakePath({ count, width, color = colors.secondary[200] }) {
  if (count < 2 || !width) return null

  const points = Array.from({ length: count }, (_, i) => nodePosition(i))
  const height = pathHeight(count)

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      <Path
        d={buildCurve(points, width)}
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="2 18"
        fill="none"
      />
    </Svg>
  )
}
