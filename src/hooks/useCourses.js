import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as courseApi from '../api/course'
import * as coursesApi from '../api/courses'
import { useAuth } from '../auth/AuthContext'
import { useNotify } from '../components/NotificationProvider'
import { useTranslate } from '../lib/i18n'
import { invalidateAll, queryKeys } from './keys'

/**
 * Everything a course change has to refresh, which is EVERYTHING.
 *
 * This used to invalidate COURSE_KEYS — a hand-kept list of six. That list
 * missed the exercises, the trivia topics and questions, the daily quests, the
 * chest status, the league and the activity calendar, so switching from Arabic
 * to English left the app showing the previous course's trivia and lesson
 * content until each of those happened to refetch on its own.
 *
 * An allow-list is the wrong shape here: every new per-course query has to
 * remember to join it, and forgetting is silent. Clearing the cache outright
 * cannot go stale, and a course switch is rare enough that refetching costs
 * nothing. Screens go through QueryState, so they show their skeletons while
 * the new course loads rather than the old course's data.
 *
 * The profile still has to come last and be awaited: the active course lives on
 * it, and screens route off `user.learningLanguage`. Refetching the lists
 * without it leaves the app holding the new chapters and the old language.
 */
function useCourseRefresh() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  return async () => {
    queryClient.clear()
    await refreshUser()
  }
}

/** The catalogue of languages. Static enough to never go stale in a session. */
export function useLanguages({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.languages,
    queryFn: courseApi.languages,
    staleTime: Infinity,
    enabled,
  })
}

/** The learner's enrolments, active one first. */
export function useMyCourses() {
  return useQuery({
    queryKey: queryKeys.myCourses,
    queryFn: coursesApi.myCourses,
  })
}

/**
 * The letters of the language being learned.
 *
 * 422s when no course has been chosen, which is a normal state, so it is not
 * retried and not requested until there is a course.
 */
export function useAlphabet({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.alphabet,
    queryFn: courseApi.alphabet,
    retry: false,
    enabled,
  })
}

/** Enrols in a language pair and makes it the active course. */
export function useSelectCourse() {
  const refresh = useCourseRefresh()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: courseApi.selectCourse,
    onSuccess: refresh,
    onError: (error) => notify.error(error.message ?? t('m_err_add_course')),
  })
}

export function useSwitchCourse() {
  const refresh = useCourseRefresh()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: coursesApi.switchCourse,
    onSuccess: refresh,
    onError: (error) => notify.error(error.message ?? t('m_err_switch')),
  })
}

/** Removes an enrolment. Progress for that pair is kept server-side. */
export function useDeleteCourse() {
  const refresh = useCourseRefresh()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: coursesApi.deleteCourse,
    onSuccess: refresh,
    onError: (error) => notify.error(error.message ?? t('m_err_remove')),
  })
}

/** Setup steps. Each saves as it completes, which is what makes signup resumable. */
export function useSelectProficiency() {
  const { refreshUser } = useAuth()

  return useMutation({
    mutationFn: courseApi.selectProficiency,
    onSuccess: () => refreshUser(),
  })
}

export function useSelectStreakGoal() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  return useMutation({
    mutationFn: courseApi.selectStreakGoal,
    onSuccess: async () => {
      // Home is about to render from a cache that predates the whole of setup.
      await invalidateAll(queryClient, [queryKeys.gameState, queryKeys.chapters])
      await refreshUser()
    },
  })
}
