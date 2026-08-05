import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging'
import notifee from '@notifee/react-native'

import { displayPush } from './push'

/**
 * What happens to a push that arrives, or is tapped, while the app is not in the
 * foreground.
 *
 * Registered from `index.js`, at module scope and outside React, because both
 * handlers have to be in place before the JS bundle finishes evaluating — a
 * message can be delivered to a headless task with no component tree at all, and
 * a handler registered inside a component would not exist yet.
 */

/**
 * On Android a message carrying a `notification` block is drawn by the system
 * itself and never reaches here, which is why a backgrounded push already lands
 * in the tray and stays there. This exists for data-only messages, which nobody
 * draws by default and which would otherwise arrive and be seen by no one.
 *
 * Display goes through the same `displayPush` the foreground handler uses, so a
 * notification looks and behaves identically however it arrived.
 */
setBackgroundMessageHandler(getMessaging(), async (message) => {
  await displayPush(message)
})

/**
 * Notifee requires a background event handler to exist wherever notifications
 * are displayed, and warns at runtime when one is missing.
 *
 * There is deliberately nothing to do in it. A press carries
 * `launchActivity: 'default'`, so Android brings the app up and the notification
 * is then waiting in `notifee.getInitialNotification()`, which `PushProvider`
 * reads once auth has resolved. Routing from here instead would fire before the
 * navigator exists and be swallowed.
 */
notifee.onBackgroundEvent(async () => {})
