import api from './client'

export function status() {
  return api.get('/subscription/status')
}

/**
 * Stripe needs somewhere to send the browser back to. Those must be real http
 * URLs (Stripe rejects a custom scheme), so we hand it the web app's own
 * return pages and detect the redirect on our side instead.
 *
 * Do not append `session_id` to successUrl: the backend adds Stripe's
 * `{CHECKOUT_SESSION_ID}` placeholder itself, and a second copy would win the
 * regex on the way back and read as a literal placeholder.
 */
export function checkoutSubscription({ planKey, successUrl, cancelUrl }) {
  return api.post('/shop/subscription/checkout', { planKey, successUrl, cancelUrl })
}

export function verifyCheckout(sessionId) {
  return api.get(`/subscription/verify?sessionId=${encodeURIComponent(sessionId)}`)
}

export function setAutoRenew(enabled) {
  return api.post('/subscription/auto-renew', { enabled })
}

/** One-way by design: there is no resume endpoint. */
export function cancelSubscription() {
  return api.post('/subscription/cancel')
}
