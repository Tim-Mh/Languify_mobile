import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as avatarApi from '../api/avatar'
import { useNotify } from '../components/NotificationProvider'
import { useTranslate } from '../lib/i18n'
import { invalidateAll, queryKeys } from './keys'

/**
 * The learner's saved DiceBear config.
 *
 * Deliberately no `staleTime`: the editor invalidates this on save, and a long
 * one would let the profile keep drawing the old face afterwards.
 */
export function useAvatar() {
  return useQuery({
    queryKey: queryKeys.avatar,
    queryFn: avatarApi.myAvatar,
  })
}

/** The gem-purchasable option catalogue, grouped by attribute. */
export function useAvatarOptions() {
  return useQuery({
    queryKey: queryKeys.avatarOptions,
    queryFn: avatarApi.avatarOptions,
  })
}

export function useSaveAvatar() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: avatarApi.saveAvatar,
    onSuccess: async (saved) => {
      // Seeded so the profile draws the new face at once, then refetched so the
      // two can never disagree — the profile keeps this query mounted the whole
      // time, and a face that silently stays stale is the one bug nobody
      // reports as a caching problem.
      queryClient.setQueryData(queryKeys.avatar, saved ?? null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.avatar })
      notify.success(t('m_avatar_saved'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_avatar')),
  })
}

/** Spends gems to unlock one option permanently. */
export function useUnlockAvatarOption() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: avatarApi.unlockAvatarOption,
    onSuccess: async () => {
      // The gems are spent and the option is now wearable, so both the wallet
      // and the catalogue are stale.
      await invalidateAll(queryClient, [queryKeys.gameState, queryKeys.avatarOptions])
      notify.success(t('m_avatar_unlocked'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_unlock')),
  })
}
