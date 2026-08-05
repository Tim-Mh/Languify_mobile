import { useEffect, useState } from 'react'

/**
 * How long a request may run before we admit it is slow. Short enough that the
 * user feels acknowledged, long enough that a normal request never trips it.
 */
export const SLOW_AFTER_MS = 6000

/**
 * True once `pending` has been true continuously for `delay`.
 *
 * The point is to say something after a wait that has clearly stopped being
 * normal, rather than leaving a skeleton pulsing forever with no explanation.
 * Resets as soon as the request settles, so a fast retry does not inherit the
 * previous attempt's warning.
 */
export function useSlowRequest(pending, delay = SLOW_AFTER_MS) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!pending) {
      setSlow(false)
      return undefined
    }

    const timer = setTimeout(() => setSlow(true), delay)
    return () => clearTimeout(timer)
  }, [pending, delay])

  return slow
}
