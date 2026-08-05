import api from './client'

/**
 * Tells the backend where to reach this device.
 *
 * Called on every launch of a signed-in session rather than only when the token
 * changes: FCM can reissue a token after an app update, a restore onto a new
 * phone, or a data clear, and the client has no reliable way to notice. The
 * backend treats this as an upsert keyed on the token, so repeat calls are free.
 *
 * **`provider` is not optional.** The backend defaults a registration with no
 * provider to `expo`, because the Expo builds predate the field, and then
 * validates the token against `ExponentPushToken[...]`. Sending a raw FCM token
 * without saying so is therefore a 422, and because enrolment is fire and
 * forget the app shows nothing at all — the device simply never appears in
 * `device_tokens` and no push is ever delivered to it.
 */
export function registerDevice({ token, platform, provider }) {
  return api.post('/device-tokens', { token, platform, provider })
}

/**
 * Detaches this device's token from the account on sign-out, so the next person
 * to use the phone does not get the last person's streak reminders.
 *
 * A POST rather than a DELETE only because the API client cannot send a body on
 * DELETE, and a push token in the URL path would end up in the server's access
 * log.
 */
export function revokeDevice({ token }) {
  return api.post('/device-tokens/revoke', { token })
}

/**
 * The learner's six category toggles. Created server-side with everything on
 * the first time they are read: someone who has just granted the OS permission
 * has already said yes, and asking a second time in-app would mean nobody ever
 * receives anything.
 */
export function notificationPreferences() {
  return api.get('/notification-preferences')
}

/** Accepts a partial set, so a screen can send only the toggle that changed. */
export function updateNotificationPreferences(changes) {
  return api.patch('/notification-preferences', changes)
}
