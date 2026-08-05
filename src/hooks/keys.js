/**
 * Every query key in the app, in one place.
 *
 * They were string literals typed out at each use site, and `['game-state']`
 * alone appeared fourteen times across eight screens. That is not just
 * repetition: a key is a contract between the screen that reads it and every
 * mutation that has to invalidate it, and a contract spelled out by hand in
 * fourteen places is one typo away from a screen that silently never refreshes.
 * The avatar staleness bug was exactly that shape.
 *
 * Keys are arrays with a stable prefix, so a broad invalidation catches the
 * narrow ones beneath it: invalidating `['lessons']` clears every
 * `['lessons', unitId]` under it, which is what a course switch wants.
 */
export const queryKeys = {
  me: ['auth', 'me'],

  gameState: ['game-state'],
  chapters: ['chapters'],
  activity: (year, month) => ['activity', year, month],

  languages: ['languages'],
  myCourses: ['courses', 'mine'],
  alphabet: ['alphabet'],

  units: (chapterId) => (chapterId == null ? ['units'] : ['units', String(chapterId)]),
  lessons: (unitId) => (unitId == null ? ['lessons'] : ['lessons', String(unitId)]),
  exercises: (lessonId) => ['exercises', String(lessonId)],

  questsToday: ['quests-today'],
  chestStatus: ['chest-status'],

  triviaTopics: ['trivia-topics'],
  triviaQuestions: (topicKey) => ['trivia-questions', String(topicKey)],

  shopCatalog: ['shop-catalog'],
  subscriptionStatus: ['subscription-status'],
  ads: ['ads'],

  avatar: ['avatar'],
  avatarOptions: ['avatar-options'],

  league: ['league'],
  family: ['family'],

  notificationPreferences: ['notification-preferences'],
}

/**
 * Everything that describes "what this learner has and has done": the wallet,
 * the hearts, the streak, the XP, the badges. Nearly every mutation in the app
 * moves at least one of these, and they are read on nearly every screen.
 */
export const PROGRESS_KEYS = [queryKeys.gameState, queryKeys.questsToday, queryKeys.chestStatus]

/**
 * Everything scoped to the active course. Switching, adding or removing one
 * invalidates all of it, because every one of these is about the old language.
 */
export const COURSE_KEYS = [
  queryKeys.myCourses,
  queryKeys.chapters,
  queryKeys.units(),
  queryKeys.lessons(),
  queryKeys.alphabet,
  queryKeys.gameState,
]

/** Invalidates a list of keys on one client, in parallel. */
export function invalidateAll(queryClient, keys) {
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
