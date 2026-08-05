import { useCallback, useState } from 'react'
import { RefreshControl } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { colors } from '../theme'

/**
 * Pull-to-refresh, identically on every screen.
 *
 * Returns the element for a ScrollView's `refreshControl` prop rather than a
 * pair of values, because that prop takes an element and every screen would
 * otherwise hand-roll the same tinting. Screens differ only in what sits under
 * the spinner, which is what `onDark` covers: on Home it is pulled down over
 * the plum header slab, where only a white spinner is readable.
 *
 * Everything is invalidated rather than one screen's own keys. A pull is the
 * learner saying "this looks stale", and their gems, hearts and streak are on
 * nearly every screen, so refreshing a list but not the counters beside it is
 * the confusing half-measure.
 */
export function useRefresh({ onDark = false } = {}) {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries()
    } finally {
      setRefreshing(false)
    }
  }, [queryClient])

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={onDark ? colors.white : colors.primary[500]}
      colors={[onDark ? colors.white : colors.primary[500]]}
      progressBackgroundColor={onDark ? colors.secondary[600] : colors.white}
    />
  )
}

export default useRefresh
