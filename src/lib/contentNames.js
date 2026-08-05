/**
 * Translating the names the API sends back.
 *
 * Chapter titles, quest wording, plan and pack names and heart-refill tiers all
 * arrive from the backend as English text an admin typed. There is no
 * translation table behind any of them, so the only way to show a French
 * learner "Au restaurant" is to translate on the key rather than on the words:
 * every one of these rows carries a stable identifier — `chapterKey`,
 * `requirementType`, the plan or pack `key` — and that is what these helpers
 * map.
 *
 * Every helper falls back to whatever the API said. An admin who adds a sixth
 * chapter, a new gem pack or a custom quest gets their own text through
 * untranslated, which is the right failure: the screen still reads, and the
 * only thing missing is a translation nobody has written yet.
 *
 * **Exercise and trivia content is deliberately not here.** Those are the thing
 * being learned or tested, not chrome around it, and mapping them would need a
 * per-language content table on the backend rather than a lookup on the client.
 */

/** `chapterKey` -> catalogue key. Mirrors the backend's ChapterKey enum. */
const CHAPTER_KEYS = {
  beginner: 'm_chapter_beginner',
  conversation: 'm_chapter_conversation',
  restaurant: 'm_chapter_restaurant',
  supermarket: 'm_chapter_supermarket',
  final_test: 'm_chapter_final_test',
}

/** `requirementType` -> title. Mirrors Quest::REQUIREMENT_TYPES. */
const QUEST_TITLE_KEYS = {
  lessons_completed: 'm_quest_title_lessons',
  xp_earned: 'm_quest_title_xp',
  perfect_lesson: 'm_quest_title_perfect',
  units_completed: 'm_quest_title_units',
}

/**
 * `requirementType` -> description, with a singular variant where "1 lessons"
 * would otherwise read badly. XP has no singular form worth having: nobody
 * earns exactly one.
 */
const QUEST_DESC_KEYS = {
  lessons_completed: ['m_quest_desc_lessons', 'm_quest_desc_lesson_1'],
  xp_earned: ['m_quest_desc_xp', null],
  perfect_lesson: ['m_quest_desc_perfect', 'm_quest_desc_perfect_1'],
  units_completed: ['m_quest_desc_units', 'm_quest_desc_unit_1'],
}

const PACK_KEYS = { basic: 'm_pack_basic', adventure: 'm_pack_adventure', vault: 'm_pack_vault' }

const PLAN_KEYS = { monthly: 'm_plan_monthly', yearly: 'm_plan_yearly', family: 'm_plan_family' }

const TIER_KEYS = { one: 'm_tier_one', three: 'm_tier_three', full: 'm_tier_full' }

const INTERVAL_KEYS = { month: 'm_interval_month', year: 'm_interval_year' }

/**
 * Free-text labels the admin panel ships with, matched loosely.
 *
 * Plan features and the ribbon on a gem pack are free text with no key of their
 * own, so these are matched on their normalised English wording. It only works
 * for the strings that ship by default — anything an admin writes themselves
 * falls through unchanged, which is the same bargain as everywhere else here.
 */
const PHRASES = {
  'most popular': 'm_badge_most_popular',
  'best value': 'm_badge_best_value',
  'no ads': 'm_feat_no_ads',
  'unlimited hearts': 'm_feat_unlimited_hearts',
  '+50% bonus gems': 'm_feat_bonus_gems',
  '1 streak freeze per month': 'm_feat_freeze_1',
  '3 streak freezes per month (per account)': 'm_feat_freeze_3',
  'shared across up to 5 accounts': 'm_feat_shared_5',
  'instant refill': 'm_tier_instant',
  '5 hearts': 'm_tier_five_hearts',
}

function normalise(value) {
  return String(value ?? '').trim().toLowerCase()
}

/** The chapter's name, translated where we know it. */
export function chapterTitle(t, chapter) {
  const key = CHAPTER_KEYS[chapter?.chapterKey]
  return key ? t(key) : (chapter?.title ?? '')
}

export function questTitle(t, quest) {
  const key = QUEST_TITLE_KEYS[quest?.requirementType]
  return key ? t(key) : (quest?.title ?? '')
}

export function questDescription(t, quest) {
  const pair = QUEST_DESC_KEYS[quest?.requirementType]
  if (!pair) return quest?.description ?? ''

  const [plural, singular] = pair
  const n = quest?.targetCount ?? 1

  return n === 1 && singular ? t(singular) : t(plural, { n })
}

export function gemPackTitle(t, pack) {
  const key = PACK_KEYS[pack?.key]
  return key ? t(key) : (pack?.title ?? '')
}

export function planTitle(t, plan) {
  const key = PLAN_KEYS[plan?.key]
  return key ? t(key) : (plan?.title ?? '')
}

export function heartTierTitle(t, tier) {
  const key = TIER_KEYS[tier?.key]
  return key ? t(key) : (tier?.title ?? '')
}

/** "month" / "year", for the `$8 /month` line under a price. */
export function planInterval(t, interval) {
  const key = INTERVAL_KEYS[normalise(interval)]
  return key ? t(key) : (interval ?? '')
}

/**
 * A free-text label — a plan feature, a ribbon, a tier subtitle — translated if
 * it is one of the defaults, and passed straight through if not.
 *
 * "100 Max Hearts" is handled separately from the rest because the number is
 * the admin's to change and has to survive into the translation.
 */
export function contentPhrase(t, value) {
  const text = String(value ?? '')
  if (!text) return text

  const hearts = /^(\d+)\s*max hearts$/i.exec(text.trim())
  if (hearts) return t('m_feat_max_hearts', { n: hearts[1] })

  const key = PHRASES[normalise(text)]
  return key ? t(key) : text
}

/**
 * Badge ladders, keyed on the badge id from `src/lib/badges.js`.
 *
 * These reuse the web's own `badge_*` keys rather than new mobile ones: both
 * products show the same fifteen badges, the web already has them translated
 * into all six languages, and a second set of keys for the same words is a
 * second set to keep in step.
 */
export function badgeTitle(t, badge) {
  if (!badge?.id) return ''
  return t(`badge_${String(badge.id).replace('-', '_')}_title`)
}

export function badgeDescription(t, badge) {
  if (!badge?.id) return ''
  return t(`badge_${String(badge.id).replace('-', '_')}_desc`)
}

/**
 * Trivia topics, keyed on the topic key the API sends (`science`, `math`,
 * `english`). Same reasoning as the badges: the web already carries these.
 *
 * The topic's *questions* are not here and cannot be — see the note at the top
 * of this file.
 */
export function triviaTopicTitle(t, topic) {
  if (!topic?.key) return topic?.title ?? ''
  const key = `trivia_topic_${topic.key}_title`
  const translated = t(key)
  // `translate` returns the key itself when it is unknown, which is how an
  // admin-added topic falls through to its own title.
  return translated === key ? (topic.title ?? '') : translated
}

export function triviaTopicDescription(t, topic) {
  if (!topic?.key) return topic?.description ?? ''
  const key = `trivia_topic_${topic.key}_desc`
  const translated = t(key)
  return translated === key ? (topic.description ?? '') : translated
}
