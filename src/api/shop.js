import api from './client'

export function catalog() {
  return api.get('/shop/catalog')
}

/**
 * Start a Stripe Checkout session for a gem pack. Returns `{ checkoutUrl }`.
 *
 * Same shape as the subscription flow: Stripe will not redirect to a custom app
 * scheme, so these must be real http URLs on the web app, and the in-app browser
 * watches for that origin and closes the moment it appears.
 *
 * Do not append `session_id` to successUrl — the backend appends Stripe's own
 * `{CHECKOUT_SESSION_ID}` placeholder, and a second copy wins the regex on the
 * way back and reads as a literal placeholder.
 */
export function checkoutGems({ packKey, successUrl, cancelUrl }) {
  return api.post('/shop/gems/checkout', { packKey, successUrl, cancelUrl })
}

/**
 * Credits the pack the instant the learner returns, without waiting for
 * Stripe's webhook — which cannot reach a phone at all. Returns
 * `{ status: 'completed' | 'already_completed' | 'not_paid' | 'not_found', gems }`
 * where `gems` is the new balance.
 */
export function verifyGemsCheckout(sessionId) {
  return api.get(`/shop/gems/verify?sessionId=${encodeURIComponent(sessionId)}`)
}

/**
 * Buy hearts with gems. No Stripe involved: this is a pure wallet transaction,
 * so it settles in one request. 422s when hearts are already full, when the
 * plan has unlimited hearts, or when the balance is short.
 */
export function refillHearts(tierKey) {
  return api.post('/shop/hearts/refill', { tierKey })
}
