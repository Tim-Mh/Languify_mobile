import api from './client'

export function chestStatus() {
  return api.get('/chests/status')
}

/**
 * Opens today's chest and returns the reward itself — `{ gems, xp, hearts }`.
 *
 * The endpoint wraps it as `{ reward: {...} }`, unlike the quest claim beside
 * it which returns the reward flat. Unwrapping here rather than at the call
 * site is what stops the celebration reading `result.gems` off the envelope and
 * congratulating the learner on winning zero gems.
 */
export function claimDailyChest() {
  return api.post('/chests/daily/claim').then((data) => data?.reward ?? data)
}

export function todaysQuests() {
  return api.get('/quests/today').then((data) => data.quests ?? [])
}

export function claimQuest(userDailyQuestId) {
  return api.post(`/quests/${userDailyQuestId}/claim`)
}

export function triviaTopics() {
  return api.get('/trivia/topics')
}

export function triviaQuestions(topicKey) {
  return api.get(`/trivia/topics/${topicKey}/questions`).then((data) => data.questions ?? [])
}

/**
 * Grades one answer without ending the round. The correct index is never sent
 * to the client up front, so this is the only way to give feedback per question.
 */
export function checkTriviaAnswer(topicKey, questionId, selectedIndex) {
  return api.post(`/trivia/topics/${topicKey}/questions/${questionId}/check`, { selectedIndex })
}

/**
 * Ends the round and awards gems/XP. Rate limited server-side, because this is
 * the endpoint that hands out rewards.
 */
export function submitTrivia(topicKey, answers) {
  return api.post(`/trivia/topics/${topicKey}/submit`, { answers })
}
