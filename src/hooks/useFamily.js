import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as familyApi from '../api/family'
import { useAuth } from '../auth/AuthContext'
import { useNotify } from '../components/NotificationProvider'
import { useTranslate } from '../lib/i18n'
import { invalidateAll, queryKeys } from './keys'

/** Owner, member, invited, or none — see the API module for each shape. */
export function useFamily() {
  return useQuery({
    queryKey: queryKeys.family,
    queryFn: familyApi.family,
  })
}

/**
 * Joining or leaving changes what the learner is entitled to, so the plan, the
 * heart cap and the profile's own `hasActiveAppAccess` are all stale — not just
 * this screen.
 */
function useEntitlementRefresh() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  return async () => {
    await invalidateAll(queryClient, [
      queryKeys.family,
      queryKeys.subscriptionStatus,
      queryKeys.gameState,
    ])
    await refreshUser()
  }
}

/**
 * Invites someone by email.
 *
 * No error toast on purpose: the failures here are all about the address that
 * was typed ("already on a plan", "that is you", "plan is full"), and those
 * belong inline next to the field, not in a banner at the top of the screen.
 */
export function useInviteFamilyMember() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: familyApi.inviteFamilyMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.family })
      notify.success(t('m_family_sent'))
    },
  })
}

export function useRevokeFamilyInvite() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: familyApi.revokeFamilyInvite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.family })
      notify.info(t('m_family_revoked'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_invite')),
  })
}

export function useRemoveFamilyMember() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: familyApi.removeFamilyMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.family })
      notify.info(t('m_family_removed'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_member')),
  })
}

export function useLeaveFamily() {
  const refreshEntitlements = useEntitlementRefresh()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: familyApi.leaveFamily,
    onSuccess: async () => {
      await refreshEntitlements()
      notify.info(t('m_family_left'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_leave')),
  })
}

export function useAcceptFamilyInvite() {
  const refreshEntitlements = useEntitlementRefresh()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: familyApi.acceptFamilyInvite,
    onSuccess: async () => {
      await refreshEntitlements()
      notify.success(t('m_family_joined_ok'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_accept')),
  })
}

export function useDeclineFamilyInvite() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: familyApi.declineFamilyInvite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.family })
      notify.info(t('m_family_declined'))
    },
    onError: (error) => notify.error(error.message ?? t('m_err_decline')),
  })
}
