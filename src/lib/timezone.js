/**
 * The device's IANA timezone, e.g. "Asia/Karachi". The backend uses it to decide
 * where one day ends and the next begins, which drives streaks, daily quests and
 * heart regeneration, so it is sent on every register and login.
 *
 * Returns null rather than guessing if the runtime cannot tell us; the backend
 * treats a missing timezone as "leave whatever you had".
 */
export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}
