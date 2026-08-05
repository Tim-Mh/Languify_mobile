import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import * as lessonsApi from '../api/lessons'
import { invalidateAll, queryKeys } from './keys'

/** The units of one chapter. */
export function useUnits(chapterId) {
  return useQuery({
    queryKey: queryKeys.units(chapterId),
    queryFn: () => lessonsApi.units(chapterId),
    enabled: Boolean(chapterId),
  })
}

/**
 * The lessons of several units at once, one query each.
 *
 * `useQueries` rather than a loop of `useQuery`, because the number of units is
 * data-driven and hooks cannot be called in a loop whose length changes.
 */
export function useLessonsForUnits(units = []) {
  return useQueries({
    queries: units.map((unit) => ({
      queryKey: queryKeys.lessons(unit.id),
      queryFn: () => lessonsApi.lessons(unit.id),
    })),
  })
}

/**
 * The exercises of one lesson.
 *
 * A lesson is a single sitting, so this never refetches while it is open —
 * swapping the questions out from under the learner mid-round would lose their
 * place and their answer.
 */
export function useExercises(lessonId) {
  return useQuery({
    queryKey: queryKeys.exercises(lessonId),
    queryFn: () => lessonsApi.exercises(lessonId),
    enabled: Boolean(lessonId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

/**
 * Spends a heart on a wrong answer.
 *
 * Writes the server's number straight into the cache rather than decrementing
 * our copy: hearts also regenerate on a timer, so the server is the only thing
 * that knows the real count.
 */
export function useLoseHeart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: lessonsApi.loseHeart,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.gameState, (old) =>
        old ? { ...old, ...result } : old,
      )
    },
  })
}

/**
 * Banks a finished lesson. Moves XP, gems, the streak, badges and the learner's
 * position on the path, so most of the app is stale afterwards.
 */
export function useCompleteLesson(lessonId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mistakes }) => lessonsApi.completeLesson(lessonId, { mistakes }),
    onSuccess: () =>
      invalidateAll(queryClient, [
        queryKeys.gameState,
        queryKeys.chapters,
        queryKeys.lessons(),
        queryKeys.units(),
        queryKeys.questsToday,
      ]),
  })
}

/**
 * Records how one exercise went, for the adaptive practice set.
 *
 * Telemetry: the empty `onError` is deliberate, because a failed record must
 * never interrupt a lesson in progress.
 */
export function useRecordAttempt() {
  return useMutation({
    mutationFn: ({ exerciseId, correct }) => lessonsApi.recordAttempt(exerciseId, { correct }),
    onError: () => {},
  })
}
