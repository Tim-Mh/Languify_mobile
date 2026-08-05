/**
 * A one-listener channel for "the server rejected our token".
 *
 * The API client lives outside React, so it cannot navigate or sign anyone out
 * itself. It reports the 401 here and AuthProvider, which can do both, listens.
 *
 * Deliberately a single listener rather than a set: there is exactly one thing
 * that should react to session expiry, and allowing several invites two of them
 * to both try to sign out and route.
 */
let listener = null

export function onSessionExpired(handler) {
  listener = handler
  return () => {
    if (listener === handler) listener = null
  }
}

/**
 * Called by the API client on any 401 from an authenticated request.
 *
 * Ignored when nothing is listening, which is the case during the very first
 * token check on launch. AuthProvider handles that one itself, and a toast
 * saying "your session expired" would be wrong for someone who was never signed
 * in on this device.
 */
export function reportSessionExpired() {
  listener?.()
}
