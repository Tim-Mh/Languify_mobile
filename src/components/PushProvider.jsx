import { useCallback, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging'
import { useRouter } from '@/navigation'

import { registerDevice } from '../api/push'
import { useAuth } from '../auth/AuthContext'
import { messageContent, register as registerForPush, targetRoute } from '../lib/push'
import { useNotify } from './NotificationProvider'

/**
 * Connects remote push to the running app: enrols the device once the learner is
 * signed in, turns a push that arrives in the foreground into the app's own
 * toast, and routes a tapped one to the screen it promised.
 *
 * Renders nothing. It sits inside both AuthProvider (it needs to know when
 * there is a session to attach the token to) and NotificationProvider (it
 * borrows the toast), and does its work through effects.
 */
export function PushProvider({ children }) {
  const router = useRouter()
  const notify = useNotify()
  const { isSignedIn, ready } = useAuth()

  /**
   * Whether this session has already enrolled. Enrolment involves a permission
   * prompt and a network call, and the effect below re-runs on any auth change,
   * so without this a profile refresh could re-prompt.
   */
  const enrolled = useRef(false)

  /**
   * A notification that launched the app from cold is still the "last response"
   * on every later mount, so it is read exactly once.
   */
  const handledColdStart = useRef(false)

  /**
   * Permission, token, and handing it to the backend, as one unit. Through a
   * mutation rather than a bare call so a failure lands somewhere the rest of
   * the app can see, per the project's read-with-useQuery/write-with-useMutation
   * rule.
   */
  const enroll = useMutation({
    mutationFn: async () => {
      const device = await registerForPush()

      // No token is the normal outcome in Expo Go, on an emulator, or when the
      // learner declines. None of those are errors worth surfacing.
      if (!device) return null

      await registerDevice(device)

      return device
    },
  })

  const { mutate: startEnrolment } = enroll

  useEffect(() => {
    if (!ready || !isSignedIn || enrolled.current) return

    enrolled.current = true
    startEnrolment()
  }, [ready, isSignedIn, startEnrolment])

  // Signing out has to clear this, or signing back in on the same launch would
  // skip enrolment and leave the new account with no device attached.
  useEffect(() => {
    if (!isSignedIn) enrolled.current = false
  }, [isSignedIn])

  /**
   * Sends the learner where a tapped notification said to go.
   *
   * Guarded on being signed in because every deep-link target is behind auth: a
   * tap on a stale notification after signing out would otherwise land on a
   * guarded screen and bounce straight back to the intro.
   */
  const openTarget = useCallback(
    (message) => {
      if (!isSignedIn) return

      const route = targetRoute(message)

      if (route) router.push(route)
    },
    [isSignedIn, router],
  )

  // Arrived while the app is open. Firebase does not draw anything itself for a
  // foreground message, which is exactly what we want: a banner dropping over
  // the app mid-lesson, for something the learner can already see happening,
  // reads as broken. The app's own toast is shown instead, so a push matches
  // every other in-app message rather than pasting a system banner over the UI.
  useEffect(() => {
    return onMessage(getMessaging(), (message) => {
      const { title, body } = messageContent(message)

      if (body) notify.info(body, { title: title ?? undefined })
    })
  }, [notify])

  // Tapped while the app was backgrounded but still running.
  useEffect(() => {
    return onNotificationOpenedApp(getMessaging(), openTarget)
  }, [openTarget])

  // Tapped while the app was closed. The message is waiting rather than
  // delivered to the listener above, so it is collected once auth has resolved —
  // any earlier and the router is still on its way to deciding the first screen,
  // and this push would be overwritten by that decision.
  useEffect(() => {
    if (!ready || !isSignedIn || handledColdStart.current) return

    handledColdStart.current = true

    getInitialNotification(getMessaging())
      .then((message) => {
        if (message) openTarget(message)
      })
      .catch(() => {
        // Nothing launched the app, or Firebase is not configured in this
        // build. Either way there is no route to open.
      })
  }, [ready, isSignedIn, openTarget])

  return children
}
