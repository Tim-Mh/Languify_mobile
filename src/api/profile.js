import api from './client'

/** Renames the learner. `fullName` is the only field the endpoint accepts. */
export function updateProfile({ fullName }) {
  return api.patch('/profile', { fullName })
}

/**
 * Closes the account for good. The backend cancels any live Stripe
 * subscription, warns family members, and cascades every row the user owns, so
 * there is nothing to clean up on this side beyond signing out.
 */
export function deleteAccount() {
  return api.delete('/profile')
}
