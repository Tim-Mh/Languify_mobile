import { useCallback } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import { LinearGradient } from 'react-native-linear-gradient'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import BookOpen from 'lucide-react-native/icons/book-open'
import Check from 'lucide-react-native/icons/check'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Flame from 'lucide-react-native/icons/flame'
import Gem from 'lucide-react-native/icons/gem'
import Gift from 'lucide-react-native/icons/gift'
import Heart from 'lucide-react-native/icons/heart'
import InfinityIcon from 'lucide-react-native/icons/infinity'
import Lock from 'lucide-react-native/icons/lock'
import MessagesSquare from 'lucide-react-native/icons/messages-square'
import ShoppingCart from 'lucide-react-native/icons/shopping-cart'
import Target from 'lucide-react-native/icons/target'
import Trophy from 'lucide-react-native/icons/trophy'
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed'

import Button from '@/components/Button'
import FlagIcon from '@/components/FlagIcon'
import ProgressRing from '@/components/ProgressRing'
import QueryState from '@/components/QueryState'
import Skeleton, { ChapterSkeleton } from '@/components/Skeleton'
import StateView from '@/components/StateView'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useAuth } from '@/auth/AuthContext'
import { useChapters, useGameState } from '@/hooks/useGame'
import { useChestStatus, useTodaysQuests } from '@/hooks/useRewards'
import { characterAt, MASCOTS } from '@/lib/characters'
import { chapterTitle, questTitle } from '@/lib/contentNames'
import { useTranslate } from '@/lib/i18n'
import { useRefresh } from '@/lib/useRefresh'
import { useLayout } from '@/lib/responsive'
import { sounds } from '@/lib/sounds'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/** Cards arrive one after another rather than all at once. */
const STAGGER_MS = 70

/** How far the hero card rides up over the header slab. */
const HERO_OVERLAP = 30

/**
 * Same Lucide icons the web dashboard uses for each section, keyed by the
 * backend's chapter_key.
 */
const CHAPTER_ICONS = {
  beginner: BookOpen,
  conversation: MessagesSquare,
  restaurant: UtensilsCrossed,
  supermarket: ShoppingCart,
  final_test: Trophy,
}

/** Which greeting to show. The wording itself comes from the catalogue. */
function greetingKey() {
  const hour = new Date().getHours()
  if (hour < 12) return 'm_greeting_morning'
  if (hour < 18) return 'm_greeting_afternoon'
  return 'm_greeting_evening'
}

/** "12m" / "1h 30m" — how long until the next heart comes back. */
function shortDuration(seconds) {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/**
 * One figure on the header slab. Values sit on the plum rather than in white
 * pills, so the slab reads as a single band of status instead of three more
 * cards competing with the one below it.
 */
function HeaderStat({ icon, value, caption, label, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
    >
      <View style={styles.statTop}>
        {icon}
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statCaption} numberOfLines={1}>
        {caption}
      </Text>
    </Pressable>
  )
}

/**
 * Holds the hero's exact footprint while the chapters load. Without it the
 * whole screen jumps down the moment they land, and the hero is the tallest
 * thing on it.
 */
function HeroSkeleton({ size }) {
  return (
    <View style={styles.hero}>
      <Skeleton width={120} height={11} radius={6} />
      <View style={[styles.heroMain, { marginTop: spacing.sm }]}>
        <Skeleton width={size(98)} height={size(98)} radius={radii.pill} />
        <View style={styles.heroCopy}>
          <Skeleton width="72%" height={22} radius={8} />
          <Skeleton width="52%" height={13} radius={6} style={{ marginTop: 8 }} />
          <Skeleton width={92} height={22} radius={radii.pill} style={{ marginTop: 7 }} />
        </View>
      </View>
      <Skeleton height={60} radius={radii.lg} style={styles.heroAction} />
    </View>
  )
}

export default function Home() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuth()
  const t = useTranslate()
  const { contentWidth, size, isCompact } = useLayout()
  // Pulled down over the plum header slab, where only a white spinner reads.
  const refreshControl = useRefresh({ onDark: true })

  const stateQuery = useGameState()
  const chaptersQuery = useChapters({ enabled: Boolean(user?.learningLanguage) })
  // Both are summarised here and claimed on the Rewards screen, so this screen
  // never needs their mutations.
  const questsQuery = useTodaysQuests()
  const chestQuery = useChestStatus()

  const state = stateQuery.data
  const chapters = chaptersQuery.data ?? []
  const quests = questsQuery.data ?? []
  const chestReady = chestQuery.data?.daily?.available === true

  // The first chapter that is not finished is the one to continue; everything
  // after it is still locked.
  const currentIndex = (() => {
    const index = chapters.findIndex((chapter) => !chapter.completed)
    return index === -1 ? chapters.length : index
  })()

  const current = chapters[currentIndex]
  const firstName = user?.fullName?.trim().split(/\s+/)[0]
  const questsDone = quests.filter((quest) => quest.completed).length
  const heartsRegen = shortDuration(state?.heartsRegenSecondsRemaining)

  const openChapter = useCallback(
    (chapter) => {
      sounds.click()

      router.push({
        pathname: '/chapter/[id]',
        params: { id: String(chapter.id), title: chapter.title },
      })
    },
    [router],
  )

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      refreshControl={refreshControl}
    >
      {/* The slab bleeds to all three edges, so the status band is part of the
          chrome rather than another card floating on the background. */}
      <LinearGradient
        colors={[colors.secondary[700], colors.secondary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <Animated.View
          entering={FadeIn.duration(240)}
          style={[styles.headerInner, { width: contentWidth }]}
        >
          <View style={styles.topBar}>
            <View style={styles.greetingText}>
              <Text style={styles.greeting}>{t(greetingKey())}</Text>
              <Text style={[styles.name, { fontSize: size(25) }]} numberOfLines={1}>
                {firstName ?? 'there'}
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <HeaderStat
              icon={<Flame size={16} color={colors.warning[400]} strokeWidth={2.4} />}
              value={state?.streak ?? '–'}
              caption={t('m_stat_day_streak')}
              label={`${state?.streak ?? 0} day streak, see your streak`}
              onPress={() => router.push('/streak')}
            />
            <View style={styles.statDivider} />
            <HeaderStat
              icon={<Gem size={16} color={colors.accent[300]} strokeWidth={2.4} />}
              value={state?.gems ?? '–'}
              caption={t('m_stat_gems')}
              label={`${state?.gems ?? 0} gems, open the shop`}
              onPress={() => router.push('/shop')}
            />
            <View style={styles.statDivider} />
            <HeaderStat
              icon={
                state?.infiniteHeartsActive ? (
                  <InfinityIcon size={16} color={colors.danger[300]} strokeWidth={2.4} />
                ) : (
                  <Heart size={16} color={colors.danger[300]} strokeWidth={2.4} />
                )
              }
              value={
                state?.infiniteHeartsActive
                  ? '∞'
                  : `${state?.hearts ?? '–'}/${state?.maxHearts ?? '–'}`
              }
              // The regeneration clock is the one heart fact worth surfacing,
              // and it is invisible everywhere else in the app.
              caption={
                state?.infiniteHeartsActive
                  ? t('m_stat_unlimited')
                  : heartsRegen
                    ? t('m_stat_heart_in', { time: heartsRegen })
                    : t('m_stat_hearts')
              }
              label="Hearts, refill and see the timer"
              onPress={() => router.push('/hearts')}
            />
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={[styles.body, { width: contentWidth }]}>
        {/* The one thing the screen is for. Everything else is a footnote. */}
        {chaptersQuery.isPending && user?.learningLanguage ? (
          <HeroSkeleton size={size} />
        ) : current ? (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.hero}>
            <View style={styles.heroEyebrow}>
              {user?.learningLanguage ? (
                <>
                  <FlagIcon
                    code={user.learningLanguage.code}
                    emoji={user.learningLanguage.flagEmoji}
                    width={18}
                  />
                  <Text style={styles.heroEyebrowText}>
                    {user.learningLanguage.name.toUpperCase()}
                  </Text>
                </>
              ) : null}
              <Text style={styles.heroEyebrowDim}>
                {t('m_home_section_of', { n: currentIndex + 1, total: chapters.length })}
              </Text>
            </View>

            <View style={styles.heroMain}>
              {/* The signature: your progress drawn as a ring around the
                  course mascot, so the number you care about and the app's
                  own character are the same object. */}
              <ProgressRing percent={current.progressPercent ?? 0} size={size(98)}>
                {/* Mascots only, and sized to the ring's inner circle. The
                    artwork has no transparent padding, so `contain` centres
                    it exactly and no manual nudge is needed.

                    The fixed round frame is not decoration: it pins the art
                    to the middle of the ring. Left to size itself the image
                    ended up stacked below the ring and sliced in half by the
                    Keep going button. */}
                <View
                  style={[
                    styles.heroMascot,
                    { width: size(76), height: size(76), borderRadius: size(38) },
                  ]}
                >
                  <Image
                    source={characterAt(currentIndex, MASCOTS)}
                    style={styles.heroMascotArt}
                    resizeMode="contain"
                  />
                </View>
              </ProgressRing>

              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { fontSize: size(23) }]} numberOfLines={2}>
                  {chapterTitle(t, current)}
                </Text>
                <Text style={styles.heroMeta}>
                  {t('m_home_progress', {
                    percent: current.progressPercent ?? 0,
                    units: current.unitsCount,
                  })}
                </Text>
                {state?.todayXp > 0 ? (
                  <View style={styles.todayChip}>
                    <Text style={styles.todayChipText}>{t('m_home_xp_today', { xp: state.todayXp })}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Button
              label={
                (current.progressPercent ?? 0) > 0
                  ? t('m_home_keep_going')
                  : t('m_home_start_learning')
              }
              onPress={() => openChapter(current)}
              style={styles.heroAction}
            />
          </Animated.View>
        ) : null}

        {/* Summary only: quests and the chest are claimed on Rewards, and one
            claim button in two places is how people end up tapping the wrong
            one. */}
        <Animated.View entering={FadeInDown.delay(STAGGER_MS).duration(320)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Daily goal"
            onPress={() => router.push('/rewards')}
            style={({ pressed }) => [styles.goalCard, pressed && styles.pressed]}
          >
            <View style={styles.goalHead}>
              <Target size={16} color={colors.primary[600]} strokeWidth={2.4} />
              <Text style={styles.goalTitle}>{t('m_home_daily_goal')}</Text>
              <Text style={styles.goalCount}>
                {quests.length
                  ? t('m_home_quests_done', { done: questsDone, total: quests.length })
                  : t('m_home_no_quests')}
              </Text>
              <ChevronRight size={17} color={colors.secondary[300]} strokeWidth={2.2} />
            </View>

            {/* Named, stacked rows rather than three anonymous bars: a bar on
                its own tells you how far along you are without ever saying
                what you are meant to be doing. */}
            {quests.map((quest) => {
              const ratio = quest.targetCount
                ? Math.min(1, (quest.progress ?? 0) / quest.targetCount)
                : 0

              return (
                <View key={quest.id} style={styles.quest}>
                  <View style={styles.questHead}>
                    <Text style={styles.questTitle} numberOfLines={1}>
                      {questTitle(t, quest)}
                    </Text>

                    {/* Says which of the three states a quest is in. A bare
                        tick could not tell "done, reward waiting" apart from
                        "done and already collected", which is the difference
                        between needing to tap through to Rewards and not. */}
                    {quest.claimed ? (
                      <View style={styles.questStatus}>
                        <Check size={11} color={colors.success[600]} strokeWidth={3.2} />
                        <Text style={styles.questCollected}>{t('m_quest_collected')}</Text>
                      </View>
                    ) : quest.completed ? (
                      <View style={[styles.questStatus, styles.questStatusReady]}>
                        <Text style={styles.questReady}>{t('m_quest_collect')}</Text>
                      </View>
                    ) : (
                      <Text style={styles.questCount}>
                        {quest.progress ?? 0}/{quest.targetCount}
                      </Text>
                    )}
                  </View>

                  <View style={styles.goalBar}>
                    <View
                      style={[
                        styles.goalBarFill,
                        { width: `${Math.max(2, ratio * 100)}%` },
                        quest.completed && styles.goalBarDone,
                      ]}
                    />
                  </View>
                </View>
              )
            })}

            {chestReady ? (
              <View style={styles.chestNudge}>
                <Gift size={14} color={colors.accent[600]} strokeWidth={2.4} />
                <Text style={styles.chestNudgeText}>{t('m_home_chest_waiting')}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>

        {/* Ahead of the path, not after it: the alphabet is what you want
            before your first lesson, and nobody scrolls past five sections to
            find it. */}
        <Animated.View entering={FadeInDown.delay(STAGGER_MS * 2).duration(320)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Learn the alphabet"
            onPress={() => router.push('/alphabet')}
            style={({ pressed }) => [styles.alphabetRow, pressed && styles.pressed]}
          >
            <View style={styles.alphabetBadge}>
              <Text style={styles.alphabetBadgeText}>Aa</Text>
            </View>
            <View style={styles.alphabetCopy}>
              <Text style={styles.alphabetTitle} numberOfLines={1}>
                {t('m_home_alphabet')}
              </Text>
              <Text style={styles.alphabetSub} numberOfLines={isCompact ? 2 : 1}>
                {t('m_home_alphabet_sub')}
              </Text>
            </View>
            <ChevronRight size={17} color={colors.secondary[300]} strokeWidth={2.2} />
          </Pressable>
        </Animated.View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionHeading}>{t('m_home_your_path')}</Text>
          {chapters.length ? (
            <Text style={styles.sectionMeta}>
              {t('m_home_complete_count', {
                done: chapters.filter((chapter) => chapter.completed).length,
                total: chapters.length,
              })}
            </Text>
          ) : null}
        </View>

        {!user?.learningLanguage ? (
          <StateView
            icon="empty"
            title={t('m_home_no_course')}
            body={t('m_home_no_course_body')}
            inline
          />
        ) : (
          <QueryState
            query={chaptersQuery}
            // Same shape and size as the real rows, so nothing shifts when the
            // data lands.
            skeleton={<ChapterSkeleton />}
            errorTitle={t('m_home_chapters_error')}
            isEmpty={(data) => (data?.length ?? 0) === 0}
            emptyTitle={t('m_home_no_chapters')}
            emptyBody={t('m_home_no_chapters_body')}
            inline
          >
            {(list) => (
              <View style={styles.rail}>
                {list.map((chapter, index) => {
                  const isCurrent = index === currentIndex
                  const isLocked = !user?.isTester && index > currentIndex
                  const Icon = CHAPTER_ICONS[chapter.chapterKey] ?? BookOpen
                  const isLast = index === list.length - 1

                  return (
                    <Animated.View
                      key={chapter.id}
                      entering={FadeInDown.delay(STAGGER_MS * (index + 2)).duration(320)}
                      style={styles.railRow}
                    >
                      {/* One continuous line through every section: four of
                          the five are always locked, and giving each of those
                          a full card spends the best space on the screen on
                          things nobody can tap. */}
                      <View style={styles.railGutter}>
                        <View
                          style={[
                            styles.railNode,
                            chapter.completed && styles.railNodeDone,
                            isCurrent && styles.railNodeCurrent,
                          ]}
                        >
                          {chapter.completed ? (
                            <Check size={14} color={colors.white} strokeWidth={3} />
                          ) : isLocked ? (
                            <Lock size={13} color={colors.secondary[300]} strokeWidth={2.4} />
                          ) : (
                            <Icon size={14} color={colors.white} strokeWidth={2.3} />
                          )}
                        </View>
                        {!isLast ? <View style={styles.railLine} /> : null}
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={chapterTitle(t, chapter)}
                        accessibilityState={{ disabled: isLocked }}
                        disabled={isLocked}
                        onPress={() => openChapter(chapter)}
                        style={({ pressed }) => [
                          styles.railCard,
                          isCurrent && styles.railCardCurrent,
                          isLocked && styles.railCardLocked,
                          pressed && !isLocked && styles.pressed,
                        ]}
                      >
                        <View style={styles.railCopy}>
                          <Text style={styles.railTitle} numberOfLines={1}>
                            {chapterTitle(t, chapter)}
                          </Text>
                          <Text
                            style={[
                              styles.railMeta,
                              isCurrent && { color: colors.primary[600] },
                              chapter.completed && { color: colors.success[600] },
                            ]}
                          >
                            {/* No progress bar here on purpose: the hero ring
                                above already carries this number, and the
                                rail's job is where you are, not how far. */}
                            {isCurrent
                              ? t('m_chapter_in_progress', { units: chapter.unitsCount })
                              : chapter.completed
                                ? t('m_chapter_complete')
                                : isLocked
                                  ? t('m_chapter_locked')
                                  : t('m_chapter_units', { units: chapter.unitsCount })}
                          </Text>
                        </View>

                        {!isLocked ? (
                          <ChevronRight
                            size={17}
                            color={colors.secondary[300]}
                            strokeWidth={2.2}
                          />
                        ) : null}
                      </Pressable>
                    </Animated.View>
                  )
                })}
              </View>
            )}
          </QueryState>
        )}

      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.secondary[50],
  },
  scroll: {
    // The bar sits below the scene, but its raised centre button overhangs into
    // it, so the last card needs room to be scrolled clear of the circle.
    paddingBottom: spacing.xxl + TAB_BAR_OVERHANG,
  },
  header: {
    paddingBottom: spacing.lg + HERO_OVERLAP,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
  },
  headerInner: {
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    flex: 1,
  },
  greeting: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.secondary[200],
  },
  name: {
    fontFamily: fonts.display,
    color: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
  },
  statCaption: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    color: colors.secondary[200],
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  body: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: -HERO_OVERLAP,
  },
  hero: {
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: spacing.md,
    ...shadows.lifted,
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEyebrowText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.9,
    color: colors.secondary[600],
  },
  heroEyebrowDim: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.9,
    color: colors.secondary[300],
    marginLeft: 'auto',
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
    lineHeight: 28,
  },
  heroMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: colors.secondary[400],
    marginTop: 3,
  },
  todayChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning[50],
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 7,
  },
  todayChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.warning[700],
  },
  heroMascot: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMascotArt: {
    width: '100%',
    height: '100%',
  },
  heroAction: {
    marginTop: spacing.md,
  },
  goalCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  goalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  goalTitle: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.secondary[900],
  },
  goalCount: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.secondary[400],
    marginLeft: 'auto',
  },
  quest: {
    marginTop: spacing.sm,
  },
  questHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 5,
  },
  questTitle: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.secondary[700],
  },
  questCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.secondary[400],
  },
  questStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.success[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  questStatusReady: {
    backgroundColor: colors.primary[50],
  },
  questCollected: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: colors.success[700],
  },
  questReady: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: colors.primary[700],
  },
  goalBar: {
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
  },
  goalBarDone: {
    backgroundColor: colors.success[500],
  },
  chestNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent[50],
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginTop: spacing.sm,
  },
  chestNudgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.accent[700],
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.secondary[900],
  },
  sectionMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.secondary[400],
  },
  rail: {
    // The connector runs behind the nodes, so nothing may clip it.
    overflow: 'visible',
  },
  railRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  railGutter: {
    alignItems: 'center',
    width: 30,
  },
  railNode: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  railNodeDone: {
    backgroundColor: colors.success[500],
  },
  railNodeCurrent: {
    backgroundColor: colors.primary[500],
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.secondary[200],
    marginVertical: 3,
  },
  railCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  railCardCurrent: {
    borderWidth: 2,
    borderColor: colors.primary[200],
  },
  railCardLocked: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.secondary[100],
  },
  railCopy: {
    flex: 1,
  },
  railTitle: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.secondary[900],
  },
  railMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    color: colors.secondary[400],
    marginTop: 1,
  },
  alphabetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.secondary[200],
    padding: spacing.md,
    marginTop: spacing.md,
  },
  alphabetBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetBadgeText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[500],
  },
  alphabetCopy: {
    flex: 1,
  },
  alphabetTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: colors.secondary[600],
  },
  alphabetSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondary[400],
    marginTop: 1,
  },
})
