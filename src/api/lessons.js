import api from './client'

export function units(chapterId) {
  return api.get(`/chapters/${chapterId}/units`)
}

export function lessons(unitId) {
  return api.get(`/units/${unitId}/lessons`)
}

export function exercises(lessonId) {
  return api.get(`/lessons/${lessonId}/exercises`)
}

/** Reported the moment an answer is wrong, not batched at the end. */
export function loseHeart() {
  return api.post('/game-state/lose-heart')
}

export function completeLesson(lessonId, { mistakes }) {
  return api.post(`/lessons/${lessonId}/complete`, { mistakes })
}

/** Feeds the adaptive "practise your weak words" set. */
export function recordAttempt(exerciseId, { correct }) {
  return api.post(`/exercises/${exerciseId}/attempt`, { correct })
}
