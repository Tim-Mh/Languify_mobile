/**
 * Where a signed-in user belongs right now.
 *
 * Setup progress is judged from the profile the API returns rather than a local
 * "I finished setup" flag, so someone who signs in on a second device, or who
 * quit halfway through, resumes on the step they actually still need. Each step
 * saves server-side as it completes, which is what makes that work.
 */

/** The one route that hosts all the setup steps as a horizontal pager. */
export const SETUP_ROUTE = '/(setup)'

/**
 * Index of the earliest unfinished step, or null when setup is done.
 * Order matches the pages in app/(setup)/index.jsx.
 *
 * The language pair counts as one step here even though it is collected over two
 * pages, because it is saved in a single request once both halves are known.
 */
export function firstIncompleteStepIndex(user) {
  if (!user) return null
  if (!user.nativeLanguage) return 0
  if (!user.learningLanguage) return 1
  if (!user.proficiencyLevel) return 2
  if (!user.streakGoalDays) return 3
  return null
}

export function needsSetup(user) {
  return firstIncompleteStepIndex(user) !== null
}

/** Where to send a user immediately after they authenticate. */
export function routeAfterAuth(user) {
  return needsSetup(user) ? SETUP_ROUTE : '/home'
}

