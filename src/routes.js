/**
 * Where the intro lets out.
 *
 * There is no persisted "seen the intro" flag on purpose: until someone has an
 * account, the intro is still the right first screen, so every launch runs
 * splash then onboarding. Being signed in is the only thing that skips it.
 */
export const AFTER_ONBOARDING = '/(auth)/register'

/** For the learner who already has an account and just needs to log in. */
export const HAS_ACCOUNT = '/(auth)/login'

/** Where an unauthenticated request for a signed-in screen gets sent. */
export const UNAUTHENTICATED = '/onboarding'
