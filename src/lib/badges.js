/**
 * The badge catalog, mirroring the web app's `src/lib/badges.js`, which in turn
 * mirrors the backend's `app/Support/Badges.php`.
 *
 * This is reference data only — ids, tiers, goals and rewards. Everything about
 * a particular learner (which badges they have earned, how far along they are)
 * comes from the game-state API.
 *
 * The `title` and `description` here are **not rendered anywhere**. They are a
 * readable fallback so this file can be understood on its own, and a safety net
 * if a badge id ever appears with no catalogue entry. What the learner sees
 * comes from `badgeTitle()` / `badgeDescription()` in `contentNames.js`, which
 * look the badge up by id against the shared `badge_*` keys the web already has
 * translated into all six languages.
 *
 * Artwork is required literally: Metro cannot resolve a path built from a
 * template string. The files are the web's `/public/<category>-badges` art
 * downscaled to 160px wide, the same treatment the characters get, which keeps
 * all fifteen under 700KB instead of ~2MB.
 */
const ART = {
  'streak-bronze': require('../../assets/badges/streak-bronze.png'),
  'streak-silver': require('../../assets/badges/streak-silver.png'),
  'streak-gold': require('../../assets/badges/streak-gold.png'),
  'streak-platinum': require('../../assets/badges/streak-platinum.png'),
  'streak-legendary': require('../../assets/badges/streak-legendary.png'),
  'xp-bronze': require('../../assets/badges/xp-bronze.png'),
  'xp-silver': require('../../assets/badges/xp-silver.png'),
  'xp-gold': require('../../assets/badges/xp-gold.png'),
  'xp-platinum': require('../../assets/badges/xp-platinum.png'),
  'xp-legendary': require('../../assets/badges/xp-legendary.png'),
  'lesson-bronze': require('../../assets/badges/lesson-bronze.png'),
  'lesson-silver': require('../../assets/badges/lesson-silver.png'),
  'lesson-gold': require('../../assets/badges/lesson-gold.png'),
  'lesson-platinum': require('../../assets/badges/lesson-platinum.png'),
  'lesson-legendary': require('../../assets/badges/lesson-legendary.png'),
}

/** Three five-tier ladders. `goal` matches the backend's requirement_value. */
export const BADGES = [
  { id: 'streak-3', category: 'streak', tier: 'BRONZE', goal: 3, title: 'On a Roll', description: '3-day streak' },
  { id: 'streak-7', category: 'streak', tier: 'SILVER', goal: 7, title: 'Committed', description: '7-day streak' },
  { id: 'streak-30', category: 'streak', tier: 'GOLD', goal: 30, title: 'Dedicated', description: '30-day streak' },
  { id: 'streak-100', category: 'streak', tier: 'PLATINUM', goal: 100, title: 'Unstoppable', description: '100-day streak' },
  { id: 'streak-365', category: 'streak', tier: 'LEGENDARY', goal: 365, title: 'Legendary', description: '365-day streak' },

  { id: 'xp-100', category: 'xp', tier: 'BRONZE', goal: 100, title: 'First Steps', description: 'Earn 100 XP' },
  { id: 'xp-1000', category: 'xp', tier: 'SILVER', goal: 1000, title: 'Scholar', description: 'Earn 1,000 total XP' },
  { id: 'xp-5000', category: 'xp', tier: 'GOLD', goal: 5000, title: 'Overachiever', description: 'Earn 5,000 total XP' },
  { id: 'xp-10000', category: 'xp', tier: 'PLATINUM', goal: 10000, title: 'Obsessed', description: 'Earn 10,000 total XP' },
  { id: 'xp-25000', category: 'xp', tier: 'LEGENDARY', goal: 25000, title: 'XP Legend', description: 'Earn 25,000 XP' },

  { id: 'lesson-1', category: 'lesson', tier: 'BRONZE', goal: 1, title: 'First Lesson', description: 'Complete 1 lesson' },
  { id: 'lesson-25', category: 'lesson', tier: 'SILVER', goal: 25, title: 'Getting the Hang of It', description: 'Complete 25 lessons' },
  { id: 'lesson-100', category: 'lesson', tier: 'GOLD', goal: 100, title: 'Lesson Master', description: 'Complete 100 lessons' },
  { id: 'lesson-250', category: 'lesson', tier: 'PLATINUM', goal: 250, title: 'Lesson Machine', description: 'Complete 250 lessons' },
  { id: 'lesson-500', category: 'lesson', tier: 'LEGENDARY', goal: 500, title: 'Lesson Legend', description: 'Complete 500 lessons' },
]

/** The game-state field each category's goal is measured against. */
export const BADGE_METRIC = {
  streak: 'streak',
  xp: 'totalXp',
  lesson: 'totalLessonsCompleted',
}

export const BADGE_CATEGORIES = [
  { key: 'streak', label: 'Streak' },
  { key: 'xp', label: 'XP' },
  { key: 'lesson', label: 'Lessons' },
]

export function badgeImage(badge) {
  return ART[`${badge.category}-${badge.tier.toLowerCase()}`] ?? null
}

const TIER_REWARDS = {
  BRONZE: { gems: 20, xp: 10, hearts: 1 },
  SILVER: { gems: 50, xp: 25, hearts: 1 },
  GOLD: { gems: 100, xp: 50, hearts: 2 },
  PLATINUM: { gems: 200, xp: 100, hearts: 3 },
  LEGENDARY: { gems: 500, xp: 250, hearts: 5 },
}

export function badgeReward(badgeId) {
  const badge = BADGES.find((entry) => entry.id === badgeId)
  return badge ? TIER_REWARDS[badge.tier] : { gems: 0, xp: 0, hearts: 0 }
}

/**
 * How far along the learner is towards one badge, capped at the goal so a
 * long-since-passed target does not render a bar past its own end.
 */
export function badgeProgress(badge, state) {
  const current = state?.[BADGE_METRIC[badge.category]] ?? 0
  return { current: Math.min(current, badge.goal), total: badge.goal }
}
