import api from './client'

export function gameState() {
  return api.get('/game-state').then((data) => data.gameState)
}

export function chapters() {
  return api.get('/course/chapters').then((data) => data.chapters ?? [])
}

export function myCourses() {
  return api.get('/courses/mine')
}

export function todaysQuests() {
  return api.get('/quests/today')
}

/**
 * Which days of a month the learner practised, for the streak calendar.
 * `month` is 1-12. Days come back as day-of-month integers, computed in the
 * user's own timezone rather than the server's.
 */
export function activityCalendar({ year, month }) {
  return api.get(`/game-state/activity?year=${year}&month=${month}`)
}
