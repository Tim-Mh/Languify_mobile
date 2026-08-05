import api from './client'

/**
 * The signed-in learner's saved avatar config:
 * `{ skinColor, hair, hairColor, eyes, eyebrows, mouth, glasses, earrings,
 *    backgroundColor }`.
 *
 * The same shape the league endpoint embeds for every member, so one renderer
 * covers both.
 */
export function myAvatar() {
  return api.get('/avatar').then((data) => data.avatar ?? null)
}

/**
 * The full option catalog, grouped by attribute:
 * `{ skinColor: [{ value, priceGems, isDefault, unlocked }], hair: [...], ... }`.
 *
 * Every option is either the free default for its attribute or something the
 * learner has to buy with gems before they can equip it, so the editor needs
 * this alongside the saved config to know what is wearable.
 */
export function avatarOptions() {
  return api.get('/avatar/options').then((data) => data.options ?? {})
}

/** Spends gems to unlock one option permanently. */
export function unlockAvatarOption({ attributeType, value }) {
  return api.post('/avatar/unlock', { attributeType, value })
}

/**
 * Saves the chosen face. The backend rejects anything not unlocked, so this is
 * the check, not the editor's own bookkeeping.
 */
export function saveAvatar(config) {
  return api.put('/avatar', config).then((data) => data.avatar ?? null)
}
