import messaging from '@react-native-firebase/messaging'
import notifee from '@notifee/react-native'

import { CHANNELS, messageContent } from './push'

/**
 * What happens to a push that arrives while the app is not in the foreground.
 *
 * Registered from `index.js`, at module scope and outside React, because
 * Firebase requires the handler to be in place before the JS bundle finishes
 * evaluating — a message can be delivered to a headless task with no component
 * tree at all, and a handler registered inside a component would not exist yet.
 *
 * A message sent with a `notification` block is drawn by the system itself and
 * never reaches here, so this only has to deal with data-only messages. Those
 * are displayed explicitly, because a data-only message that is not displayed
 * is simply never seen.
 *
 * The channel comes from the payload and falls back to `default`, matching the
 * contract described in `push.js`. Asking for a channel that was never created
 * would drop the notification silently on Android, so an unknown id is mapped
 * back to one that exists rather than passed through.
 */
const CHANNEL_IDS = CHANNELS.map((channel) => channel.id)

function channelFor(message) {
  const requested = message?.data?.channelId

  return CHANNEL_IDS.includes(requested) ? requested : 'default'
}

messaging().setBackgroundMessageHandler(async (message) => {
  const { title, body } = messageContent(message)

  // Nothing to show. A data-only message with no text is a signal to the app
  // rather than something for the learner to read.
  if (!body) return

  await notifee.displayNotification({
    title: title ?? undefined,
    body,
    // Carried through so a tap can still route: this is the same `data` the
    // foreground and cold-start handlers read `url` off.
    data: message?.data ?? {},
    android: {
      channelId: channelFor(message),
      smallIcon: 'ic_notification',
      color: '#e040a0',
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  })
})
