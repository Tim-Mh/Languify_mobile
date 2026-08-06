import { Platform } from 'react-native'
import notifee, { AndroidImportance } from '@notifee/react-native'
import {
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging'
import DeviceInfo from 'react-native-device-info'

import { colors } from '../theme'

/**
 * Remote push: permission, the device's push token, and the Android channels
 * the token's notifications arrive on.
 *
 * Sending is entirely server-side. Nothing here schedules or composes a
 * notification; the backend delivers to the token this module hands it.
 *
 * ---
 *
 * **This is where dropping Expo changes the contract with the backend.**
 *
 * The Expo build issued an *Expo* push token (`ExponentPushToken[…]`) and the
 * backend posted it to `exp.host`, which fanned out to FCM and APNs on our
 * behalf and held both sets of credentials. There is no Expo push service in a
 * bare app, so this issues the underlying FCM registration token instead —
 * which is what Expo was wrapping all along.
 *
 * Two things on the backend have to change to match, and until they do this
 * device will register but never receive anything:
 *
 *   1. `DeviceTokenController::TOKEN_PATTERN` rejects anything that is not
 *      `ExponentPushToken[…]`, so `POST /device-tokens` currently 422s on a raw
 *      FCM token.
 *   2. `ExpoPushService` posts to `https://exp.host/--/api/v2/push/send`, which
 *      only understands Expo tokens. It needs to send through FCM's HTTP v1 API
 *      (and APNs, or FCM for both, since iOS tokens are minted by Firebase here
 *      too), using a service account key on the server rather than credentials
 *      held by Expo.
 *
 * `provider` travels with the registration so the backend can tell the two
 * kinds of token apart while both are in the table and route each one to the
 * service that understands it.
 */

/**
 * Android delivers notifications through channels, and the system settings
 * screen exposes one toggle per channel. That is per-category opt-out for free,
 * and it is what the App Store and Play Store both expect to see — a single
 * on/off switch means users disable everything to silence one annoyance.
 *
 * The `id`s are the contract with the backend: it sets the channel on the push
 * payload, and an unrecognised id silently falls back to `default`. Keep this
 * list and the backend's in step.
 *
 * No vibration on any of them. Vibration was removed from this app on request
 * (see CLAUDE.md) and a notification channel that buzzes would put it straight
 * back — Android also bakes the setting in at creation time, so changing your
 * mind later needs a new channel id, not an edit here.
 */
export const CHANNELS = [
  { id: 'default', name: 'General', importance: AndroidImportance.DEFAULT },
  { id: 'reminders', name: 'Practice reminders', importance: AndroidImportance.DEFAULT },
  { id: 'rewards', name: 'Rewards and chests', importance: AndroidImportance.DEFAULT },
  { id: 'league', name: 'Leagues', importance: AndroidImportance.LOW },
  { id: 'progress', name: 'Course progress', importance: AndroidImportance.LOW },
  { id: 'family', name: 'Family plan', importance: AndroidImportance.DEFAULT },
  { id: 'billing', name: 'Subscription and billing', importance: AndroidImportance.HIGH },
]

/**
 * Brand pink, for the small icon tint and the notification light.
 *
 * Taken from the palette rather than written out, so it cannot drift from the
 * app. Note the Android manifest carries its own copy in
 * `res/values/colors.xml` for notifications drawn by the system before any JS
 * has run; that one has to be kept in step by hand.
 */
const ACCENT = colors.primary[500]

/**
 * The token this launch was issued, kept so sign-out can tell the backend to
 * stop sending here.
 *
 * A module variable rather than component state because the code that needs it
 * is AuthContext's `signOut`, which sits above the push provider and has no
 * business subscribing to it. Cleared on sign-out so a token is never revoked
 * twice.
 */
let issuedToken = null

/** The push token issued this launch, or null if there was not one. */
export function currentPushToken() {
  return issuedToken
}

/** Called once sign-out has told the backend to forget this device. */
export function forgetPushToken() {
  issuedToken = null
}

/**
 * Creates every channel. Safe to call repeatedly — Android treats this as an
 * upsert, though it ignores changes to a channel the user has already
 * customised, which is deliberate on their part.
 *
 * Android only. The call is a no-op elsewhere but skipped anyway to keep the
 * intent clear.
 */
export async function ensureChannels() {
  if (Platform.OS !== 'android') return

  await Promise.all(
    CHANNELS.map((channel) =>
      notifee.createChannel({
        id: channel.id,
        name: channel.name,
        importance: channel.importance,
        lightColor: ACCENT,
        vibration: false,
      }),
    ),
  )
}

/**
 * Why this device cannot receive push, or null if it can.
 *
 * Separated from `register()` so the reason can be surfaced in development
 * without the caller having to interpret a bare null. The Expo Go case is gone
 * — there is no Expo Go here — and what is left is the emulator, which Google
 * and Apple will not issue a real token to.
 */
export function pushUnavailableReason() {
  if (DeviceInfo.isEmulatorSync()) {
    return 'Simulators and emulators cannot be issued a push token.'
  }
  return null
}

/**
 * Asks for permission if it has not been decided yet, and returns whether we
 * have it.
 *
 * Deliberately does not re-prompt once denied: the OS only ever shows the
 * system dialog once, so a second request resolves straight to denied and
 * achieves nothing. Changing their mind means a trip to system settings, which
 * is what the settings screen should link to.
 *
 * Notifee's request covers both platforms — the iOS alert prompt and Android
 * 13's `POST_NOTIFICATIONS` runtime permission — so there is one call here
 * rather than one per platform.
 */
export async function requestPermission() {
  const settings = await notifee.getNotificationSettings()

  // 1 is AUTHORIZED, 2 is PROVISIONAL. iOS reports provisional authorisation
  // separately, and it is still permission to deliver quietly.
  if (settings.authorizationStatus === 1 || settings.authorizationStatus === 2) return true

  // 0 is DENIED, and only -1 (NOT_DETERMINED) is still worth asking about.
  if (settings.authorizationStatus !== -1) return false

  const asked = await notifee.requestPermission()

  return asked.authorizationStatus === 1 || asked.authorizationStatus === 2
}

/**
 * The device's push token, or null if this device cannot have one.
 *
 * Returns null rather than throwing for every expected case — an emulator, a
 * user who said no. The caller's job is to register a token when there is one,
 * not to handle three flavours of "there isn't".
 *
 * @returns {Promise<{token: string, platform: string, provider: string} | null>}
 */
export async function register() {
  if (pushUnavailableReason()) return null

  await ensureChannels()

  if (!(await requestPermission())) return null

  try {
    // iOS mints an APNs token first and Firebase exchanges it for an FCM one.
    // Asking for the FCM token before that has happened returns an error rather
    // than waiting, so registration is awaited explicitly.
    if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(getMessaging())) {
      await registerDeviceForRemoteMessages(getMessaging())
    }

    const token = await getToken(getMessaging())

    if (!token) return null

    issuedToken = token

    return { token, platform: Platform.OS, provider: 'fcm' }
  } catch {
    // Network trouble, or a build whose Firebase credentials are not set up
    // yet. Not being reachable by push is never a reason to interrupt the
    // learner.
    return null
  }
}

/**
 * The screen a notification wants opened, or null if it did not say.
 *
 * The backend puts a route path in the payload's `data.url` (`/rewards`,
 * `/lesson/42`). A push that promises a chest and then drops the user on the
 * home screen is worse than no push at all, so every notification the backend
 * sends carries one.
 *
 * Both shapes are read. A Firebase message carries `data` at the top level; a
 * Notifee event wraps the same thing in `notification.data`. Accepting either
 * means the three places a tap can arrive from all hand this the object they
 * already have.
 */
export function targetRoute(message) {
  const url = message?.data?.url ?? message?.notification?.data?.url

  return typeof url === 'string' && url.startsWith('/') ? url : null
}

/**
 * Title and body, wherever the message happens to carry them.
 *
 * A message sent with a `notification` block puts them there; a data-only
 * message puts them in `data`. Every display path needs the text either way.
 */
export function messageContent(message) {
  return {
    title: message?.notification?.title ?? message?.data?.title ?? null,
    body: message?.notification?.body ?? message?.data?.body ?? null,
  }
}

/** Channel ids that actually exist, so an unknown one can be mapped back. */
const CHANNEL_IDS = CHANNELS.map((channel) => channel.id)

/**
 * The channel the payload asked for, or `default` if it named one we never
 * created. Android drops a notification posted to an unknown channel silently,
 * so this must never pass an id straight through.
 */
function channelFor(message) {
  const requested = message?.data?.channelId

  return CHANNEL_IDS.includes(requested) ? requested : 'default'
}

/**
 * Puts a notification in the system tray.
 *
 * Shared by the foreground handler and the background one so a push looks the
 * same however it arrives. It stays in the shade until the learner swipes it
 * away or taps it — that is Android's default and what we want, so no `ongoing`
 * or `autoCancel` override here. `ongoing` in particular would make it
 * undismissable, which is for downloads and calls, not reminders.
 */
export async function displayPush(message) {
  const { title, body } = messageContent(message)

  // A data-only message with no text is a signal to the app rather than
  // something for the learner to read.
  if (!body) return

  await notifee.displayNotification({
    title: title ?? undefined,
    body,
    // Carried through so a tap can still route: this is the same `data` every
    // handler reads `url` off.
    data: message?.data ?? {},
    android: {
      channelId: channelFor(message),
      smallIcon: 'ic_notification',
      color: ACCENT,
      // Reopens the app rather than doing nothing, and dismisses the
      // notification as it goes, which is what tapping one should do.
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  })
}
