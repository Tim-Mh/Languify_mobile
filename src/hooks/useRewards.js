import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as rewardsApi from '../api/rewards'
import { useNotify } from '../components/NotificationProvider'
import { useTranslate } from '../lib/i18n'
import { invalidateAll, queryKeys } from './keys'

export function useChestStatus() {
  return useQuery({
    queryKey: queryKeys.chestStatus,
    queryFn: rewardsApi.chestStatus,
  })
}

export function useTodaysQuests() {
  return useQuery({
    queryKey: queryKeys.questsToday,
    queryFn: rewardsApi.todaysQuests,
  })
}

/** Opens today's chest. Resolves to the reward itself, not the envelope. */
export function useClaimDailyChest() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: rewardsApi.claimDailyChest,
    // Both the chest's own cooldown and the wallet moved.
    onSuccess: () => invalidateAll(queryClient, [queryKeys.chestStatus, queryKeys.gameState]),
    onError: (error) => notify.error(error.message ?? t('m_err_chest')),
  })
}

export function useClaimQuest() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: rewardsApi.claimQuest,
    onSuccess: () => invalidateAll(queryClient, [queryKeys.questsToday, queryKeys.gameState]),
    onError: (error) => notify.error(error.message ?? t('m_err_collect')),
  })
}

export function useTriviaTopics() {
  return useQuery({
    queryKey: queryKeys.triviaTopics,
    queryFn: rewardsApi.triviaTopics,
  })
}

/**
 * The questions of one trivia round.
 *
 * Never refetched mid-round, for the same reason a lesson's exercises are not:
 * the answer the learner is looking at must not change under them.
 */
export function useTriviaQuestions(topicKey) {
  return useQuery({
    queryKey: queryKeys.triviaQuestions(topicKey),
    queryFn: () => rewardsApi.triviaQuestions(topicKey),
    enabled: Boolean(topicKey),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

/**
 * Grades one answer server-side.
 *
 * The correct index is deliberately never sent to the client with the
 * questions, which is why this is a request rather than a comparison.
 */
export function useCheckTriviaAnswer(topicKey) {
  return useMutation({
    mutationFn: ({ questionId, selectedIndex }) =>
      rewardsApi.checkTriviaAnswer(topicKey, questionId, selectedIndex),
  })
}

export function useSubmitTrivia(topicKey) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (answers) => rewardsApi.submitTrivia(topicKey, answers),
    onSuccess: () => invalidateAll(queryClient, [queryKeys.gameState, queryKeys.questsToday]),
  })
}
