import api from './client'

/**
 * Claim an earned badge. Returns `{ badgeKey, reward: { gems, xp, hearts } }`.
 *
 * Claiming moves gems, XP and hearts, all of which live in game state, so the
 * caller must invalidate `['game-state']` afterwards.
 */
export function claimBadge(badgeKey) {
  return api.post(`/badges/${badgeKey}/claim`)
}
