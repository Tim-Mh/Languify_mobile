import { useQuery } from '@tanstack/react-query'

import * as gameApi from '../api/game'
import { queryKeys } from './keys'

/**
 * The learner's wallet and progress: gems, hearts, streak, XP, earned badges.
 *
 * Read on nearly every screen, so it is deliberately one shared query rather
 * than a fetch per screen — mounting it a second time is a cache hit, not a
 * second request.
 */
export function useGameState() {
  return useQuery({
    queryKey: queryKeys.gameState,
    queryFn: gameApi.gameState,
  })
}

/**
 * The chapters of the active course.
 *
 * `enabled` matters here: the endpoint 422s when no course has been picked yet,
 * which is the normal state for a brand-new account rather than an error worth
 * retrying, so the request is simply not made.
 */
export function useChapters({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.chapters,
    queryFn: gameApi.chapters,
    retry: false,
    enabled,
  })
}

/** One month of the streak calendar. */
export function useActivityCalendar({ year, month }) {
  return useQuery({
    queryKey: queryKeys.activity(year, month),
    queryFn: () => gameApi.activityCalendar({ year, month }),
  })
}
