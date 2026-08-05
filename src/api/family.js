import api from './client'

/**
 * The learner's relationship to a family plan. One of four shapes, keyed by
 * `role`:
 *
 * - `owner`   — `{ seatsUsed, seatsTotal, members[], pendingInvites[] }`
 * - `member`  — `{ planActive, owner: { fullName, email } }`
 * - `invited` — `{ pendingInvite: { token, ownerName } }`, surfaced so an
 *               invite can be accepted in the app when the email never arrived
 * - `none`    — nothing else
 */
export function family() {
  return api.get('/family')
}

export function inviteFamilyMember(email) {
  return api.post('/family/invite', { email })
}

export function revokeFamilyInvite(inviteId) {
  return api.delete(`/family/invites/${inviteId}`)
}

export function removeFamilyMember(memberId) {
  return api.delete(`/family/members/${memberId}`)
}

/** A member giving up their inherited perks. Never the owner. */
export function leaveFamily() {
  return api.post('/family/leave')
}

export function acceptFamilyInvite(token) {
  return api.post(`/family/invite/${token}/accept`)
}

export function declineFamilyInvite(token) {
  return api.post(`/family/invite/${token}/decline`)
}
