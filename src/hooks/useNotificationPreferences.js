import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as pushApi from '../api/push'
import { useNotify } from '../components/NotificationProvider'
import { useTranslate } from '../lib/i18n'
import { queryKeys } from './keys'

/**
 * The six push categories the learner can switch off, and the mutation that
 * flips one.
 *
 * These are the same six the backend enforces (App\Enums\NotificationCategory)
 * and the same six the app registers as Android channels (src/lib/push.js).
 * Adding one means touching all three.
 */
export const NOTIFICATION_CATEGORIES = [
  'reminders',
  'rewards',
  'league',
  'progress',
  'family',
  'billing',
]

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: pushApi.notificationPreferences,
  })
}

/**
 * Flips one category.
 *
 * Optimistic, because a switch that waits for a round trip before moving feels
 * broken — a toggle is the one control where the user expects the UI to lead.
 * The previous value is captured so a failed request puts the switch back
 * rather than leaving it showing a state the server never accepted.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: pushApi.updateNotificationPreferences,
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationPreferences })

      const previous = queryClient.getQueryData(queryKeys.notificationPreferences)

      queryClient.setQueryData(queryKeys.notificationPreferences, (current) =>
        current ? { preferences: { ...current.preferences, ...changes } } : current,
      )

      return { previous }
    },
    onError: (error, changes, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notificationPreferences, context.previous)
      }

      notify.error(error.message ?? t('m_notif_save_error'))
    },
    // Settles the cache on whatever the server actually stored, so an optimistic
    // value that happened to be right is still replaced by the real one.
    onSuccess: (data) => queryClient.setQueryData(queryKeys.notificationPreferences, data),
  })
}
