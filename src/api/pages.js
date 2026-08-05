import api from './client'

/**
 * The admin-managed content pages, and the contact form.
 *
 * Terms and Privacy are written in the admin panel with a WYSIWYG editor and
 * stored as HTML in `legal_pages`, so the app renders whatever the admin last
 * saved rather than shipping a copy that goes stale. Same source the web app
 * reads, so the two can never disagree.
 *
 * Both endpoints are public — `auth: false` — because they have to be readable
 * before anyone has an account. Sending a token would work too, but a learner
 * who is signed out must still be able to read the terms they are agreeing to.
 */

/** `slug` is `terms` or `privacy`. Returns `{ slug, title, content, updatedAt }`. */
export function legalPage(slug) {
  return api.get(`/pages/${slug}`, { auth: false })
}

/**
 * Sends a contact message.
 *
 * Rate limited to six an hour server-side, which surfaces as a 429 the form
 * shows like any other error.
 */
export function sendContactMessage({ name, email, message }) {
  return api.post('/contact', { name, email, message }, { auth: false })
}
