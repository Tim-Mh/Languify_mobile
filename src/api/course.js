import api from './client'

export function languages() {
  return api.get('/languages').then((data) => data.languages ?? [])
}

export function selectCourse({ nativeLanguageId, learningLanguageId }) {
  return api.post('/course/select', { nativeLanguageId, learningLanguageId })
}

/** One of 'beginner' | 'some_knowledge' | 'conversational'. */
export function selectProficiency(proficiencyLevel) {
  return api.post('/course/proficiency', { proficiencyLevel })
}

/** One of 10 | 20 | 30 | 40 | 50. */
export function selectStreakGoal(streakGoalDays) {
  return api.post('/course/streak-goal', { streakGoalDays })
}

/**
 * The letters of the language being learned, with the language itself so the
 * screen can title itself and pick a speech locale.
 *
 * 422s when no course has been chosen yet, which is a normal state rather than
 * an error worth retrying.
 */
export function alphabet() {
  return api.get('/course/alphabet')
}
