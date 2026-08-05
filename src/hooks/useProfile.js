import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ads as fetchAds } from '../api/ads'
import { claimBadge } from '../api/badges'
import { league as fetchLeague } from '../api/league'
import * as profileApi from '../api/profile'
import { useAuth } from '../auth/AuthContext'
import { useNotify } from '../components/NotificationProvider'
import { useTranslate } from '../lib/i18n'
import { queryKeys } from './keys'

/** The learner's weekly league cohort, ranked. */
export function useLeague() {
  return useQuery({
    queryKey: queryKeys.league,
    queryFn: fetchLeague,
  })
}

/**
 * The admin-managed creative pools.
 *
 * Fetched well before it is needed — the lesson player asks for it on mount so
 * the interstitial never makes the learner wait on a request at the moment the
 * lesson ends.
 */
export function useAds() {
  return useQuery({
    queryKey: queryKeys.ads,
    queryFn: fetchAds,
    staleTime: 30 * 60_000,
  })
}

/** Claims an earned badge. The reward lands in gems, XP and hearts. */
export function useClaimBadge() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: (badge) => claimBadge(badge.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.gameState }),
    onError: (error) => notify.error(error.message ?? t('m_err_badge')),
  })
}

/**
 * Renames the learner.
 *
 * The name lives on the auth profile rather than in a query, so the profile has
 * to be refetched before anything on screen changes.
 */
export function useUpdateProfile() {
  const { refreshUser } = useAuth()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: (fullName) => profileApi.updateProfile({ fullName }),
    onSuccess: async () => {
      await refreshUser()
      notify.success(t('m_name_updated'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_name')),
  })
}

/**
 * Closes the account for good.
 *
 * Signs out afterwards rather than before: the request needs the token, and
 * signing out is what sends the route guards back to the intro. The backend
 * cascades everything the user owns, so there is nothing to invalidate.
 */
export function useDeleteAccount() {
  const { signOut } = useAuth()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: async () => {
      await profileApi.deleteAccount()
      await signOut()
    },
    onSuccess: () => notify.success(t('m_account_deleted')),
    onError: (error) => notify.error(error.message ?? t('m_err_delete')),
  })
}

/** Revoking the token is a network call, so it gets the same loading treatment. */
export function useLogOut() {
  const { signOut } = useAuth()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => notify.success(t('m_logged_out')),
  })
}
